# System Architecture — HFM OS

## Stack
| Layer | Technology |
|---|---|
| Frontend | Vite 6 + React 19 + TanStack Router |
| UI | Tailwind CSS 3 + shadcn/ui |
| Backend | Hono (Node.js) |
| Data | File-backed JSON at `/var/lib/ai-os/hfm/` |
| AI | Anthropic Claude (via ANTHROPIC_API_KEY) |
| Email | Resend API |
| Hosting | VPS 2.24.99.83 — nginx reverse proxy |

## Services
| Service | Port | Access |
|---|---|---|
| HFM AI OS (Hono) | 8788 | Internal only (nginx proxies) |
| nginx | 80, 443 | Public |
| HFM website preview | 8091 | Public |

## Domain Routing
- `holisticfunctionalcare.com` / `www.holisticfunctionalcare.com` → `/var/www/hfm-website/`
- `os.holisticfunctionalcare.com` → proxy to `127.0.0.1:8788`

## Key Difference from SC
- Brand: `hfm` (vs `sc`)
- Color theme: `#a3843b` (gold/warm) vs green
- Data directory: `/var/lib/ai-os/hfm/`
- Calendar default: "30 Minute Consultation" vs "30 Minute Meeting"
- Use case: Patient appointments vs business demos
