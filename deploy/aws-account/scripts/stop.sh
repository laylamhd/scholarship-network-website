#!/usr/bin/env bash
# =============================================================================
# stop.sh — stop paying for the expensive parts while you are not using them.
# Deletes the RUNTIME stack. CloudFormation first saves the database as a
# snapshot (DeletionPolicy: Snapshot); start.sh restores from it, so no data
# is lost. Keeps the 2 newest snapshots. Takes 10–20 minutes.
# The FOUNDATION stack (secrets, buckets, images, budget…) stays.
# =============================================================================
. "$(dirname "$0")/lib.sh"
S=$(stack_status "$RUNTIME")
[ "$S" != NONE ] || { ok "nothing running — $RUNTIME does not exist"; exit 0; }
[ "${1:-}" = "--yes" ] || { read -r -p "Stop the website (data is kept in a snapshot)? [y/N] " a; [[ "$a" == [yY]* ]] || die "cancelled"; }

step "Deleting $RUNTIME (the database is snapshotted first)"
aws cloudformation delete-stack --stack-name "$RUNTIME"
aws cloudformation wait stack-delete-complete --stack-name "$RUNTIME" \
  || die "delete did not finish — see CloudFormation → $RUNTIME → Events, then run stop.sh again"
ok "runtime stopped"

SNAP=$(latest_snapshot)
[ -n "$SNAP" ] && ok "data saved in snapshot $SNAP (start.sh restores it)" || warn "no snapshot found — the next start.sh will import the original export"
step "Keeping the 2 newest snapshots"
aws rds describe-db-snapshots --db-instance-identifier "$PROJECT-db" --snapshot-type manual \
  --query 'sort_by(DBSnapshots[?Status==`available`], &SnapshotCreateTime)[].DBSnapshotIdentifier' --output text \
  | tr '\t' '\n' | head -n -2 | while read -r old; do
      [ -n "$old" ] && aws rds delete-db-snapshot --db-snapshot-identifier "$old" >/dev/null && ok "deleted old $old"
    done
ok "done — only the foundation (a few $ / month) is left running"
