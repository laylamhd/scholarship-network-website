#!/usr/bin/env bash
# =============================================================================
# status.sh — what is running, is it healthy, what has it cost this month.
# =============================================================================
. "$(dirname "$0")/lib.sh"
step "Stacks"
echo "  $FOUNDATION: $(stack_status "$FOUNDATION")"
R=$(stack_status "$RUNTIME"); echo "  $RUNTIME:    $R"

if [[ "$R" == *_COMPLETE && "$R" != DELETE_COMPLETE ]]; then
  CLUSTER=$(out "$RUNTIME" ClusterName); SERVICE=$(out "$RUNTIME" WebServiceName)
  echo "  Website:    $(out "$RUNTIME" SiteUrl)"
  echo "  Version:    $(param "$RUNTIME" ImageTag)"
  step "Website containers (ECS service $SERVICE)"
  aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
    --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,rollout:deployments[0].rolloutState}' --output table
  step "Load balancer targets"
  aws elbv2 describe-target-health --target-group-arn "$(out "$RUNTIME" TargetGroupArn)" \
    --query 'TargetHealthDescriptions[].[Target.Id,Target.AvailabilityZone,TargetHealth.State]' --output table
  step "Database"
  aws rds describe-db-instances --db-instance-identifier "$PROJECT-db" \
    --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass,EngineVersion,MultiAZ,AvailabilityZone,SecondaryAvailabilityZone]' --output table
  step "Alarms"
  aws cloudwatch describe-alarms --alarm-name-prefix "$PROJECT-" --query 'MetricAlarms[].[AlarmName,StateValue]' --output table
  echo "  Site check: GET /login → HTTP $(curl -s -o /dev/null -w '%{http_code}' "$(out "$RUNTIME" SiteUrl)/login" || true)"
else
  echo "  The website is stopped. Latest saved data: $(latest_snapshot || true)"
fi

step "Cost so far this month (from Cost Explorer; credits are applied on the bill)"
FROM=$(date -u +%Y-%m-01); TO=$(date -u -d tomorrow +%Y-%m-%d)
aws ce get-cost-and-usage --time-period "Start=$FROM,End=$TO" --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?to_number(Metrics.UnblendedCost.Amount) > `0.01`].[Keys[0],Metrics.UnblendedCost.Amount]' \
  --output table 2>/dev/null || echo "  (Cost Explorer is not ready yet — it switches on about 24 h after the account is created)"
echo
echo "  Logs: CloudWatch → Log groups → /$PROJECT/web, /$PROJECT/ops, /aws/lambda/$PROJECT-reminders"
echo "  Into a running container: aws ecs execute-command --cluster $PROJECT-cluster --task <task-id> --container web --interactive --command sh"
