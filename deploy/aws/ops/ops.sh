#!/usr/bin/env bash
# =============================================================================
# ops/ops.sh — the short-lived "ops" EC2 instance (launched by scripts/lib.sh
# ops_run). It sits inside the VPC, so unlike CloudShell it can reach RDS.
# It does one job, reports to S3, then shuts itself down (and is terminated).
#
#   MODE (comma list):
#     build    compile the Next.js app → s3://<AppBucket>/app/app-<APP_VERSION>.tar.gz
#     dbinit   load the database (restore the newest backup if one was uploaded,
#              otherwise import the original Supabase export)
#     backup   dump the database → s3://<AppBucket>/backups/<RUN_ID>/
#
# Progress: s3://<AppBucket>/ops/<RUN_ID>/status   (last line = current state)
# Full log: s3://<AppBucket>/ops/<RUN_ID>/ops.log
# Source code: s3://<AppBucket>/src/src-<APP_VERSION>.tar.gz, uploaded from
# your CloudShell copy of the branch by scripts/deploy.sh (so the GitHub repo
# may stay private — this instance never needs your GitHub credentials).
# Needs: APP_BUCKET RUN_ID MODE APP_VERSION AWS_REGION
# =============================================================================
set -Eeuo pipefail
: "${APP_BUCKET:?}" "${RUN_ID:?}" "${MODE:?}" "${APP_VERSION:?}" "${AWS_REGION:?}"
export AWS_DEFAULT_REGION="$AWS_REGION"
S3="s3://$APP_BUCKET/ops/$RUN_ID"
LOG=/var/log/tbhf-ops.log

STATUS_LOG=/var/log/tbhf-status.log; : > "$STATUS_LOG"
status() {  # every line is kept; CloudShell prints the ones it has not shown yet
  echo ">>> $*"; echo "$(date -u +%H:%M:%S) $*" >> "$STATUS_LOG"
  aws s3 cp "$STATUS_LOG" "$S3/status" --only-show-errors || true
}
finish() {
  if [ -f /var/log/tbhf-import.log ]; then aws s3 cp /var/log/tbhf-import.log "$S3/import.log" --only-show-errors || true; fi
  aws s3 cp "$LOG" "$S3/ops.log" --only-show-errors || true
  shutdown -h +1 "ops job finished" || true
}
trap 'status "FAILED at line $LINENO"; finish' ERR
trap finish EXIT

rm -f /var/log/tbhf-import.log
status "STARTED mode=$MODE"
dnf install -y -q tar xz
# PostgreSQL 17 client (pg_dump must be ≥ the server's major version).
dnf install -y -q postgresql17 || dnf install -y -q postgresql16 || dnf install -y -q postgresql15
psql --version

status "fetching source $APP_VERSION"
rm -rf /opt/src && mkdir -p /opt/src
aws s3 cp "s3://$APP_BUCKET/src/src-$APP_VERSION.tar.gz" /tmp/src.tar.gz --only-show-errors
tar -xzf /tmp/src.tar.gz -C /opt/src

# ---------------------------------------------------------------- build
if [[ ",$MODE," == *,build,* ]]; then
  status "build: installing Node.js 22"
  NODE_DIST=https://nodejs.org/dist/latest-v22.x
  NODE_TAR=$(curl -fsSL "$NODE_DIST/SHASUMS256.txt" | grep -o 'node-v[0-9.]*-linux-x64\.tar\.xz' | head -1)
  curl -fsSL "$NODE_DIST/$NODE_TAR" -o "/tmp/$NODE_TAR"
  (cd /tmp && curl -fsSL "$NODE_DIST/SHASUMS256.txt" | grep " $NODE_TAR\$" | sha256sum -c -)
  rm -rf /opt/node && mkdir -p /opt/node && tar -xJf "/tmp/$NODE_TAR" -C /opt/node --strip-components=1
  export PATH="/opt/node/bin:$PATH"
  # 2 GiB swap so `next build` cannot run out of memory.
  [ -f /swapfile ] || { dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile; }

  status "build: npm ci + next build (5-10 min)"
  cd /opt/src/tbhf-platform
  export NEXT_TELEMETRY_DISABLED=1 HOME=/root
  npm ci --no-audit --no-fund
  npm run build

  status "build: packaging"
  rm -rf /opt/bundle && mkdir -p /opt/bundle/app
  cp -a .next/standalone/. /opt/bundle/app/
  mkdir -p /opt/bundle/app/.next && cp -a .next/static /opt/bundle/app/.next/static
  [ -d public ] && cp -a public /opt/bundle/app/public
  cp -a /opt/node /opt/bundle/node
  rm -rf /opt/bundle/node/include /opt/bundle/node/share   # headers/docs not needed at runtime
  echo "$APP_VERSION" > /opt/bundle/BUILD_VERSION
  tar -czf "/tmp/app-$APP_VERSION.tar.gz" -C /opt/bundle .
  aws s3 cp "/tmp/app-$APP_VERSION.tar.gz" "s3://$APP_BUCKET/app/app-$APP_VERSION.tar.gz" --only-show-errors
  status "build: uploaded app-$APP_VERSION.tar.gz ($(du -h "/tmp/app-$APP_VERSION.tar.gz" | cut -f1))"
fi

# Database jobs need the connection settings written by scripts/deploy.sh.
if [[ ",$MODE," == *,dbinit,* || ",$MODE," == *,backup,* ]]; then
  aws s3 cp "s3://$APP_BUCKET/config/ops.env" /root/ops.env --only-show-errors
  set -a; . /root/ops.env; set +a       # PGHOST PGUSER PGPASSWORD … APP_DB_PASSWORD SEED_PASSWORD ADMIN_CODE
  status "waiting for the database to accept connections"
  for _ in $(seq 1 60); do pg_isready -q && break; sleep 10; done   # up to 10 min
  pg_isready
fi

# ---------------------------------------------------------------- dbinit
if [[ ",$MODE," == *,dbinit,* ]]; then
  DB=/opt/src/deploy/aws/db
  if [ "$(psql -tAc "select to_regclass('public.profiles') is not null")" = "t" ]; then
    if [ "$(psql -tAc "select exists (select 1 from public.profiles)")" = "t" ]; then
      status "dbinit: database already loaded — skipping"
    else
      # The schema is there but the data never arrived (an earlier import failed).
      status "dbinit: half-loaded database found — run ./scripts/teardown.sh --no-backup, then deploy.sh"
      false
    fi
  elif aws s3 ls "s3://$APP_BUCKET/import/restore/schema-public.sql" >/dev/null 2>&1; then
    status "dbinit: restoring your latest backup"
    mkdir -p /opt/restore && aws s3 cp "s3://$APP_BUCKET/import/restore/" /opt/restore/ --recursive --only-show-errors
    bash "$DB/import.sh" restore /opt/restore 2>&1 | tee /var/log/tbhf-import.log
  else
    status "dbinit: importing the original export (schema.sql + data.sql)"
    mkdir -p /opt/import
    aws s3 cp "s3://$APP_BUCKET/import/schema.sql" /opt/import/schema.sql --only-show-errors
    aws s3 cp "s3://$APP_BUCKET/import/data.sql"   /opt/import/data.sql   --only-show-errors
    bash "$DB/import.sh" original /opt/import/schema.sql /opt/import/data.sql 2>&1 | tee /var/log/tbhf-import.log
  fi
  status "dbinit: done"
fi

# ---------------------------------------------------------------- backup
if [[ ",$MODE," == *,backup,* ]]; then
  status "backup: pg_dump"
  OUT=/opt/backup && rm -rf "$OUT" && mkdir -p "$OUT"
  pg_dump --schema=public --schema-only --no-owner --no-privileges -f "$OUT/schema-public.sql"
  pg_dump --schema=public --data-only   --no-owner --no-privileges -f "$OUT/data-public.sql"
  pg_dump --table=auth.users --data-only --no-owner --no-privileges -f "$OUT/data-auth-users.sql"
  aws s3 cp "$OUT/" "s3://$APP_BUCKET/backups/$RUN_ID/" --recursive --only-show-errors
  status "backup: uploaded to backups/$RUN_ID/"
fi

status "DONE"
