#!/usr/bin/env bash
# =============================================================================
# ops/web-boot.sh — runs as root on EVERY web server when it starts
# (the launch template's user-data downloads it from S3 and runs it).
#
#  1. downloads the app bundle  s3://<AppBucket>/app/app-<version>.tar.gz
#     (Next.js standalone server + its own Node.js runtime — nothing to install)
#  2. downloads the runtime settings s3://<AppBucket>/config/app.env
#  3. installs a systemd service on port 3000 and starts it
#  4. copies its boot log and, every 5 minutes, the app log to S3
#     (the sandbox has no Session Manager, so S3 is where you read logs)
# Needs: APP_BUCKET APP_VERSION AWS_REGION
# =============================================================================
set -euo pipefail
: "${APP_BUCKET:?}" "${APP_VERSION:?}" "${AWS_REGION:?}"
export AWS_DEFAULT_REGION="$AWS_REGION"
TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
IID=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
LOGS="s3://$APP_BUCKET/logs/web/$IID"
trap 'aws s3 cp /var/log/tbhf-boot.log "$LOGS/boot.log" --only-show-errors || true' EXIT

echo "== app bundle $APP_VERSION"
mkdir -p /opt/tbhf /etc/tbhf
aws s3 cp "s3://$APP_BUCKET/app/app-$APP_VERSION.tar.gz" /tmp/app.tar.gz --only-show-errors
rm -rf /opt/tbhf/current && mkdir -p /opt/tbhf/current
tar -xzf /tmp/app.tar.gz -C /opt/tbhf/current
/opt/tbhf/current/node/bin/node -v

echo "== settings"
aws s3 cp "s3://$APP_BUCKET/config/app.env" /etc/tbhf/app.env --only-show-errors
# Amazon RDS certificate bundle, so the database connection is verified TLS.
if curl -sf -o /etc/tbhf/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem; then
  echo "PGSSLROOTCERT=/etc/tbhf/rds-ca.pem" >> /etc/tbhf/app.env
fi
id tbhf >/dev/null 2>&1 || useradd --system --home-dir /opt/tbhf --shell /sbin/nologin tbhf
chown -R tbhf:tbhf /opt/tbhf
chown root:tbhf /etc/tbhf/app.env && chmod 640 /etc/tbhf/app.env

echo "== service"
cat > /etc/systemd/system/tbhf-web.service <<'UNIT'
[Unit]
Description=TBHF Scholars Network (Next.js standalone)
After=network-online.target
Wants=network-online.target

[Service]
User=tbhf
WorkingDirectory=/opt/tbhf/current/app
EnvironmentFile=/etc/tbhf/app.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/opt/tbhf/current/node/bin/node /opt/tbhf/current/app/server.js
Restart=always
RestartSec=3
StandardOutput=append:/var/log/tbhf-web.log
StandardError=append:/var/log/tbhf-web.log

[Install]
WantedBy=multi-user.target
UNIT

# Ship the app log to S3 every 5 minutes.
cat > /etc/systemd/system/tbhf-logship.service <<UNIT
[Unit]
Description=Copy the web log to S3
[Service]
Type=oneshot
ExecStart=/usr/bin/aws s3 cp /var/log/tbhf-web.log $LOGS/web.log --only-show-errors --region $AWS_REGION
UNIT
cat > /etc/systemd/system/tbhf-logship.timer <<'UNIT'
[Unit]
Description=Copy the web log to S3 every 5 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now tbhf-web tbhf-logship.timer

for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login || true)
  [ "$code" = "200" ] && { echo "== READY (GET /login = 200)"; exit 0; }
  sleep 2
done
echo "== app did not answer on :3000"; tail -n 50 /var/log/tbhf-web.log || true
exit 1
