# Deployment Guide — Simple Connect OS

## VPS Access
```bash
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83
```

## Deploy AI OS (Code Changes)
```bash
# From local ai-os directory
cd ~/ai-os

# Build
npm run build

# Deploy server files (excludes .env)
rsync -avz --exclude='.env.*' --exclude='.env' \
  server/ root@2.24.99.83:/opt/ai-os/server/

# Deploy frontend build
rsync -avz --delete \
  dist/ root@2.24.99.83:/opt/ai-os/dist/

# Restart services
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83 \
  "systemctl restart ai-os-sc.service ai-os-hfm.service"
```

## Deploy SC Website (Public Site)
```bash
# SSH into VPS
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83

# Build
cd /opt/sites/sc-website && npm run build

# Deploy to nginx root
rsync -a --delete dist/ /var/www/sc-website/
```

## Site Studio (AI-Powered Edits)
- Access via OS at `os.simpleconnect2.com` → Site Studio
- AI edits files in `/opt/sites/sc-website/src/`
- Auto-builds and rsyncs to `/var/www/sc-website/`

## Service Management
```bash
# Check service status
systemctl status ai-os-sc.service
systemctl status ai-os-hfm.service

# View logs
journalctl -u ai-os-sc.service -f
journalctl -u ai-os-hfm.service -f

# Restart
systemctl restart ai-os-sc.service
```

## Environment Variables (VPS)
Located at `/opt/ai-os/.env.sc` for SC, `.env.hfm` for HFM.
Key vars:
- `AUTH_EMAIL` / `AUTH_PASSWORD` — OS login
- `ADMIN_SECRET` — admin panel access
- `RESEND_API_KEY` — email sending
- `ANTHROPIC_API_KEY` — Claude AI
- `STRIPE_WEBHOOK_SECRET` — Stripe webhooks
- `BRAND=sc` — brand selector
- `AIOS_DATA_DIR=/var/lib/ai-os/sc` — data directory

## GitHub Push
```bash
# Push SC code
git push origin main

# Push HFM code
git push hfm main
```
