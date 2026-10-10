#!/usr/bin/env bash
# =============================================================================
# update-app.sh — publish new code during a session.
#   1. pulls the latest commits of this branch from GitHub
#   2. runs deploy.sh, which builds the new version on an ops instance and
#      replaces the web servers one at a time (no downtime: the load balancer
#      keeps sending traffic to the server that is still running)
# =============================================================================
. "$(dirname "$0")/lib.sh"
if git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  step "Pulling the latest code"
  git -C "$REPO_ROOT" pull --ff-only
fi
exec "$AWS_DIR/scripts/deploy.sh"
