# Security — HFM OS

## Shared Security Infrastructure
HFM runs on the same VPS as SC and shares all VPS-level security:
- UFW firewall (active)
- fail2ban (SSH protection)
- SSL/TLS via Let's Encrypt
- nginx security headers on `holisticfunctionalcare.com`

## HTTP Security Headers
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Data Isolation
HFM data is completely isolated from SC data:
- Data path: `/var/lib/ai-os/hfm/` (vs `/var/lib/ai-os/sc/`)
- Separate systemd service: `ai-os-hfm.service` on port 8788
- Separate `.env.hfm` file with HFM-specific credentials
- Auth middleware enforces `brand=hfm` context

## Health Data Considerations
HFM handles patient/health-related information. Additional considerations:
- All data files at `/var/lib/ai-os/hfm/` are `600` permissions
- No health data is sent to third parties without consent
- Patient phone numbers and emails stored with same protections as SC
- Consider HIPAA alignment if handling PHI (consult legal counsel)

## Patient SMS Consent
Any SMS communications to patients must have explicit consent.
See [[Business/Patient Communications]] for opt-in setup.
