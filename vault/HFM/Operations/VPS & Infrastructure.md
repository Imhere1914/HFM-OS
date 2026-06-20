# VPS & Infrastructure — HFM

## Server
- **IP:** 2.24.99.83 (shared with SC)
- **SSH:** `ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83`

## HFM-Specific Paths
| Path | Purpose |
|---|---|
| `/opt/ai-os/.env.hfm` | HFM environment variables |
| `/opt/sites/hfm-website/` | HFM website source |
| `/var/www/hfm-website/` | HFM website nginx root |
| `/var/lib/ai-os/hfm/` | HFM data (patients, appointments, etc.) |

## Service
- `ai-os-hfm.service` — Hono backend on port 8788
- Logs: `journalctl -u ai-os-hfm.service -f`

## Nginx Config
- `hfm-website` — holisticfunctionalcare.com → /var/www/hfm-website
- `os-hfm` — os.holisticfunctionalcare.com → proxy 8788

## Security Headers on HFM Website
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS: 1 year
- Permissions-Policy: camera=(), microphone=(), geolocation=()
