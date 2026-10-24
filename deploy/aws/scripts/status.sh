#!/usr/bin/env bash
# =============================================================================
# status.sh — what is running right now, and where to find logs.
# =============================================================================
. "$(dirname "$0")/lib.sh"
S="$(stack_status)"
step "Stack $STACK: $S"
[[ "$S" == *COMPLETE* && "$S" != DELETE_COMPLETE ]] || exit 0
load_outputs
echo "  Website      $SiteUrl"
echo "  App version  $(stack_param AppVersion)"
echo "  App bucket   $AppBucket"

step "Web servers (Auto Scaling group $AsgName)"
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$AsgName" \
  --query 'AutoScalingGroups[0].Instances[].[InstanceId,AvailabilityZone,LifecycleState,HealthStatus,InstanceType]' \
  --output table
step "Load balancer targets"
aws elbv2 describe-target-health --target-group-arn "$WebTargetGroupArn" \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]' --output table
step "Database"
aws rds describe-db-instances --db-instance-identifier "$STACK-db" \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass,EngineVersion,AllocatedStorage,MultiAZ]' --output table
step "Ops instances (should normally be none)"
aws ec2 describe-instances --filters "Name=tag:Name,Values=$STACK-ops-*" Name=instance-state-name,Values=pending,running,stopping \
  --query "Reservations[].Instances[].[InstanceId,State.Name,LaunchTime]" --output table
step "Alarms"
aws cloudwatch describe-alarms --alarm-name-prefix "$STACK-" \
  --query 'MetricAlarms[].[AlarmName,StateValue]' --output table
step "Site check"
echo "  GET $SiteUrl/login → HTTP $(curl -s -o /dev/null -w '%{http_code}' "$SiteUrl/login" || true)"
step "Logs"
echo "  web servers:  aws s3 ls s3://$AppBucket/logs/web/ --recursive"
echo "                aws s3 cp s3://$AppBucket/logs/web/<instance-id>/web.log - | tail -50"
echo "  ops jobs:     aws s3 ls s3://$AppBucket/ops/"
echo "  backups:      $(readlink "$TBHF_HOME/backups/latest" 2>/dev/null || echo none)"
