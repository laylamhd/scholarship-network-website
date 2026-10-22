# shellcheck shell=bash disable=SC2034
# =============================================================================
# config.sh — your settings. Read by every script in scripts/.
# Edit ALERT_EMAIL (required) and SENDER_EMAIL before the first ./scripts/setup.sh
# =============================================================================

AWS_REGION="us-east-1"          # CloudFront's WAF and certificates live here; cheapest region
PROJECT="tbhf"                  # prefix of every resource name

# --- people ---------------------------------------------------------------
ALERT_EMAIL=""                  # REQUIRED: alarms, budget warnings (confirm the e-mail AWS sends)
SENDER_EMAIL=""                 # password-reset e-mails come from this address (SES verifies it). Can be the same.

# --- money ------------------------------------------------------------------
MONTHLY_BUDGET_USD=40           # AWS Budgets e-mails you at 50%, 80%, 100% and when the forecast passes it

# --- optional services -------------------------------------------------------
ENABLE_GUARDDUTY="true"         # threat detection (30-day free trial, then a few $/month)
ENABLE_PIPELINE="false"         # CodePipeline: deploy every push to GitHub (needs one-time approval in the console)
GITHUB_REPOSITORY="laylamhd/scholarship-network-website"
GITHUB_BRANCH="aws-deployment"

# --- sizes ------------------------------------------------------------------
DB_INSTANCE_CLASS="db.t4g.micro"
DB_MULTI_AZ="true"              # standby copy of the database in the 2nd Availability Zone (doubles DB cost)
WEB_MIN_TASKS=2                 # website containers always running (one per AZ)
WEB_MAX_TASKS=4                 # auto scaling may add up to this many
CONTAINER_INSIGHTS="disabled"   # "enabled" = per-container CloudWatch metrics (small extra cost)
WAF_RATE_LIMIT=2000             # requests / 5 min / IP before AWS WAF blocks
WAF_RATE_ACTION="Block"         # set to "Count" during the load-test experiment, then back

# --- where your files live in CloudShell ------------------------------------
WORK_DIR="$HOME/tbhf-aws"
