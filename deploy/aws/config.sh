# shellcheck shell=bash disable=SC2034
# =============================================================================
# config.sh — the few settings you may want to change. Read by every script.
# =============================================================================

# The AWS Academy sandbox only allows us-east-1.
AWS_REGION="us-east-1"

# CloudFormation stack name (also the prefix of every resource name).
STACK="tbhf"

# Web tier: 2 servers in two Availability Zones (the Auto Scaling group may add a 3rd).
# Sandbox limits: Auto Scaling groups may only use nano / micro / small.
WEB_INSTANCE_TYPE="t3.small"
WEB_COUNT=2

# Database. Sandbox limits: nano–medium classes, gp2 storage, single-AZ only.
DB_INSTANCE_CLASS="db.t3.micro"
DB_ENGINE_VERSION="17.6"

# The short-lived instance that builds the app / loads / backs up the database.
# Sandbox limit for plain EC2: up to *.medium.
OPS_INSTANCE_TYPE="t3.medium"

# Optional: an email address for CloudWatch alarm notifications (SNS).
# You must click "Confirm subscription" in the email every session.
ALERT_EMAIL=""

# Where everything that must survive the end of a sandbox session lives.
# Only the CloudShell home directory persists (about 1 GB in total).
TBHF_HOME="$HOME/tbhf"
