#!/usr/bin/env bash
# deploy/deploy.sh — push ai-os to VPS and restart the service
# Usage: ./deploy/deploy.sh [sc|hfm]
set -euo pipefail

BRAND="${1:-sc}"
VPS="root@2.24.99.83"
REMOTE_DIR="/opt/ai-os"
SERVICE="ai-os-${BRAND}"

echo "▶ Building for brand: $BRAND …"
BRAND=$BRAND npm run build

echo "▶ Rsyncing to ${VPS}:${REMOTE_DIR} …"
rsync -azP --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='deploy/*.sh' \
  ./ "${VPS}:${REMOTE_DIR}/"

echo "▶ Installing deps on VPS …"
ssh "$VPS" "cd ${REMOTE_DIR} && npm ci --omit=dev"

echo "▶ Installing systemd unit …"
ssh "$VPS" "cp ${REMOTE_DIR}/deploy/${SERVICE}.service /etc/systemd/system/${SERVICE}.service && systemctl daemon-reload"

echo "▶ Restarting ${SERVICE} …"
ssh "$VPS" "systemctl enable ${SERVICE} && systemctl restart ${SERVICE}"

echo "▶ Status:"
ssh "$VPS" "systemctl status ${SERVICE} --no-pager -l | head -20"

echo "✅ Deployed ${BRAND} to ${VPS}"
