#!/usr/bin/env bash
# =============================================================================
# deploy.sh — build (or rebuild) the whole system for this sandbox session.
# Safe to run again: every step checks what is already there.
#
#  1. CloudFormation: network, security groups, S3, RDS, load balancer,
#     CloudFront, Auto Scaling group (0 servers for now), alarms, dashboard
#  2. uploads settings, scripts, source code, the database export / your
#     latest backup, and the media files to S3
#  3. a temporary "ops" instance builds the app (unless a cached build exists)
#     and loads the database
#  4. starts the web servers (2) and waits until the load balancer sees them
#     healthy; replaces old servers one at a time if the app version changed
# Takes ~25–40 minutes the first time in a session (RDS + CloudFront creation).
# =============================================================================
. "$(dirname "$0")/lib.sh"
load_secrets
load_sandbox
VERSION="$(code_version)"
mkdir -p "$TBHF_HOME/artifacts" "$TBHF_HOME/logs"

STATUS="$(stack_status)"
case "$STATUS" in
  *_IN_PROGRESS) die "stack $STACK is busy ($STATUS) — wait and run again" ;;
  ROLLBACK_COMPLETE|ROLLBACK_FAILED|DELETE_FAILED)
    die "stack $STACK is in $STATUS — run ./scripts/teardown.sh --no-backup, then deploy again" ;;
esac

stack_params() {  # stack_params <desired> <version>
  local ami
  if [ "$STATUS" = "NONE" ]; then ami="$(latest_ami)"; else ami="$(stack_param LatestAmiId)"; fi
  echo "ProjectName=$STACK InstanceProfileName=$INSTANCE_PROFILE CloudFrontPrefixListId=$CLOUDFRONT_PREFIX_LIST" \
       "LatestAmiId=$ami DBPassword=$DB_MASTER_PASSWORD DBInstanceClass=$DB_INSTANCE_CLASS" \
       "DBEngineVersion=$DB_ENGINE_VERSION WebInstanceType=$WEB_INSTANCE_TYPE AlertEmail=$ALERT_EMAIL" \
       "WebDesiredCapacity=$1 AppVersion=$2"
}
cfn_deploy() {  # cfn_deploy <desired> <version>
  # shellcheck disable=SC2046  # word splitting of the KEY=value list is intended
  if ! aws cloudformation deploy --stack-name "$STACK" \
        --template-file "$AWS_DIR/cloudformation/tbhf.yaml" \
        --parameter-overrides $(stack_params "$1" "$2") \
        --tags "Project=$STACK" --no-fail-on-empty-changeset; then
    echo "  ---- what failed ----"
    aws cloudformation describe-stack-events --stack-name "$STACK" --max-items 40 \
      --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatusReason]" \
      --output text | head -n 10 | sed 's/^/  | /'
    die "CloudFormation could not finish (see above)"
  fi
}

# --------------------------------------------------------------------------
step "1/4  Infrastructure (CloudFormation stack '$STACK')"
if [ "$STATUS" = "NONE" ]; then
  echo "  creating — RDS and CloudFront take 15–25 minutes, the prompt returns when done"
  cfn_deploy 0 none
else
  echo "  stack exists ($STATUS) — applying template changes, keeping the current servers"
  cfn_deploy "$(stack_param WebDesiredCapacity)" "$(stack_param AppVersion)"
fi
load_outputs
ok "stack ready — site will be $SiteUrl"

# --------------------------------------------------------------------------
step "2/4  Upload settings, scripts, source and data to S3"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
umask 077
cat > "$TMP/app.env" <<EOF
DATABASE_URL=postgresql://tbhf_app:$APP_DB_PASSWORD@$DbEndpoint:5432/tbhf
PGSSLMODE=require
SESSION_SECRET=$SESSION_SECRET
MEDIA_BUCKET=$MediaBucket
AWS_REGION=$AWS_REGION
PG_POOL_MAX=10
EOF
cat > "$TMP/ops.env" <<EOF
PGHOST=$DbEndpoint
PGPORT=5432
PGDATABASE=tbhf
PGUSER=tbhf_admin
PGPASSWORD=$DB_MASTER_PASSWORD
PGSSLMODE=require
APP_DB_PASSWORD=$APP_DB_PASSWORD
SEED_PASSWORD=$SEED_PASSWORD
ADMIN_CODE=$ADMIN_CODE
EOF
aws s3 cp "$TMP/app.env" "s3://$AppBucket/config/app.env" --only-show-errors
aws s3 cp "$TMP/ops.env" "s3://$AppBucket/config/ops.env" --only-show-errors
ok "config/app.env, config/ops.env (private bucket, encrypted)"
aws s3 cp "$AWS_DIR/ops/web-boot.sh" "s3://$AppBucket/deploy/web-boot.sh" --only-show-errors
aws s3 cp "$AWS_DIR/ops/ops.sh"      "s3://$AppBucket/deploy/ops.sh"      --only-show-errors
ok "deploy/web-boot.sh, deploy/ops.sh"
if ! aws s3 ls "s3://$AppBucket/src/src-$VERSION.tar.gz" >/dev/null 2>&1; then
  pack_source "$TMP/src.tar.gz"
  aws s3 cp "$TMP/src.tar.gz" "s3://$AppBucket/src/src-$VERSION.tar.gz" --only-show-errors
fi
ok "source code version $VERSION"

LATEST="$TBHF_HOME/backups/latest"
if [ -f "$LATEST/schema-public.sql" ]; then
  aws s3 sync "$LATEST/" "s3://$AppBucket/import/restore/" --delete --only-show-errors
  ok "latest backup $(basename "$(readlink "$LATEST")") → will be restored"
else
  need_file "$TBHF_HOME/import/schema.sql" "run ./scripts/01-setup-once.sh"
  need_file "$TBHF_HOME/import/data.sql"   "run ./scripts/01-setup-once.sh"
  aws s3 cp "$TBHF_HOME/import/schema.sql" "s3://$AppBucket/import/schema.sql" --only-show-errors
  aws s3 cp "$TBHF_HOME/import/data.sql"   "s3://$AppBucket/import/data.sql"   --only-show-errors
  ok "original Supabase export → will be imported"
fi
if [ -d "$TBHF_HOME/media" ] && [ -n "$(ls -A "$TBHF_HOME/media" 2>/dev/null)" ]; then
  aws s3 sync "$TBHF_HOME/media/" "s3://$MediaBucket/" --only-show-errors
  ok "media files ($(du -sh "$TBHF_HOME/media" | cut -f1)) → s3://$MediaBucket"
fi

# --------------------------------------------------------------------------
step "3/4  Build the app and load the database (temporary ops instance)"
MODE=""
ART="$TBHF_HOME/artifacts/app-$VERSION.tar.gz"
if aws s3 ls "s3://$AppBucket/app/app-$VERSION.tar.gz" >/dev/null 2>&1; then
  ok "build $VERSION already in S3"
elif [ -f "$ART" ]; then
  aws s3 cp "$ART" "s3://$AppBucket/app/app-$VERSION.tar.gz" --only-show-errors
  ok "reused cached build $VERSION from CloudShell (no rebuild needed)"
else
  MODE="build"
fi
if aws s3 ls "s3://$AppBucket/ops/db-loaded" >/dev/null 2>&1; then
  ok "database already loaded this session"
else
  MODE="${MODE:+$MODE,}dbinit"
fi
if [ -n "$MODE" ]; then
  echo "  job: $MODE  (build ≈ 8–12 min, database load ≈ 2–5 min)"
  ops_run "$MODE" "$VERSION" 50 || die "ops job failed — fix the cause and run ./scripts/deploy.sh again"
  if [[ "$MODE" == *build* ]]; then
    aws s3 cp "s3://$AppBucket/app/app-$VERSION.tar.gz" "$ART" --only-show-errors
    (cd "$TBHF_HOME/artifacts" && ls -t app-*.tar.gz | tail -n +3 | xargs -r rm -f)
    ok "build cached in CloudShell: $ART ($(du -h "$ART" | cut -f1))"
  fi
  if [[ "$MODE" == *dbinit* ]]; then
    aws s3 cp "s3://$AppBucket/ops/$OPS_RUN_ID/import.log" "$TBHF_HOME/logs/import-$OPS_RUN_ID.log" --only-show-errors 2>/dev/null || true
    if [ -f "$TBHF_HOME/logs/import-$OPS_RUN_ID.log" ]; then
      grep -E '\| (PASS|FAIL)' "$TBHF_HOME/logs/import-$OPS_RUN_ID.log" | sed 's/^/    /' || true
    fi
    echo "loaded $(date -u)" | aws s3 cp - "s3://$AppBucket/ops/db-loaded" --only-show-errors
    ok "database ready"
  fi
fi

# --------------------------------------------------------------------------
step "4/4  Web servers"
PREV_VERSION="$(stack_param AppVersion)"
PREV_DESIRED="$(stack_param WebDesiredCapacity)"
STATUS="$(stack_status)"
cfn_deploy "$WEB_COUNT" "$VERSION"
if [ "$PREV_DESIRED" -gt 0 ] && [ "$PREV_VERSION" != "$VERSION" ] && [ "$PREV_VERSION" != "none" ]; then
  echo "  app version changed $PREV_VERSION → $VERSION: replacing servers one at a time"
  wait_healthy 1 15 || true
  roll_instances
else
  echo "  waiting for $WEB_COUNT healthy servers (each boots in ~2–4 minutes)"
  wait_healthy "$WEB_COUNT" 20 || die "servers did not become healthy — run ./scripts/status.sh and read the boot logs"
fi

step "Checking the site through CloudFront"
code=000
for _ in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$SiteUrl/login" || true)
  [ "$code" = "200" ] && break
  sleep 15
done
[ "$code" = "200" ] && ok "$SiteUrl/login → HTTP 200" || warn "$SiteUrl/login → HTTP $code (CloudFront may still be deploying — try again in a few minutes)"

cat <<EOF

${B}══════════════════════════════════════════════════════════════════════${N}
  ${G}Website:${N}     $SiteUrl
  App version: $VERSION     Web servers: $WEB_COUNT × $WEB_INSTANCE_TYPE
  Database:    $DbEndpoint (private)
  Sign in:     any imported member email + the password SEED_PASSWORD
               in ~/tbhf/secrets.env (only after the first, original import;
               after a restore everyone keeps the password they set)
  Admin code:  ADMIN_CODE in ~/tbhf/secrets.env
  ${Y}Before the sandbox timer ends:${N} ./scripts/backup.sh
${B}══════════════════════════════════════════════════════════════════════${N}
EOF
