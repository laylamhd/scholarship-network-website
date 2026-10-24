#!/usr/bin/env bash
# =============================================================================
# backup.sh — run BEFORE THE SANDBOX TIMER ENDS (everything in AWS is deleted
# when the session ends; only the CloudShell home directory is kept).
#   1. an ops instance dumps the database (pg_dump) to S3
#   2. the dump is copied to ~/tbhf/backups/<time>/ and becomes "latest"
#      (deploy.sh restores it next session); the 3 newest backups are kept
#   3. the media bucket (uploaded photos/files) is copied to ~/tbhf/media/
# =============================================================================
. "$(dirname "$0")/lib.sh"
load_sandbox
[[ "$(stack_status)" == *COMPLETE ]] || die "stack $STACK is not running — nothing to back up"
load_outputs
VERSION="$(stack_param AppVersion)"
[ "$VERSION" != "none" ] || VERSION="$(code_version)"
if ! aws s3 ls "s3://$AppBucket/src/src-$VERSION.tar.gz" >/dev/null 2>&1; then
  T="$(mktemp -d)"; pack_source "$T/src.tar.gz"
  aws s3 cp "$T/src.tar.gz" "s3://$AppBucket/src/src-$VERSION.tar.gz" --only-show-errors; rm -rf "$T"
fi

step "1/3  Dump the database"
ops_run backup "$VERSION" 20 || die "backup failed — see the log above"

step "2/3  Copy the dump to CloudShell"
DEST="$TBHF_HOME/backups/$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$DEST" && chmod 700 "$DEST"
aws s3 cp "s3://$AppBucket/backups/$OPS_RUN_ID/" "$DEST/" --recursive --only-show-errors
for f in schema-public.sql data-public.sql data-auth-users.sql; do
  [ -s "$DEST/$f" ] || die "$f missing or empty in the backup"
done
chmod 600 "$DEST"/*
ln -sfn "$DEST" "$TBHF_HOME/backups/latest"
(cd "$TBHF_HOME/backups" && ls -1d 20*/ | sort | head -n -3 | xargs -r rm -rf)
ok "$DEST ($(du -sh "$DEST" | cut -f1)) is now 'latest'"
ok "kept: $(cd "$TBHF_HOME/backups" && ls -1d 20*/ | tr -d / | tr '\n' ' ')"

step "3/3  Copy uploaded media to CloudShell"
mkdir -p "$TBHF_HOME/media"
aws s3 sync "s3://$MediaBucket/" "$TBHF_HOME/media/" --only-show-errors
ok "$TBHF_HOME/media ($(du -sh "$TBHF_HOME/media" | cut -f1))"
echo "  CloudShell home usage: $(du -sh "$HOME" | cut -f1) of ~1 GB"
