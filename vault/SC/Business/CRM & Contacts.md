# CRM & Contacts — Simple Connect

## Contact Sources
Contacts enter the CRM from:
- **Website booking form** — auto-created from booking submission
- **Manual entry** — via OS Contacts screen
- **Form submissions** — website contact forms trigger contact creation
- **CSV import** — bulk upload via Contacts screen
- **Web chat** — chat widget conversations

## Contact Fields
- Name, Email, Phone
- Company, Tags, Source, Status
- Lead Score (AI-powered)
- Custom fields
- Notes (timeline)
- Linked appointments, conversations, invoices

## Lead Scoring
AI automatically scores contacts based on:
- Engagement (email opens, replies)
- Appointment history
- Invoice history
- Communication frequency

## Contact Deduplication
- Built-in duplicate scanner (Contacts → Dedup)
- Merge contacts without data loss
- Email-based matching on booking (auto-links to existing contact)

## Automation Triggers
| Trigger | What fires |
|---|---|
| `new_appointment` | Fires when booking is created |
| `contact.created` | Fires when new contact is added |
| Form submission | Fires automation sequence |

## Data Export
- CSV export available from Contacts screen
- Filtered by tag, status, source, or date range

## Data Storage
- File: `/var/lib/ai-os/sc/contacts.json`
- Permissions: 600 (root-only)
- Backup: committed to GitHub via vault sync
