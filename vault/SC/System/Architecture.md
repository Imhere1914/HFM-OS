# System Architecture — Simple Connect OS

## Stack
| Layer | Technology |
|---|---|
| Frontend | Vite 6 + React 19 + TanStack Router (file-based routes) |
| UI | Tailwind CSS 3 + shadcn/ui |
| Backend | Hono (Node.js) — lightweight API server |
| Data | File-backed JSON at `/var/lib/ai-os/sc/` |
| AI | OpenRouter API (Claude / GPT models) |
| Email | Resend API |
| Payments | Stripe webhooks |
| Hosting | VPS at 2.24.99.83 via nginx reverse proxy |

## Services Running on VPS
| Service | Port | Exposed |
|---|---|---|
| SC AI OS (Hono) | 8787 | Internal only (nginx proxies) |
| HFM AI OS (Hono) | 8788 | Internal only (nginx proxies) |
| nginx | 80, 443 | Public |
| SC website preview | 8090 | Public (preview only) |
| HFM website preview | 8091 | Public (preview only) |

## Domain Routing
- `simpleconnect2.com` / `www.simpleconnect2.com` → `/var/www/sc-website/`
- `os.simpleconnect2.com` → proxy to `127.0.0.1:8787`
- `holisticfunctionalcare.com` → `/var/www/hfm-website/`
- `os.holisticfunctionalcare.com` → proxy to `127.0.0.1:8788`

## Data Flow
```
Browser → nginx (443) → Hono API (8787/8788) → JSON files (/var/lib/ai-os/)
                      ↓
                  Resend (email)
                  OpenRouter (AI)
                  Stripe (payments)
```

## Public Website Architecture
- SC website: separate React SPA at `/opt/sites/sc-website/`
- Deployed to: `/var/www/sc-website/`
- `/api/` path proxied to SC AI OS (127.0.0.1:8787)
- Booking modal calls `/api/calendars/:slug` and `/api/appointments`

## Modules
- Contacts (CRM)
- Conversations (inbox)
- Appointments (calendar booking)
- Campaigns (email marketing)
- Automations
- Invoices
- Projects
- Forms
- Site Studio (website editor)
- Scheduling (multi-calendar)
- Hermes (AI assistant)
- Reports & Analytics
