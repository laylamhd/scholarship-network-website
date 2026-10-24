#!/usr/bin/env bash
# =============================================================================
# db/import.sh — load the database into Amazon RDS for PostgreSQL.
# Runs on the short-lived "ops" EC2 instance (ops/ops.sh), which sits inside
# the VPC and can reach RDS. Works against any PostgreSQL 15+ server.
#
#   import.sh original <schema.sql> <data.sql>     first time: the Supabase export
#   import.sh restore  <backup-dir>                 later sessions: a backup.sh dump
#
# Connection: standard libpq variables PGHOST PGPORT PGDATABASE PGUSER
# PGPASSWORD PGSSLMODE (the RDS master user). Also needs:
#   APP_DB_PASSWORD  password for the website's login role tbhf_app
#   SEED_PASSWORD    (original only) password for every imported account
#   ADMIN_CODE       (original only) new admin access code
#
# Why the steps look like this — RDS has no true superuser, so unlike the
# Supabase import we cannot pause foreign keys with session_replication_role.
# Instead we (a) disable the app's own triggers per table, which the table
# owner may do, (b) drop the two foreign keys that point at auth.users while
# the data loads, then (c) create the login accounts and re-add the keys.
# =============================================================================
set -euo pipefail
MODE="${1:?usage: import.sh original <schema.sql> <data.sql> | restore <backup-dir>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
: "${APP_DB_PASSWORD:?set APP_DB_PASSWORD}"

PSQL=(psql -X -q -v ON_ERROR_STOP=1)
run() {  # run <file> [psql args...]
  local f="$1"; shift
  echo "  -> $(basename "$f")"
  "${PSQL[@]}" "$@" -f "$f"
}

# Lines every pg_dump file may carry that a different server version rejects
# (psql 17 meta-commands, and a setting PostgreSQL 15/16 do not know).
clean_dump() {
  sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^SET transaction_timeout = /d' "$1"
}
# Remove statements a fresh RDS database must not (or need not) run.
clean_schema() {
  sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^SET transaction_timeout = /d' \
      -e '/^CREATE SCHEMA public;$/d' -e '/^COMMENT ON SCHEMA public IS /d' \
      -e '/^CREATE EXTENSION /d' -e '/^COMMENT ON EXTENSION /d' "$1"
}

cat > "$WORK/before-data.sql" <<'SQL'
-- Pause what would fire while rows are copied in:
-- the app's triggers (they would re-moderate content and send notifications)...
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable trigger user', t.tablename);
  end loop;
end $$;
-- ...and the two foreign keys to auth.users (accounts are created after the data).
alter table public.profiles         drop constraint if exists profiles_id_fkey;
alter table public.survey_responses drop constraint if exists survey_responses_respondent_id_fkey;
SQL

cat > "$WORK/after-data.sql" <<'SQL'
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
alter table public.survey_responses add constraint survey_responses_respondent_id_fkey
  foreign key (respondent_id) references auth.users(id) on delete cascade;
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable trigger user', t.tablename);
  end loop;
end $$;
analyze auth.users;
SQL

echo "[1/6] Bootstrap: roles, extensions, auth schema"
run "$HERE/00-bootstrap.sql" -v app_password="$APP_DB_PASSWORD"

case "$MODE" in
  original)
    SCHEMA_IN="${2:?schema.sql}"; DATA_IN="${3:?data.sql}"
    : "${SEED_PASSWORD:?set SEED_PASSWORD}"; : "${ADMIN_CODE:?set ADMIN_CODE}"
    clean_schema "$SCHEMA_IN" > "$WORK/schema.sql"
    clean_dump "$DATA_IN" > "$WORK/data.sql"

    echo "[2/6] Schema (tables, functions, RLS policies, triggers)"
    run "$WORK/schema.sql" --single-transaction -o /dev/null
    echo "[3/6] Data + login accounts (one transaction: all or nothing)"
    cat "$WORK/before-data.sql" "$WORK/data.sql" "$HERE/40-seed-users.sql" "$WORK/after-data.sql" > "$WORK/load.sql"
    run "$WORK/load.sql" --single-transaction -o /dev/null -v seed_password="$SEED_PASSWORD"
    echo "[4/6] Privileges"
    run "$HERE/15-baseline-grants.sql"
    run "$HERE/20-privileges.sql" --single-transaction
    echo "[5/6] Auth trigger, media URLs, admin code, security fix"
    run "$HERE/41-auth-trigger.sql"
    run "$HERE/45-media-urls.sql"
    run "$HERE/50-rotate-admin-code.sql" -v admin_code="$ADMIN_CODE"
    run "$HERE/55-fix-signup-role.sql"
    ;;

  restore)
    DIR="${2:?backup directory}"
    for f in schema-public.sql data-public.sql data-auth-users.sql; do
      [ -f "$DIR/$f" ] || { echo "missing $DIR/$f" >&2; exit 1; }
    done
    clean_schema "$DIR/schema-public.sql" > "$WORK/schema.sql"
    echo "[2/6] Schema from backup"
    run "$WORK/schema.sql" --single-transaction -o /dev/null
    echo "[3/6] Data from backup"
    clean_dump "$DIR/data-auth-users.sql" > "$WORK/auth.sql"
    clean_dump "$DIR/data-public.sql"     > "$WORK/data.sql"
    cat "$WORK/before-data.sql" "$WORK/auth.sql" "$WORK/data.sql" "$WORK/after-data.sql" > "$WORK/load.sql"
    run "$WORK/load.sql" --single-transaction -o /dev/null
    echo "[4/6] Privileges"
    run "$HERE/15-baseline-grants.sql"
    run "$HERE/20-privileges.sql" --single-transaction
    echo "[5/6] Auth trigger + security fix"
    run "$HERE/41-auth-trigger.sql"
    run "$HERE/55-fix-signup-role.sql"
    ;;
  *) echo "unknown mode $MODE" >&2; exit 1 ;;
esac

echo "[6/6] Verification"
REPORT=$("${PSQL[@]}" -f "$HERE/90-verify.sql")
echo "$REPORT"
if echo "$REPORT" | grep -q '| FAIL'; then
  echo "IMPORT FINISHED WITH FAILED CHECKS" >&2; exit 2
fi
echo "Import finished — all checks PASS."
