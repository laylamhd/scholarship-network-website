#!/usr/bin/env bash
# =============================================================================
# ops-task.sh — runs inside the ops container (an ECS Fargate task).
#
#   dbinit   load the Supabase export into an EMPTY database
#            (skips if the data is already there, e.g. after start.sh restored
#            the database from a snapshot)
#   check    run the 12 security/consistency checks only
#   reset    DELETE all website data (only with CONFIRM=delete-everything),
#            to retry a failed import
#
# Connection: PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD (RDS master user;
# the password is injected by ECS from the RDS-managed Secrets Manager secret).
# Also: APP_DB_PASSWORD SEED_PASSWORD ADMIN_CODE (from the app secret) and
# IMPORT_BUCKET (S3 bucket holding import/schema.sql and import/data.sql).
# Output goes to CloudWatch Logs (log group /tbhf/ops).
# =============================================================================
set -Eeuo pipefail
MODE="${1:-dbinit}"
DB=/opt/tbhf/db
echo "== ops task: $MODE  (database $PGHOST)"

for _ in $(seq 1 30); do pg_isready -q && break; echo "waiting for the database…"; sleep 10; done
pg_isready

loaded() { [ "$(psql -X -tAc "select to_regclass('public.profiles') is not null and exists (select 1 from public.profiles)" 2>/dev/null || echo f)" = "t" ]; }
half_loaded() { [ "$(psql -X -tAc "select to_regclass('public.profiles') is not null")" = "t" ]; }

case "$MODE" in
  dbinit)
    if loaded; then
      echo "== data already present — nothing to import"
      psql -X -f "$DB/90-verify.sql"
      exit 0
    fi
    if half_loaded; then
      echo "!! the schema exists but has no data (an earlier import failed)."
      echo "!! Run: ./scripts/run-ops.sh reset   then   ./scripts/run-ops.sh dbinit"
      exit 3
    fi
    : "${IMPORT_BUCKET:?}" "${APP_DB_PASSWORD:?}" "${SEED_PASSWORD:?}" "${ADMIN_CODE:?}"
    mkdir -p /tmp/import
    aws s3 cp "s3://$IMPORT_BUCKET/import/schema.sql" /tmp/import/schema.sql --only-show-errors
    aws s3 cp "s3://$IMPORT_BUCKET/import/data.sql"   /tmp/import/data.sql   --only-show-errors
    bash "$DB/import.sh" original /tmp/import/schema.sql /tmp/import/data.sql
    rm -rf /tmp/import
    ;;
  check)
    psql -X -f "$DB/90-verify.sql"
    ;;
  reset)
    [ "${CONFIRM:-}" = "delete-everything" ] || { echo "refusing: set CONFIRM=delete-everything" >&2; exit 1; }
    psql -X -v ON_ERROR_STOP=1 <<'SQL'
drop schema if exists public cascade;
drop schema if exists auth cascade;
drop schema if exists extensions cascade;
create schema public;
SQL
    echo "== database emptied"
    ;;
  *) echo "unknown mode $MODE" >&2; exit 1 ;;
esac
echo "== ops task finished: $MODE"
