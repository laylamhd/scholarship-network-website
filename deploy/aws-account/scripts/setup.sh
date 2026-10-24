#!/usr/bin/env bash
# =============================================================================
# setup.sh — run ONCE (safe to run again after changing config.sh).
#   ./scripts/setup.sh [path/to/schema.sql] [path/to/data.sql]
#
#  1. checks your account and config
#  2. creates the FOUNDATION stack (key, secrets, buckets, registries, build
#     project, e-mail sender, alerts, budget, CloudTrail, GuardDuty)
#  3. uploads the Supabase export to the private artifacts bucket
#  4. copies the files the export links to on Supabase Storage into the media bucket
# =============================================================================
. "$(dirname "$0")/lib.sh"
SCHEMA_SRC="${1:-$HOME/schema.sql}"
DATA_SRC="${2:-$HOME/data.sql}"

step "1/4  Account and settings"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text) || die "no AWS credentials — open CloudShell from the AWS console"
ok "account $ACCOUNT, region $AWS_REGION"
[[ "$ALERT_EMAIL" == *@*.* ]] || die "set ALERT_EMAIL in deploy/aws-account/config.sh (nano config.sh)"
ok "alerts go to $ALERT_EMAIL"
[ -n "$SENDER_EMAIL" ] && ok "password-reset e-mails come from $SENDER_EMAIL" || warn "SENDER_EMAIL is empty: the site will not send e-mails"
for t in aws git jq zip curl python3; do command -v "$t" >/dev/null || die "$t not found"; done
# Service-linked roles some services need in a brand-new account (errors = already there).
for svc in ecs.amazonaws.com elasticloadbalancing.amazonaws.com rds.amazonaws.com ecs.application-autoscaling.amazonaws.com; do
  aws iam create-service-linked-role --aws-service-name "$svc" >/dev/null 2>&1 || true
done
ok "service-linked roles ready"

step "2/4  Foundation stack '$FOUNDATION' (2–4 minutes)"
cfn_deploy "$FOUNDATION" "$HERE_DIR/cloudformation/foundation.yaml" \
  "ProjectName=$PROJECT" "AlertEmail=$ALERT_EMAIL" "SenderEmail=$SENDER_EMAIL" \
  "MonthlyBudgetUSD=$MONTHLY_BUDGET_USD" "EnableGuardDuty=$ENABLE_GUARDDUTY" \
  "EnablePipeline=$ENABLE_PIPELINE" "GitHubRepository=$GITHUB_REPOSITORY" "GitHubBranch=$GITHUB_BRANCH"
ARTIFACTS=$(out "$FOUNDATION" ArtifactsBucket); MEDIA=$(out "$FOUNDATION" MediaBucket)
ok "artifacts bucket $ARTIFACTS"
ok "media bucket $MEDIA"

step "3/4  Supabase export → private S3"
if aws s3 ls "s3://$ARTIFACTS/import/data.sql" >/dev/null 2>&1 && [ ! -f "$DATA_SRC" ]; then
  ok "already uploaded"
else
  for f in "$SCHEMA_SRC" "$DATA_SRC"; do [ -f "$f" ] || die "$f not found — upload it with CloudShell Actions → Upload file"; done
  grep -q 'CREATE TABLE public.profiles' "$SCHEMA_SRC" || die "$SCHEMA_SRC is not the Supabase schema export"
  grep -q 'COPY public.profiles' "$DATA_SRC" || die "$DATA_SRC is not the Supabase data export"
  aws s3 cp "$SCHEMA_SRC" "s3://$ARTIFACTS/import/schema.sql" --only-show-errors
  aws s3 cp "$DATA_SRC"   "s3://$ARTIFACTS/import/data.sql"   --only-show-errors
  mkdir -p "$WORK_DIR/import"; mv -f "$SCHEMA_SRC" "$DATA_SRC" "$WORK_DIR/import/"; chmod 600 "$WORK_DIR"/import/*
  ok "uploaded; local copies moved to $WORK_DIR/import (private)"
fi

step "4/4  Files from Supabase Storage → media bucket"
DATA_LOCAL="$WORK_DIR/import/data.sql"; [ -f "$DATA_LOCAL" ] || aws s3 cp "s3://$ARTIFACTS/import/data.sql" "$DATA_LOCAL" --only-show-errors
python3 - "$DATA_LOCAL" "$WORK_DIR/media" <<'PY'
import os, re, sys, urllib.parse, urllib.request
data, out = sys.argv[1], sys.argv[2]
pat = re.compile(r"https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/([a-z0-9-]+)/([^\s'\"\\),]+)")
urls = sorted({m.group(0) for m in pat.finditer(open(data, encoding="utf-8").read())})
got = have = failed = 0
for url in urls:
    m = pat.match(url)
    dest = os.path.join(out, m.group(1), urllib.parse.unquote(m.group(2)))
    if os.path.exists(dest): have += 1; continue
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=30) as r, open(dest, "wb") as f: f.write(r.read())
        got += 1
    except Exception as e:
        failed += 1; print(f"  ! could not download {m.group(1)}/{m.group(2)}: {e}")
print(f"  {len(urls)} linked files: {got} downloaded, {have} already here, {failed} failed")
PY
if [ -d "$WORK_DIR/media" ]; then
  aws s3 sync "$WORK_DIR/media/" "s3://$MEDIA/" --only-show-errors \
    --cache-control "public, max-age=31536000, immutable"
  ok "media bucket up to date"
fi

echo
ok "setup done. Next: ./scripts/build.sh, then ./scripts/start.sh"
echo "  Check your inbox: confirm the SNS alerts subscription${SENDER_EMAIL:+ and click the Amazon SES verification link for $SENDER_EMAIL}."
if [ "$ENABLE_PIPELINE" = "true" ]; then
  echo "  CodePipeline: approve the GitHub connection once in the console:"
  echo "  Developer Tools → Settings → Connections → $PROJECT-github → Update pending connection"
fi
