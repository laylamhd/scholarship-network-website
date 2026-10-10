#!/usr/bin/env bash
# =============================================================================
# 00-check-sandbox.sh — run at the START OF EVERY SANDBOX SESSION.
# Checks that CloudShell is ready and records sandbox-specific values in
# ~/tbhf/sandbox.env (instance profile, CloudFront prefix list).
# Changes nothing in your AWS account.
# =============================================================================
. "$(dirname "$0")/lib.sh"
mkdir -p "$TBHF_HOME" && chmod 700 "$TBHF_HOME"

step "Identity and region"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text) || die "AWS credentials not available — open CloudShell from the sandbox console"
ok "account $ACCOUNT"
[ "$(aws configure get region 2>/dev/null || echo "$AWS_REGION")" = "us-east-1" ] || warn "CloudShell region is not us-east-1 — the scripts force us-east-1 anyway"
ok "region $AWS_REGION"

step "Tools"
for t in aws git jq python3 curl tar; do command -v "$t" >/dev/null && ok "$t" || die "$t not found"; done

step "Instance profile for EC2 (gives the servers access to S3)"
PROFILE=""
for p in LabInstanceProfile EMR_EC2_DefaultRole; do
  if aws iam get-instance-profile --instance-profile-name "$p" >/dev/null 2>&1; then PROFILE="$p"; break; fi
done
[ -n "$PROFILE" ] || die "neither LabInstanceProfile nor EMR_EC2_DefaultRole exists — check the sandbox"
ok "using $PROFILE"

step "CloudFront origin-facing prefix list (lets only CloudFront reach the load balancer)"
PL=$(aws ec2 describe-managed-prefix-lists \
      --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
      --query 'PrefixLists[0].PrefixListId' --output text)
[[ "$PL" == pl-* ]] || die "prefix list not found"
ok "$PL"

step "Amazon Linux 2023 image"
AMI=$(latest_ami); ok "$AMI"

step "Capacity"
RUNNING=$(running_instance_count)
ok "$RUNNING EC2 instance(s) running now (sandbox maximum 9; this project uses 2–3 web + 1 temporary)"
[ "$RUNNING" -le 5 ] || warn "many instances running — stop ones you do not need"

step "Persistent files in $TBHF_HOME"
[ -f "$SECRETS" ] && ok "secrets.env" || warn "no secrets yet — run ./scripts/01-setup-once.sh (one time only)"
for f in schema.sql data.sql; do
  [ -f "$TBHF_HOME/import/$f" ] && ok "import/$f" || warn "import/$f missing — see lab step 3"
done
LATEST=$(readlink "$TBHF_HOME/backups/latest" 2>/dev/null || true)
[ -n "$LATEST" ] && ok "latest backup: $(basename "$LATEST") (will be restored)" || ok "no backups yet (the original export will be imported)"
ls "$TBHF_HOME"/artifacts/app-*.tar.gz >/dev/null 2>&1 && ok "cached app build(s): $(cd "$TBHF_HOME/artifacts" && ls app-*.tar.gz | tr '\n' ' ')"
echo "  CloudShell home usage: $(du -sh "$HOME" 2>/dev/null | cut -f1) of ~1 GB"

step "Existing stack"
echo "  $STACK: $(stack_status)"

cat > "$SANDBOX_ENV" <<EOF
ACCOUNT="$ACCOUNT"
INSTANCE_PROFILE="$PROFILE"
CLOUDFRONT_PREFIX_LIST="$PL"
EOF
echo; ok "saved $SANDBOX_ENV — next: ./scripts/deploy.sh"
