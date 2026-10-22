#!/usr/bin/env bash
# =============================================================================
# start.sh — bring the website up (or update it to the newest build).
#   • creates the RUNTIME stack: network + NAT, load balancer, ECS Fargate,
#     RDS (restored from the last stop.sh snapshot if there is one), Lambda +
#     schedule, CloudFront + WAF, backups, alarms, dashboard   (≈ 20–30 min)
#   • first time only: loads the Supabase export with the ops task
#   • if the site is already running: rolls out the newest build, no downtime
# =============================================================================
. "$(dirname "$0")/lib.sh"
need_foundation
ARTIFACTS=$(out "$FOUNDATION" ArtifactsBucket)

step "1/4  Build to deploy"
if ! aws s3 ls "s3://$ARTIFACTS/release/latest.json" >/dev/null 2>&1; then
  warn "no build yet — running ./scripts/build.sh first"
  "$HERE_DIR/scripts/build.sh"
fi
TAG=$(aws s3 cp "s3://$ARTIFACTS/release/latest.json" - | jq -r .tag)
ok "version $TAG"

step "2/4  Database"
STATUS=$(stack_status "$RUNTIME")
case "$STATUS" in
  *_IN_PROGRESS) die "$RUNTIME is busy ($STATUS) — wait and try again" ;;
  ROLLBACK_COMPLETE|DELETE_FAILED|ROLLBACK_FAILED) die "$RUNTIME is in $STATUS — run ./scripts/stop.sh, then start.sh" ;;
esac
FRESH=no
if [ "$STATUS" = "NONE" ]; then
  SNAP=$(latest_snapshot)
  if [ -n "$SNAP" ]; then ok "restoring from snapshot $SNAP (your data from the last stop.sh)"
  else ok "no snapshot — a new, empty database (the export is loaded after)"; FRESH=yes; fi
else
  SNAP=$(param "$RUNTIME" DBSnapshotIdentifier)   # never change it on a running stack
  [ "$SNAP" = "None" ] && SNAP=""
  ok "runtime stack exists ($STATUS) — keeping its database"
fi

if [ "$STATUS" = "NONE" ]; then   # newest PostgreSQL 17 release RDS offers in this region
  DBVER=$(aws rds describe-db-engine-versions --engine postgres \
          --query "DBEngineVersions[?starts_with(EngineVersion, '17.')].EngineVersion | [-1]" --output text)
  [[ "$DBVER" == 17.* ]] || die "RDS offers no PostgreSQL 17 version here"
else
  DBVER=$(param "$RUNTIME" DBEngineVersion)
fi
ok "PostgreSQL $DBVER"

step "3/4  Runtime stack '$RUNTIME'"
PL=$(aws ec2 describe-managed-prefix-lists --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
     --query 'PrefixLists[0].PrefixListId' --output text)
[ "$STATUS" = "NONE" ] && echo "  creating — CloudFront and the Multi-AZ database take 20–30 minutes; the prompt returns when done"
cfn_deploy "$RUNTIME" "$HERE_DIR/cloudformation/runtime.yaml" \
  "ProjectName=$PROJECT" "ImageTag=$TAG" "LambdaS3Key=lambda/reminders-$TAG.zip" \
  "SenderEmail=$SENDER_EMAIL" "DBSnapshotIdentifier=$SNAP" \
  "DBInstanceClass=$DB_INSTANCE_CLASS" "DBEngineVersion=$DBVER" "DBMultiAZ=$DB_MULTI_AZ" \
  "WebMinTasks=$WEB_MIN_TASKS" "WebMaxTasks=$WEB_MAX_TASKS" "ContainerInsights=$CONTAINER_INSIGHTS" \
  "CloudFrontPrefixListId=$PL" "WafRateLimit=$WAF_RATE_LIMIT" "WafRateAction=$WAF_RATE_ACTION"
ok "stack ready"

step "4/4  Data and website"
if [ "$FRESH" = yes ]; then
  run_ops dbinit || die "the database import failed — read the log above"
else
  ok "data already in the database"
fi
CLUSTER=$(out "$RUNTIME" ClusterName); SERVICE=$(out "$RUNTIME" WebServiceName)
echo "  waiting for the website containers to be healthy (2–5 minutes)…"
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" || warn "not stable yet — check ./scripts/status.sh"
SITE=$(out "$RUNTIME" SiteUrl)
code=000
for _ in $(seq 1 20); do code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/login" || true); [ "$code" = 200 ] && break; sleep 15; done
[ "$code" = 200 ] && ok "$SITE/login → HTTP 200" || warn "$SITE/login → HTTP $code (CloudFront may still be spreading — try in a few minutes)"

cat <<EOF

${B}══════════════════════════════════════════════════════════════════════${N}
  ${G}Website:${N}   $SITE
  Version:   $TAG        Containers: $WEB_MIN_TASKS–$WEB_MAX_TASKS (Fargate)
  Sign in:   an imported member's e-mail + the first password:
             aws secretsmanager get-secret-value --secret-id $PROJECT/seed-password --query SecretString --output text
             (members can also use "Forgot password?" once SES is verified)
  Admin code: aws secretsmanager get-secret-value --secret-id $PROJECT/admin-code --query SecretString --output text
  ${Y}Not using it for a while?${N} ./scripts/stop.sh  (saves the data, stops the hourly cost)
${B}══════════════════════════════════════════════════════════════════════${N}
EOF
