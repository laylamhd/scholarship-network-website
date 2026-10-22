#!/usr/bin/env bash
# =============================================================================
# run-ops.sh — run a one-off database job as an ECS Fargate task in the VPC.
#   ./scripts/run-ops.sh check    the 12 security / consistency checks
#   ./scripts/run-ops.sh dbinit   import the Supabase export (empty database only)
#   ./scripts/run-ops.sh reset    DELETE all website data (asks first) — to retry a failed import
# =============================================================================
. "$(dirname "$0")/lib.sh"
MODE="${1:?usage: run-ops.sh check|dbinit|reset}"
[[ "$(stack_status "$RUNTIME")" == *_COMPLETE ]] || die "the website is not running — ./scripts/start.sh first"
EXTRA=()
if [ "$MODE" = reset ]; then
  read -r -p "This DELETES every member, post and file record in the database. Type DELETE: " a
  [ "$a" = DELETE ] || die "cancelled"
  EXTRA=(CONFIRM=delete-everything)
fi
step "ops task: $MODE"
run_ops "$MODE" "${EXTRA[@]}" && ok "finished" || die "the task failed — see the log above"
