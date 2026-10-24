# shellcheck shell=bash
# =============================================================================
# scripts/lib.sh — helpers shared by the scripts (sourced, not run).
# =============================================================================
set -Eeuo pipefail

HERE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # …/deploy/aws-account
REPO_ROOT="$(cd "$HERE_DIR/../.." && pwd)"
# shellcheck source=../config.sh
. "$HERE_DIR/config.sh"
export AWS_DEFAULT_REGION="$AWS_REGION" AWS_PAGER=""
FOUNDATION="$PROJECT-foundation"
RUNTIME="$PROJECT-runtime"
mkdir -p "$WORK_DIR" && chmod 700 "$WORK_DIR"

if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=; G=; Y=; R=; N=; fi
step() { echo; echo "${B}==> $*${N}"; }
ok()   { echo "  ${G}✔${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo "  ${R}✘ $*${N}" >&2; exit 1; }
trap 'echo "${R}✘ stopped: command failed at ${BASH_SOURCE[0]##*/} line $LINENO${N}" >&2' ERR

stack_status() {  # stack_status <name>
  aws cloudformation describe-stacks --stack-name "$1" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NONE
}
# Print a stack output value: out <stack> <OutputKey>
out() {
  aws cloudformation describe-stacks --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue | [0]" --output text
}
param() {  # param <stack> <ParameterKey>
  aws cloudformation describe-stacks --stack-name "$1" \
    --query "Stacks[0].Parameters[?ParameterKey=='$2'].ParameterValue | [0]" --output text
}
need_foundation() {
  [[ "$(stack_status "$FOUNDATION")" == *_COMPLETE && "$(stack_status "$FOUNDATION")" != DELETE_COMPLETE ]] \
    || die "the foundation stack is missing — run ./scripts/setup.sh first"
}

# Deploy a template; on failure print the resources that failed and why.
cfn_deploy() {  # cfn_deploy <stack> <template> <Key=Value>...
  local stack="$1" tpl="$2"; shift 2
  if ! aws cloudformation deploy --stack-name "$stack" --template-file "$tpl" \
        --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
        --tags "Project=$PROJECT" --parameter-overrides "$@"; then
    echo "  ---- what failed ----"
    aws cloudformation describe-stack-events --stack-name "$stack" --max-items 60 \
      --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatusReason]" \
      --output text | head -n 12 | sed 's/^/  | /'
    die "CloudFormation could not finish $stack (see above)"
  fi
}

# Newest manual snapshot of the website database ("" if none).
latest_snapshot() {
  aws rds describe-db-snapshots --db-instance-identifier "$PROJECT-db" --snapshot-type manual \
    --query 'sort_by(DBSnapshots[?Status==`available`], &SnapshotCreateTime)[-1].DBSnapshotIdentifier' \
    --output text 2>/dev/null | sed 's/^None$//'
}

secret_value() {  # secret_value <name-suffix>
  aws secretsmanager get-secret-value --secret-id "$PROJECT/$1" --query SecretString --output text
}

# Run a one-off ops task (dbinit / check / reset) and print its log. Returns its exit code.
run_ops() {  # run_ops <mode> [KEY=VALUE env overrides…]
  local mode="$1"; shift
  local cluster subnets sg taskdef overrides env_json="" kv arn id code stream
  cluster=$(out "$RUNTIME" ClusterName); subnets=$(out "$RUNTIME" AppSubnets)
  sg=$(out "$RUNTIME" OpsSecurityGroup); taskdef=$(out "$RUNTIME" OpsTaskDefinition)
  for kv in "$@"; do env_json="$env_json{\"name\":\"${kv%%=*}\",\"value\":\"${kv#*=}\"},"; done
  overrides="{\"containerOverrides\":[{\"name\":\"ops\",\"command\":[\"$mode\"],\"environment\":[${env_json%,}]}]}"
  arn=$(aws ecs run-task --cluster "$cluster" --task-definition "$taskdef" --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$sg],assignPublicIp=DISABLED}" \
        --overrides "$overrides" --query 'tasks[0].taskArn' --output text)
  id="${arn##*/}"
  ok "ops task $id started ($mode) — this takes 1–5 minutes"
  aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$arn" || aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$arn"
  code=$(aws ecs describe-tasks --cluster "$cluster" --tasks "$arn" --query 'tasks[0].containers[0].exitCode' --output text)
  stream="ops/ops/$id"
  echo "  ---- ops log (/$PROJECT/ops, $stream) ----"
  aws logs get-log-events --log-group-name "/$PROJECT/ops" --log-stream-name "$stream" \
    --query 'events[].message' --output text 2>/dev/null | tr '\t' '\n' | tail -n 40 | sed 's/^/  | /' || true
  if [ "$code" != "0" ]; then
    aws ecs describe-tasks --cluster "$cluster" --tasks "$arn" --query 'tasks[0].stoppedReason' --output text | sed 's/^/  stopped: /'
    return 1
  fi
  return 0
}
