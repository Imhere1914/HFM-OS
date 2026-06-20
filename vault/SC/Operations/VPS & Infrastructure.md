# VPS & Infrastructure — Simple Connect

## Server
- **IP:** 2.24.99.83
- **OS:** Ubuntu (nginx 1.24.0)
- **SSH:** `ssh -i ~/.ssh/ai-os-deploy root@2.24.99.83`
- **SSH Key:** `~/.ssh/ai-os-deploy`

## Directory Structure
| Path | Purpose |
|---|---|
| `/opt/ai-os/` | AI OS application code |
| `/opt/ai-os/.env.sc` | SC environment variables |
| `/opt/ai-os/.env.hfm` | HFM environment variables |
| `/opt/sites/sc-website/` | SC website source (editable by Site Studio) |
| `/opt/sites/hfm-website/` | HFM website source |
| `/var/www/sc-website/` | SC website nginx root (built assets) |
| `/var/www/hfm-website/` | HFM website nginx root |
| `/var/lib/ai-os/sc/` | SC data files (contacts, appointments, etc.) |
| `/var/lib/ai-os/hfm/` | HFM data files |

## Services (systemd)
- `ai-os-sc.service` — SC Hono backend on port 8787
- `ai-os-hfm.service` — HFM Hono backend on port 8788
- `nginx` — Reverse proxy + static file serving
- `fail2ban` — SSH brute-force protection

## Firewall (UFW)
Active — deny all inbound except:
- 22 (SSH)
- 80 (HTTP → nginx redirects to HTTPS)
- 443 (HTTPS)
- 8090 (SC website preview)
- 8091 (HFM website preview)

## SSL
- Provider: Let's Encrypt (Certbot)
- Domains: simpleconnect2.com, os.simpleconnect2.com
- Auto-renewal via certbot timer

## Nginx Configs (sites-available)
- `sc-website` — simpleconnect2.com → /var/www/sc-website
- `os-sc` — os.simpleconnect2.com → proxy 8787
- `hfm-website` — holisticfunctionalcare.com → /var/www/hfm-website
- `os-hfm` — os.holisticfunctionalcare.com → proxy 8788
- `ai-os-sc` — port 80 fallback config for SC
- `ai-os-hfm` — port 80 fallback config for HFM

## Data File Permissions
All JSON data files are set to `600` (root read/write only):
```bash
find /var/lib/ai-os -name '*.json' -exec chmod 600 {} \;
```
