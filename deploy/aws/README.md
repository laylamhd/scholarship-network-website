# TBHF Scholars Network on AWS (AWS Academy sandbox)

This folder hosts the website on AWS **without Supabase**. It exists only on the
`aws-deployment` branch; `main` is unchanged and still runs on Supabase.

```
Browser ──HTTPS──► CloudFront ──► Application Load Balancer ──► Auto Scaling group
                    (CDN, TLS)     (public subnets, 2 AZs)       2× EC2 t3.small, Next.js :3000
                                                                    │            │
                                         Amazon S3 (media, builds) ◄┘            ▼
                                                              Amazon RDS for PostgreSQL 17
                                                              (private subnets, no internet)
CloudWatch alarms + dashboard · optional SNS email · temporary "ops" EC2 for build / import / backup
```

| Was (Supabase)            | Now (AWS)                                                                   |
|---------------------------|-----------------------------------------------------------------------------|
| Postgres + PostgREST      | Amazon RDS PostgreSQL; `lib/aws/postgrest.ts` runs the same queries in SQL  |
| Row Level Security        | unchanged — same 221 policies, `auth.uid()` set per request (`lib/aws/db.ts`) |
| Supabase Auth             | app-owned: bcrypt hashes in `auth.users`, signed session cookie (`lib/aws/auth.ts`) — Cognito is blocked in the sandbox |
| Supabase Storage          | Amazon S3, served by the app at `/media/...` with the same bucket rules     |
| pg_cron reminder job      | hourly timer in `instrumentation.ts`                                        |
| Vercel hosting            | CloudFront → ALB → EC2 Auto Scaling                                          |

## Files

| Path | What it is |
|------|------------|
| `config.sh` | settings (region, sizes, alert email) |
| `cloudformation/tbhf.yaml` | the whole infrastructure as one template |
| `scripts/00-check-sandbox.sh` | **every session first** — checks CloudShell, picks the instance profile |
| `scripts/01-setup-once.sh` | **once** — secrets, stores the Supabase export, copies Supabase Storage files |
| `scripts/deploy.sh` | builds/rebuilds everything for the session (idempotent) |
| `scripts/update-app.sh` | `git pull` + deploy; replaces servers one at a time |
| `scripts/backup.sh` | **before the timer ends** — database + media → CloudShell |
| `scripts/status.sh` | what is running, health, where the logs are |
| `scripts/teardown.sh` | backup, then delete everything |
| `ops/ops.sh` | runs on the temporary ops instance (build / dbinit / backup) |
| `ops/web-boot.sh` | runs on every web server at boot |
| `db/*.sql`, `db/import.sh` | database bootstrap, import of the Supabase export, restore, checks |

## Every session (CloudShell, us-east-1)

```bash
cd ~/scholarship-network-website && git pull
cd deploy/aws
./scripts/00-check-sandbox.sh
./scripts/deploy.sh          # 25–40 min the first time in a session
# … use / demo the site …
./scripts/backup.sh          # before the sandbox timer ends
```

First time only, before `deploy.sh`: upload `schema.sql` and `data.sql` with
CloudShell **Actions → Upload file**, then `./scripts/01-setup-once.sh`.

## Sandbox rules this design follows

- us-east-1 only; everything is deleted when the session ends → one
  CloudFormation template rebuilds it, data is restored from the last backup.
- Only the CloudShell home (~1 GB) persists → secrets, backups, media and the
  last two app builds live in `~/tbhf/`.
- `LabRole`/`LabInstanceProfile` missing → EC2 uses `EMR_EC2_DefaultRole`.
- No Session Manager/SSH → logs are shipped to S3 (`status.sh` prints where).
- EC2 ≤ medium (ASG: nano/micro/small), EBS gp2 ≤ 35 GB, RDS single-AZ, no
  Enhanced Monitoring, no instance refresh (servers are replaced one by one).
- No NAT gateway → the database sits in private subnets with no internet
  route; web servers are in public subnets but accept traffic only from the ALB.

## Security notes

- `schema.sql`, `data.sql`, backups and `secrets.env` contain personal data
  and passwords. They never go into git (see `.gitignore`); they travel only
  CloudShell → private, encrypted S3 bucket → ops instance.
- The exported admin access code is replaced by a new one (`ADMIN_CODE`).
- The sign-up trigger is fixed so a new account can no longer give itself the
  `admin` role (`db/55-fix-signup-role.sql`). **Apply the same fix to the live
  Supabase project** and rotate its admin code.
- Imported members get the temporary password `SEED_PASSWORD` (Supabase
  password hashes are not in the export). There is no email service in the
  sandbox, so new sign-ups are confirmed immediately and email links are off.
