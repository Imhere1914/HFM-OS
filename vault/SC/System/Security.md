# Security — Simple Connect OS

## Current Security Posture (as of June 2026)

### Network Layer
| Control | Status |
|---|---|
| UFW Firewall | Active — deny all inbound except 22/80/443/8090/8091 |
| fail2ban | Active — SSH brute-force protection |
| Backend ports (8787/8788) | Blocked externally — nginx-only access |
| SSL/TLS | Let's Encrypt via Certbot (auto-renew) |
| HSTS | 1 year, includeSubDomains |

### HTTP Security Headers
Applied to `simpleconnect2.com` and `os.simpleconnect2.com`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Application Layer
| Control | Implementation |
|---|---|
| Session auth | SHA-256 hashed tokens, 30-day TTL |
| Cookies | HttpOnly, SameSite=Lax, Secure |
| Password check | Timing-safe comparison |
| Rate limiting | Per-IP sliding window on all public write endpoints |
| Webhook integrity | Stripe HMAC-SHA256 + replay protection |
| Secrets | Zero hardcoded — all from env vars |
| Data at rest | 600 permissions — root-only read/write |
| SQL injection | Not applicable — file-based storage, no SQL |

### Public API Rate Limits
- Booking/appointments: 10/min per IP
- Form submissions: 10/min per IP
- Web chat: 20/min per IP
- Login attempts: 10/15min per IP

### Credentials & Secrets
- API keys and credentials in `.env.sc` on VPS — never in code
- `.env` files in `.gitignore`
- Admin secret (`ADMIN_SECRET`) — rotate periodically

## UFW Rules
```
22/tcp   ALLOW  # SSH
80/tcp   ALLOW  # HTTP
443/tcp  ALLOW  # HTTPS
8090/tcp ALLOW  # SC website preview
8091/tcp ALLOW  # HFM website preview
DEFAULT  DENY   # Everything else
```

## Checklist for New Deployments
- [ ] Confirm `.env` not committed to git
- [ ] Confirm UFW is active after reboot
- [ ] Confirm SSL cert valid (certbot renew --dry-run)
- [ ] Confirm fail2ban running
- [ ] Rotate `AUTH_PASSWORD` and `ADMIN_SECRET` if sharing access
