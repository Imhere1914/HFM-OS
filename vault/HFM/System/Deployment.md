# Deployment Guide — HFM OS

## VPS Access
```bash
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83
```

## Deploy HFM AI OS
```bash
# From local ai-os directory
cd ~/ai-os && npm run build

# Deploy server
rsync -avz --exclude='.env.*' --exclude='.env' \
  server/ root@2.24.99.83:/opt/ai-os/server/
rsync -avz --delete dist/ root@2.24.99.83:/opt/ai-os/dist/

# Restart HFM service only
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83 \
  "systemctl restart ai-os-hfm.service"
```

## Deploy HFM Website
```bash
ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83
cd /opt/sites/hfm-website && npm run build
rsync -a --delete dist/ /var/www/hfm-website/
```

## Environment Variables
File: `/opt/ai-os/.env.hfm`
- `BRAND=hfm`
- `AIOS_DATA_DIR=/var/lib/ai-os/hfm`
- `AUTH_EMAIL` / `AUTH_PASSWORD`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`

## GitHub Push
```bash
git push hfm main
```
