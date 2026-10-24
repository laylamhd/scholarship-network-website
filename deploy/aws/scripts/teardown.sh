#!/usr/bin/env bash
# =============================================================================
# teardown.sh — delete everything this project created in AWS.
#   ./scripts/teardown.sh              backup first, then delete (asks to confirm)
#   ./scripts/teardown.sh --no-backup  delete without a backup
# Your CloudShell files (~/tbhf: secrets, backups, cached builds) are kept.
# =============================================================================
. "$(dirname "$0")/lib.sh"
S="$(stack_status)"
[ "$S" != "NONE" ] || { ok "stack $STACK does not exist — nothing to delete"; exit 0; }
read -r -p "Type DELETE to remove stack $STACK and all its data in AWS: " answer
[ "$answer" = "DELETE" ] || die "cancelled"

if [ "${1:-}" != "--no-backup" ] && [[ "$S" == CREATE_COMPLETE || "$S" == UPDATE_COMPLETE* ]]; then
  "$AWS_DIR/scripts/backup.sh" || die "backup failed — fix it or run with --no-backup"
fi

empty_bucket() {  # deletes every object version and delete marker
  local b="$1" batch
  aws s3api head-bucket --bucket "$b" >/dev/null 2>&1 || return 0
  aws s3 rm "s3://$b" --recursive --only-show-errors || true
  while :; do
    batch=$(aws s3api list-object-versions --bucket "$b" --max-items 500 --output json \
      | jq -c '{Objects: ([.Versions[]?, .DeleteMarkers[]?] | map({Key, VersionId})), Quiet: true}')
    [ "$(jq '.Objects | length' <<<"$batch")" -gt 0 ] || break
    aws s3api delete-objects --bucket "$b" --delete "$batch" >/dev/null
  done
  ok "emptied $b"
}

step "Stopping ops instances"
ids=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=$STACK-ops-*" Name=instance-state-name,Values=pending,running,stopping,stopped \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$ids" ]; then
  # shellcheck disable=SC2086
  aws ec2 terminate-instances --instance-ids $ids >/dev/null && ok "terminated $ids"
else
  ok "none"
fi

step "Emptying the S3 buckets (CloudFormation cannot delete non-empty buckets)"
for key in AppBucket MediaBucket; do
  b=$(aws cloudformation describe-stack-resource --stack-name "$STACK" --logical-resource-id "$key" \
      --query StackResourceDetail.PhysicalResourceId --output text 2>/dev/null || true)
  [ -n "$b" ] && [ "$b" != "None" ] && empty_bucket "$b"
done

step "Deleting stack $STACK (CloudFront and RDS take 5–15 minutes)"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" \
  && ok "stack deleted" \
  || die "delete did not finish — run ./scripts/status.sh, then run teardown again"
rm -f "$STACK_ENV"
