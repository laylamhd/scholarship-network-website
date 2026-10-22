# TBHF Scholars Network on your own AWS account

This folder deploys the website to a normal AWS account (free plan), using
AWS services wherever the site has a job for one. The older `deploy/aws/`
folder is the AWS Academy sandbox version, kept for reference.

```
Browser ─HTTPS─► CloudFront (+ AWS WAF) ─┬─► /media/<public>/* ─► S3 media bucket (Origin Access Control)
                                         └─► everything else  ─► Application Load Balancer (public subnets)
                                                                    │  only requests with CloudFront's secret header
                                                                    ▼
                                                   ECS service on AWS Fargate (private subnets, 2 AZs, 2–4 containers)
                                                        │                      │
                                         RDS PostgreSQL 17 (Multi-AZ,     S3 media · SES e-mail
                                         isolated subnets, KMS-encrypted)
EventBridge Scheduler ─hourly─► Lambda (reminders) ─► RDS
```

## Two stacks, so you only pay while you use it

| Stack | File | Contains | Cost |
|---|---|---|---|
| `tbhf-foundation` | `cloudformation/foundation.yaml` | KMS key, Secrets Manager (6 secrets), S3 media + artifacts buckets, ECR (web, ops), CodeBuild, optional CodePipeline + GitHub connection, SES sender, SNS alerts, AWS Budgets, CloudTrail, GuardDuty, AWS Backup vault | a few $ / month |
| `tbhf-runtime` | `cloudformation/runtime.yaml` | VPC (public / app / database subnets × 2 AZs), NAT gateway, S3 endpoint, VPC Flow Logs, security groups, ALB, ECS cluster + Fargate service + auto scaling, ops task, RDS Multi-AZ, AWS Backup plan, Lambda + EventBridge Scheduler, CloudFront + CloudFront Function + Origin Access Control + response-headers policy, AWS WAF, CloudWatch alarms + dashboard | roughly $4–5 / day while running |

`stop.sh` deletes the runtime stack after CloudFormation snapshots the database;
`start.sh` recreates it from that snapshot.

## Commands (AWS CloudShell, from this folder)

| When | Command |
|---|---|
| Once | edit `config.sh` (ALERT_EMAIL, SENDER_EMAIL), upload `schema.sql` + `data.sql`, `./scripts/setup.sh` |
| After each code change (commit first) | `./scripts/build.sh` |
| Bring the site up / roll out the newest build | `./scripts/start.sh` |
| Check health and cost | `./scripts/status.sh` |
| Database jobs | `./scripts/run-ops.sh check` · `dbinit` · `reset` |
| Not using it | `./scripts/stop.sh` |
| End of project | `./scripts/destroy-all.sh`, then close the account |

## What changed in the app for this edition

- `Dockerfile` (Next.js standalone, Node 22, non-root, RDS CA bundle) and `ops/Dockerfile` (psql 17 + import scripts).
- Database login from `PGHOST` / `PGUSER` / `PGPASSWORD`; the password is injected by ECS from Secrets Manager.
- "Forgot password?" by e-mail through Amazon SES (`lib/aws/password-reset.ts`, `app/forgot-password`, `app/reset-password`): one-time, hashed, 60-minute tokens; max 3 per hour; resets log out other sessions.
- Hourly reminders moved from the web servers to a Lambda run by EventBridge Scheduler (`REMINDERS_MODE=external`).
- Public media folders are served by CloudFront straight from S3; members-only folders still go through the website's permission check.

## Notes

- SES starts in sandbox mode: it only delivers to verified addresses until you request production access (SES console → Account dashboard).
- During the load-test experiment set `WAF_RATE_ACTION="Count"` in `config.sh` and run `start.sh`, otherwise AWS WAF blocks your CloudShell after 2,000 requests in 5 minutes.
- `stop.sh` can take 20+ minutes: Lambda network interfaces inside a VPC are released slowly.
- Never commit `schema.sql`, `data.sql` or anything from `~/tbhf-aws/`.
