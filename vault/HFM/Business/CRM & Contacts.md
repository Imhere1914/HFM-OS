# CRM & Contacts — HFM

## Patient Contact Sources
- **Website booking** — auto-created from consultation booking
- **Manual entry** — via OS Contacts screen
- **Form submissions** — intake forms
- **Web chat** — chat widget conversations

## Contact Fields
- Name, Email, Phone
- Company/Practice affiliation
- Tags (e.g., "new-patient", "follow-up", "wellness")
- Source, Status, Lead Score
- Custom fields for health intake data
- Notes timeline

## Tagging Recommendations
| Tag | Use |
|---|---|
| `new-patient` | First consultation booked |
| `returning` | Has had prior appointments |
| `no-show` | Missed appointment |
| `follow-up-needed` | Needs practitioner follow-up |

## Data Location
- File: `/var/lib/ai-os/hfm/contacts.json`
- Permissions: 600
- Backed up to: https://github.com/Imhere1914/HFM-OS (vault branch)
