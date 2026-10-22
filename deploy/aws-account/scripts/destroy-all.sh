#!/usr/bin/env bash
# =============================================================================
# destroy-all.sh — END OF PROJECT: delete everything this project created,
# including the saved data. Then close the account in the console.
# =============================================================================
. "$(dirname "$0")/lib.sh"
read -r -p "Delete ALL project resources and data, permanently? Type DESTROY: " a
[ "$a" = DESTROY ] || die "cancelled"

empty_bucket() {  # deletes every object version and delete marker
  local b="$1" batch
  [ -n "$b" ] && [ "$b" != None ] || return 0
  aws s3api head-bucket --bucket "$b" >/dev/null 2>&1 || return 0
  while :; do
    batch=$(aws s3api list-object-versions --bucket "$b" --max-items 500 --output json \
      | jq -c '{Objects: ([.Versions[]?, .DeleteMarkers[]?] | map({Key, VersionId})), Quiet: true}')
    [ "$(jq '.Objects | length' <<<"$batch")" -gt 0 ] || break
    aws s3api delete-objects --bucket "$b" --delete "$batch" >/dev/null
  done
  ok "emptied $b"
}

step "1/5  Runtime stack"
if [ "$(stack_status "$RUNTIME")" != NONE ]; then
  aws cloudformation delete-stack --stack-name "$RUNTIME"
  aws cloudformation wait stack-delete-complete --stack-name "$RUNTIME" || die "runtime delete failed — check CloudFormation events"
fi
ok "runtime gone"

step "2/5  Database snapshots"
for s in $(aws rds describe-db-snapshots --db-instance-identifier "$PROJECT-db" --snapshot-type manual \
             --query 'DBSnapshots[].DBSnapshotIdentifier' --output text 2>/dev/null); do
  aws rds delete-db-snapshot --db-snapshot-identifier "$s" >/dev/null && ok "deleted $s"
done

step "3/5  AWS Backup recovery points"
VAULT="$PROJECT-vault"
for rp in $(aws backup list-recovery-points-by-backup-vault --backup-vault-name "$VAULT" \
              --query 'RecoveryPoints[].RecoveryPointArn' --output text 2>/dev/null); do
  aws backup delete-recovery-point --backup-vault-name "$VAULT" --recovery-point-arn "$rp" && ok "deleted $rp"
done
sleep 20   # recovery-point deletion is asynchronous

step "4/5  Buckets"
if [ "$(stack_status "$FOUNDATION")" != NONE ]; then
  for key in MediaBucket ArtifactsBucket TrailBucket; do
    b=$(aws cloudformation describe-stack-resource --stack-name "$FOUNDATION" --logical-resource-id "$key" \
        --query StackResourceDetail.PhysicalResourceId --output text 2>/dev/null || true)
    empty_bucket "$b"
  done
fi

step "5/5  Foundation stack (also stops CloudTrail and GuardDuty)"
if [ "$(stack_status "$FOUNDATION")" != NONE ]; then
  aws cloudformation delete-stack --stack-name "$FOUNDATION"
  aws cloudformation wait stack-delete-complete --stack-name "$FOUNDATION" || die "foundation delete failed — check CloudFormation events"
fi
ok "everything deleted"
cat <<EOF

  Last steps in the console (as the root user):
   1. Billing and Cost Management → Bills: check nothing is still running.
   2. Account (top-right menu) → Close account.
  Secrets Manager keeps deleted secrets for 7 days, then removes them (no charge).
EOF
