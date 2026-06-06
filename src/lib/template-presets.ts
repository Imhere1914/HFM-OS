/**
 * Built-in template preset packs.
 * These are starter templates users can import into their library.
 */

export interface TemplatePreset {
  id: string
  pack: 'sc-starter' | 'hfm-starter' | 'universal'
  category: 'email' | 'sms' | 'social' | 'reply' | 'note'
  name: string
  subject: string
  body: string
  tags: string[]
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // ── SC — Simple Connect ────────────────────────────────────────────────────
  {
    id: 'sc-welcome-email',
    pack: 'sc-starter',
    category: 'email',
    name: '🎉 New lead welcome',
    subject: 'Welcome to Simple Connect, {{contact_name}}!',
    body: `Hi {{contact_name}},

Thanks for your interest in Simple Connect. We build B2B automation that saves your team hours every week.

I'd love to schedule a quick 15-min discovery call to learn about your current workflow and show you how we can help.

→ Grab a time: [CALENDAR_LINK]

Looking forward to connecting,
{{sender_name}}
Simple Connect`,
    tags: ['welcome', 'lead', 'email'],
  },
  {
    id: 'sc-follow-up',
    pack: 'sc-starter',
    category: 'email',
    name: '🔁 Follow-up after no reply',
    subject: 'Re: Simple Connect — quick check-in',
    body: `Hi {{contact_name}},

Just following up on my note from last week. I know your inbox is busy — happy to make this easy.

Are you still exploring automation solutions for your team? Even a 10-min call would help me point you in the right direction.

Reply "yes" and I'll send over a calendar link.

{{sender_name}}`,
    tags: ['follow-up', 'email'],
  },
  {
    id: 'sc-proposal-sent',
    pack: 'sc-starter',
    category: 'email',
    name: '📋 Proposal sent',
    subject: 'Your Simple Connect proposal is ready',
    body: `Hi {{contact_name}},

I've attached your custom proposal based on our conversation. It covers:

• Automation scope & deliverables
• Timeline (typically 4–6 weeks)
• Investment breakdown

I'll follow up in 2 business days to answer any questions. Or feel free to reply any time.

{{sender_name}}
Simple Connect`,
    tags: ['proposal', 'email'],
  },
  {
    id: 'sc-sms-appointment',
    pack: 'sc-starter',
    category: 'sms',
    name: '📅 Appointment reminder (SMS)',
    subject: '',
    body: `Hi {{contact_name}}! Just a reminder about your call with Simple Connect tomorrow at {{time}}. Reply CONFIRM to confirm or RESCHEDULE to pick a new time.`,
    tags: ['appointment', 'sms', 'reminder'],
  },
  {
    id: 'sc-social-product',
    pack: 'sc-starter',
    category: 'social',
    name: '⚡ Product spotlight post',
    subject: '',
    body: `What if your team could automate the 3 most repetitive tasks they do every day?

That's exactly what Simple Connect does — and most clients see ROI in the first 30 days.

🔗 Book a free demo: [LINK]

#Automation #B2B #WorkflowAutomation #ProductivityHack`,
    tags: ['social', 'product'],
  },

  // ── HFM — Holistic Functional Care ────────────────────────────────────────
  {
    id: 'hfm-new-patient',
    pack: 'hfm-starter',
    category: 'email',
    name: '🌿 New patient welcome',
    subject: 'Welcome to Holistic Functional Care, {{contact_name}}',
    body: `Dear {{contact_name}},

We're so glad you've chosen Holistic Functional Care on your wellness journey.

Before your first appointment, please complete your intake forms at the link below — this helps our practitioners prepare a personalised plan for you.

→ Intake forms: [INTAKE_LINK]

If you have any questions, reply to this email or call us at [PHONE].

Warmly,
The HFM Team`,
    tags: ['welcome', 'new-patient', 'email'],
  },
  {
    id: 'hfm-appointment-reminder',
    pack: 'hfm-starter',
    category: 'email',
    name: '📅 Appointment reminder',
    subject: 'Your upcoming appointment at HFM — {{date}}',
    body: `Dear {{contact_name}},

This is a friendly reminder of your upcoming appointment:

📅 Date: {{date}}
🕐 Time: {{time}}
📍 Location: [CLINIC_ADDRESS]

Please arrive 10 minutes early. If you need to reschedule, reply to this email at least 24 hours in advance.

We look forward to seeing you.

The HFM Team`,
    tags: ['appointment', 'reminder', 'email'],
  },
  {
    id: 'hfm-sms-reminder',
    pack: 'hfm-starter',
    category: 'sms',
    name: '📱 Appointment SMS reminder',
    subject: '',
    body: `Hi {{contact_name}}, your HFM appointment is tomorrow at {{time}}. Reply YES to confirm or call [PHONE] to reschedule. See you soon!`,
    tags: ['appointment', 'sms'],
  },
  {
    id: 'hfm-social-wellness',
    pack: 'hfm-starter',
    category: 'social',
    name: '💚 Wellness tip post',
    subject: '',
    body: `Did you know that 80% of chronic symptoms can be traced back to root-cause imbalances?

At Holistic Functional Care, we don't just treat symptoms — we find the "why" behind them.

✨ Personalised. Evidence-based. Whole-person care.

Book a consultation today → [LINK]

#HolisticHealth #FunctionalMedicine #WellnessJourney #RootCause`,
    tags: ['social', 'wellness'],
  },

  // ── Universal ────────────────────────────────────────────────────────────
  {
    id: 'universal-reply-busy',
    pack: 'universal',
    category: 'reply',
    name: '⏰ Auto-reply: busy',
    subject: 'Re: {{subject}}',
    body: `Hi {{contact_name}},

Thanks for reaching out! I'm currently unavailable but will get back to you within 1 business day.

For urgent matters, please call [PHONE].

Best,
{{sender_name}}`,
    tags: ['auto-reply', 'reply'],
  },
  {
    id: 'universal-note-internal',
    pack: 'universal',
    category: 'note',
    name: '📝 Contact note template',
    subject: '',
    body: `Discovery call notes — {{date}}

Pain points:
-

Goals:
-

Next steps:
- [ ] Send proposal by [DATE]
- [ ] Follow up on [DATE]

Decision maker:
Budget range:
Timeline: `,
    tags: ['notes', 'crm'],
  },
]

export const PACK_LABELS: Record<string, string> = {
  'sc-starter': '⚡ SC Starter Pack',
  'hfm-starter': '🌿 HFM Starter Pack',
  'universal': '🌐 Universal',
}

export const PACK_DESCRIPTIONS: Record<string, string> = {
  'sc-starter': 'Email sequences, SMS reminders, and social posts for B2B automation sales',
  'hfm-starter': 'Patient welcome flows, appointment reminders, and wellness content',
  'universal': 'General-purpose templates that work for any brand',
}
