# Patient Communications — HFM

## Communication Channels
- **SMS** — appointment reminders, follow-ups
- **Email** — booking confirmations, newsletters, campaigns
- **Web chat** — website chat widget

## SMS Consent
Patients provide SMS consent at the booking form (Step 3).

### Consent Language (shown at booking)
> By booking you agree to receive appointment reminders and service-related SMS from **Holistic Functional Care**. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.

### Important Rules
- Consent is captured at the exact point of phone number collection
- Transactional (appointment reminders) = implied consent from booking
- Marketing/promotional = requires separate unchecked checkbox
- Never send SMS to patients who have replied STOP

## Email Campaigns
Configure in OS → Campaigns:
- From email: set `CAMPAIGN_FROM_EMAIL` in `.env.hfm`
- Templates available for: welcome, follow-up, newsletter, re-engagement

## Automation Sequences
In OS → Automations:
- `new_appointment` trigger → appointment reminder sequence
- Can chain: Day-before reminder → Day-of reminder → Follow-up

## Inbox
All patient SMS/email replies appear in OS → Conversations.
AI-drafted replies available via Hermes assistant.

## Data Privacy
- Patient contact data stored at `/var/lib/ai-os/hfm/contacts.json` (600 permissions)
- No patient data sold or shared with third parties
- Consult legal counsel for HIPAA requirements if handling PHI
