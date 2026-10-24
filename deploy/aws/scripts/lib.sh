# shellcheck shell=bash
# =============================================================================
# scripts/lib.sh — helpers shared by the CloudShell scripts (sourced, not run).
# =============================================================================
set -Eeuo pipefail

AWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # …/deploy/aws
REPO_ROOT="$(cd "$AWS_DIR/../.." && pwd)"
# shellcheck source=../config.sh
. "$AWS_DIR/config.sh"
export AWS_DEFAULT_REGION="$AWS_REGION" AWS_PAGER=""

SECRETS="$TBHF_HOME/secrets.env"
SANDBOX_ENV="$TBHF_HOME/sandbox.env"
STACK_ENV="$TBHF_HOME/stack.env"

if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=; G=; Y=; R=; N=; fi
step() { echo; echo "${B}==> $*${N}"; }
ok()   { echo "  ${G}✔${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo "  ${R}✘ $*${N}" >&2; exit 1; }
trap 'echo "${R}✘ stopped: command failed at ${BASH_SOURCE[0]##*/} line $LINENO${N}" >&2' ERR

need_file() { [ -f "$1" ] || die "$1 is missing — $2"; }

load_secrets() {
  need_file "$SECRETS" "run ./scripts/01-setup-once.sh first"
  # shellcheck source=/dev/null
  . "$SECRETS"
}
load_sandbox() {
  need_file "$SANDBOX_ENV" "run ./scripts/00-check-sandbox.sh first (every session)"
  # shellcheck source=/dev/null
  . "$SANDBOX_ENV"
}

stack_status() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NONE"
}

# Save the stack outputs as KEY=value lines in ~/tbhf/stack.env and load them.
load_outputs() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output text \
    | awk -F'\t' '{print $1"=\""$2"\""}' > "$STACK_ENV"
  # shellcheck source=/dev/null
  . "$STACK_ENV"
  [ -n "${AppBucket:-}" ] || die "stack $STACK has no outputs yet"
}

stack_param() {  # stack_param <ParameterKey>
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Parameters[?ParameterKey=='$1'].ParameterValue | [0]" --output text
}

# Newest Amazon Linux 2023 x86_64 image (SSM public parameter, else an image search).
latest_ami() {
  local ami
  ami=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
        --query Parameter.Value --output text 2>/dev/null || true)
  if [[ "$ami" != ami-* ]]; then
    ami=$(aws ec2 describe-images --owners amazon \
          --filters 'Name=name,Values=al2023-ami-2023.*-kernel-*-x86_64' 'Name=state,Values=available' \
          --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)
  fi
  [[ "$ami" == ami-* ]] || die "could not find an Amazon Linux 2023 image"
  echo "$ami"
}

# Version of the code = git commit (plus a timestamp if there are uncommitted changes).
code_version() {
  if git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    local v; v=$(git -C "$REPO_ROOT" rev-parse --short=10 HEAD)
    if [ -n "$(git -C "$REPO_ROOT" status --porcelain -- tbhf-platform deploy)" ]; then
      v="$v-dirty$(date -u +%m%d%H%M)"
    fi
    echo "$v"
  else  # copied in as a zip: hash the files instead
    (cd "$REPO_ROOT" && find tbhf-platform deploy -type f -not -path '*/node_modules/*' -not -path '*/.next/*' -print0 \
      | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-10)
  fi
}

# Pack the source the ops instance builds from (tracked files only when in git).
pack_source() {  # pack_source <out.tar.gz>
  if git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1 && \
     [ -z "$(git -C "$REPO_ROOT" status --porcelain -- tbhf-platform deploy)" ]; then
    git -C "$REPO_ROOT" archive --format=tar.gz -o "$1" HEAD tbhf-platform deploy
  else
    tar -czf "$1" -C "$REPO_ROOT" --exclude=node_modules --exclude=.next --exclude=.env.local tbhf-platform deploy
  fi
}

running_instance_count() {
  aws ec2 describe-instances --filters Name=instance-state-name,Values=pending,running \
    --query 'length(Reservations[].Instances[])' --output text
}

# -----------------------------------------------------------------------------
# ops_run <MODE> <APP_VERSION>
# Starts a temporary EC2 instance in the VPC (it can reach RDS, CloudShell
# cannot), which runs ops/ops.sh, writes its progress to S3 and terminates
# itself. We follow the progress here. Returns 0 on DONE, 1 on FAILED.
# -----------------------------------------------------------------------------
OPS_RUN_ID=""
ops_run() {
  local mode="$1" version="$2" timeout_min="${3:-45}"
  OPS_RUN_ID="$(date -u +%Y%m%d-%H%M%S)-${mode//,/-}"
  local s3="s3://$AppBucket/ops/$OPS_RUN_ID" ud iid shown=0 all line state
  ud=$(mktemp)
  cat > "$ud" <<EOF
#!/bin/bash
exec > >(tee -a /var/log/tbhf-ops.log) 2>&1
aws s3 cp s3://$AppBucket/deploy/ops.sh /opt/ops.sh --region $AWS_REGION || shutdown -h now
APP_BUCKET=$AppBucket RUN_ID=$OPS_RUN_ID MODE=$mode APP_VERSION=$version AWS_REGION=$AWS_REGION bash /opt/ops.sh
EOF
  iid=$(aws ec2 run-instances \
    --image-id "$(latest_ami)" --instance-type "$OPS_INSTANCE_TYPE" \
    --subnet-id "$PublicSubnetA" --security-group-ids "$OpsSecurityGroup" \
    --iam-instance-profile "Name=$INSTANCE_PROFILE" \
    --instance-initiated-shutdown-behavior terminate \
    --metadata-options HttpTokens=required,HttpEndpoint=enabled \
    --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp2,Encrypted=true,DeleteOnTermination=true}' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$STACK-ops-${mode//,/-}},{Key=Project,Value=$STACK}]" \
    --user-data "file://$ud" --query 'Instances[0].InstanceId' --output text)
  rm -f "$ud"
  ok "ops instance $iid started (job $OPS_RUN_ID) — progress below"
  local deadline=$(( $(date +%s) + timeout_min * 60 ))
  while :; do
    sleep 15
    all=$(aws s3 cp "$s3/status" - 2>/dev/null || true)
    if [ -n "$all" ]; then
      tail -n +"$((shown + 1))" <<<"$all" | sed 's/^/    /'
      shown=$(wc -l <<<"$all")
    fi
    line=$(tail -n 1 <<<"$all")
    case "$line" in
      *" DONE"*)   return 0 ;;
      *" FAILED"*) break ;;
    esac
    state=$(aws ec2 describe-instances --instance-ids "$iid" \
            --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo unknown)
    if [[ "$state" == terminated || "$state" == shutting-down ]]; then
      sleep 20; all=$(aws s3 cp "$s3/status" - 2>/dev/null || true)
      tail -n +"$((shown + 1))" <<<"$all" | sed 's/^/    /'
      [[ "$(tail -n 1 <<<"$all")" == *" DONE"* ]] && return 0
      warn "the ops instance stopped before finishing"; break
    fi
    if [ "$(date +%s)" -gt "$deadline" ]; then
      warn "no result after $timeout_min minutes — terminating $iid"
      aws ec2 terminate-instances --instance-ids "$iid" >/dev/null || true
      break
    fi
  done
  sleep 10
  echo "  ---- last lines of the ops log ($s3/ops.log) ----"
  aws s3 cp "$s3/ops.log" - 2>/dev/null | tail -n 40 | sed 's/^/  | /' || echo "  (log not uploaded yet)"
  return 1
}

# Count healthy targets behind the load balancer.
healthy_count() {
  aws elbv2 describe-target-health --target-group-arn "$WebTargetGroupArn" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" --output text
}

wait_healthy() {  # wait_healthy <count> [minutes]
  local want="$1" mins="${2:-15}" n
  local deadline=$(( $(date +%s) + mins * 60 ))
  while :; do
    n=$(healthy_count)
    echo "    healthy web servers: $n / $want"
    [ "$n" -ge "$want" ] && return 0
    if [ "$(date +%s)" -gt "$deadline" ]; then
      warn "web servers not healthy after $mins minutes."
      warn "boot logs: aws s3 ls s3://$AppBucket/logs/web/ --recursive"
      return 1
    fi
    sleep 20
  done
}

# Replace the web servers one at a time so they pick up a new launch-template
# version (the sandbox blocks Auto Scaling "instance refresh").
roll_instances() {
  local want ids id
  want=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$AsgName" \
         --query 'AutoScalingGroups[0].DesiredCapacity' --output text)
  ids=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$AsgName" \
        --query 'AutoScalingGroups[0].Instances[].InstanceId' --output text)
  for id in $ids; do
    step "replacing web server $id"
    aws autoscaling terminate-instance-in-auto-scaling-group --instance-id "$id" \
      --no-should-decrement-desired-capacity >/dev/null
    # wait until it has left the target group, then until we are back to full strength
    for _ in $(seq 1 30); do
      aws elbv2 describe-target-health --target-group-arn "$WebTargetGroupArn" \
        --query "TargetHealthDescriptions[?Target.Id=='$id'] | length(@)" --output text | grep -qx 0 && break
      sleep 10
    done
    wait_healthy "$want" 15
  done
}
