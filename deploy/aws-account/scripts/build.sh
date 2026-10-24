#!/usr/bin/env bash
# =============================================================================
# build.sh — build the current code in AWS CodeBuild (about 6–10 minutes):
#   website image + ops image → Amazon ECR, reminders Lambda → S3,
#   and release/latest.json, which start.sh deploys.
# Version = the git commit. Commit your changes first.
# =============================================================================
. "$(dirname "$0")/lib.sh"
need_foundation
ARTIFACTS=$(out "$FOUNDATION" ArtifactsBucket)
PROJECT_NAME=$(out "$FOUNDATION" BuildProject)

TAG=$(git -C "$REPO_ROOT" rev-parse --short=10 HEAD)
if [ -n "$(git -C "$REPO_ROOT" status --porcelain -- tbhf-platform deploy)" ]; then
  warn "uncommitted changes are NOT included (the build uses the last commit $TAG)"
fi
step "1/2  Upload source $TAG"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
git -C "$REPO_ROOT" archive --format=zip -o "$TMP/source.zip" HEAD tbhf-platform deploy
aws s3 cp "$TMP/source.zip" "s3://$ARTIFACTS/source/source.zip" --only-show-errors
ok "s3://$ARTIFACTS/source/source.zip ($(du -h "$TMP/source.zip" | cut -f1))"

step "2/2  CodeBuild project $PROJECT_NAME"
BUILD_ID=$(aws codebuild start-build --project-name "$PROJECT_NAME" \
  --environment-variables-override "name=SOURCE_TAG,value=$TAG,type=PLAINTEXT" \
  --query 'build.id' --output text)
ok "build $BUILD_ID started"
LAST=""
while :; do
  sleep 20
  read -r STATUS PHASE < <(aws codebuild batch-get-builds --ids "$BUILD_ID" \
    --query 'builds[0].[buildStatus,currentPhase]' --output text)
  [ "$PHASE" != "$LAST" ] && { echo "    $(date -u +%H:%M:%S) $PHASE"; LAST="$PHASE"; }
  [ "$STATUS" = "IN_PROGRESS" ] || break
done
if [ "$STATUS" != "SUCCEEDED" ]; then
  echo "  ---- last lines of the build log ----"
  aws logs tail "/aws/codebuild/$PROJECT_NAME" --since 20m 2>/dev/null | tail -n 40 | sed 's/^/  | /' || true
  die "build $STATUS — see the log above (CodeBuild console → $PROJECT_NAME → build history)"
fi
aws s3 cp "s3://$ARTIFACTS/release/latest.json" - | sed 's/^/  /'
ok "build $TAG ready. Next: ./scripts/start.sh (or, if the site is running, start.sh rolls it out)"
