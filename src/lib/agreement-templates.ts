export interface TemplateFieldDef {
  field_type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
  x: number
  y: number
  width: number
  height: number
  required: boolean
  label?: string
  recipientIndex: number
}

export interface HfmTemplate {
  id: string
  name: string
  category: string
  description: string
  contentHtml: string
  fields: TemplateFieldDef[]
}

export const RECIPIENT_COLORS = ['#c4a04e', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ec4899']
export const recipientColor = (index: number) => RECIPIENT_COLORS[index % RECIPIENT_COLORS.length]

export const HFM_TEMPLATES: HfmTemplate[] = [
  {
    id: 'hfm-wellness-coaching',
    name: 'Wellness Coaching Agreement',
    category: 'Coaching',
    description: 'Standard agreement for wellness coaching services including scope, fees, and confidentiality.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">Wellness Coaching Agreement</h1>
<p>This Wellness Coaching Agreement ("Agreement") is entered into between <strong>Holistic Functional Care</strong> ("Practice," "we," or "us") and the client identified in the signature block below ("Client," "you").</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Scope of Services</h2>
<p>The Practice will provide personalized wellness coaching designed to support your health and lifestyle goals. Services may include goal-setting sessions, nutrition and lifestyle guidance, habit coaching, accountability check-ins, and educational resources. Coaching is collaborative; outcomes depend substantially on your engagement and follow-through.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Sessions, Frequency &amp; Duration</h2>
<p>Coaching is delivered over an agreed engagement period through scheduled sessions (typically weekly or bi-weekly, 30–60 minutes each), conducted in person or via secure video. The session cadence, total number of sessions, and engagement length will be confirmed during your intake.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Fees &amp; Payment Terms</h2>
<p>Fees for coaching services are as quoted at enrollment. Payment is due in advance of each session or per the agreed payment schedule. Returned or failed payments may incur a processing fee. Unless otherwise stated in writing, fees are non-refundable once a session has been delivered.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Confidentiality</h2>
<p>We respect your privacy. Information you share during coaching is kept confidential and will not be disclosed to third parties without your written consent, except where disclosure is required by law or necessary to prevent imminent harm.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">5. Not Medical Advice</h2>
<p>Wellness coaching is educational and supportive in nature. It is <strong>not</strong> a substitute for diagnosis, treatment, or advice from a licensed physician or other qualified healthcare provider. Nothing in this engagement creates a doctor–patient relationship. Always consult your physician before making changes to diet, exercise, supplementation, or medication.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">6. Cancellation &amp; Rescheduling</h2>
<p>Please provide at least 24 hours' notice to cancel or reschedule a session. Sessions cancelled with less than 24 hours' notice, or missed without notice, may be forfeited or charged in full at our discretion.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">7. Acknowledgment</h2>
<p>By signing below, the parties acknowledge that they have read, understood, and agree to the terms of this Agreement.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:50%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:50%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Client Signature &amp; Date</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Coach Signature &amp; Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'signature', x: 2, y: 88, width: 32, height: 6, required: true, label: 'Client Signature', recipientIndex: 0 },
      { field_type: 'date', x: 2, y: 95, width: 18, height: 4, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
  {
    id: 'hfm-informed-consent',
    name: 'Informed Consent for Health Services',
    category: 'Consent',
    description: 'Informed consent covering nature of services, client rights, HIPAA notice, and voluntary participation.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">Informed Consent for Health Services</h1>
<p>Please read this consent form carefully. By signing, you confirm that you understand the nature of the services offered by <strong>Holistic Functional Care</strong> and voluntarily consent to participate.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Nature of Services</h2>
<p>Holistic Functional Care provides functional and holistic wellness services, which may include health history review, lifestyle and nutrition guidance, wellness assessments, and coaching. These services take a whole-person approach and are intended to complement, not replace, conventional medical care.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Your Rights &amp; Responsibilities</h2>
<p>You have the right to ask questions, to be informed about recommended services, and to accept or decline any portion of your care at any time. You are responsible for providing accurate health information, following agreed plans to the best of your ability, and informing us of any changes in your health status.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Privacy &amp; HIPAA Notice</h2>
<p>Your health information is handled in accordance with applicable privacy laws, including HIPAA where applicable. A Notice of Privacy Practices describes how your information may be used and disclosed and your rights regarding that information. Please request a copy if you have not received one.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Risks &amp; Benefits</h2>
<p>Potential benefits include improved understanding of your health, support in reaching wellness goals, and lifestyle improvement. As with any change in diet, activity, or routine, there are potential risks, including discomfort or aggravation of existing conditions. Results vary and are not guaranteed.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">5. Right to Withdraw Consent</h2>
<p>Your participation is voluntary. You may withdraw this consent and discontinue services at any time, without penalty, by notifying us in writing.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">6. Emergency Contact Authorization</h2>
<p>You authorize Holistic Functional Care to contact the emergency contact you have provided in the event of a health emergency occurring during the course of services.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">7. Consent</h2>
<p>I have read and understand this form. My questions have been answered to my satisfaction, and I voluntarily consent to receive services from Holistic Functional Care.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:60%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:40%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Client Signature</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'checkbox', x: 2, y: 82, width: 90, height: 4, required: true, label: 'I consent to receive services from Holistic Functional Care', recipientIndex: 0 },
      { field_type: 'signature', x: 2, y: 89, width: 40, height: 6, required: true, label: 'Client Signature', recipientIndex: 0 },
      { field_type: 'date', x: 45, y: 89, width: 20, height: 6, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
  {
    id: 'hfm-hipaa-auth',
    name: 'HIPAA Authorization — Release of Information',
    category: 'Compliance',
    description: 'Standard HIPAA authorization for releasing protected health information to authorized parties.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">HIPAA Authorization for Release of Protected Health Information</h1>
<p>This authorization permits <strong>Holistic Functional Care</strong> to use or disclose the protected health information ("PHI") described below in accordance with the Health Insurance Portability and Accountability Act of 1996 (HIPAA).</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Information to Be Disclosed</h2>
<p>I authorize the release of the following information (check all that apply):<br/>
☐ Health history and intake records &nbsp;&nbsp; ☐ Wellness assessments and notes<br/>
☐ Lab or test results &nbsp;&nbsp; ☐ Treatment and coaching plans<br/>
☐ Billing records &nbsp;&nbsp; ☐ Other: _________________________________</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Authorized to Disclose</h2>
<p>Holistic Functional Care and its authorized staff are permitted to disclose the information described above.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Authorized to Receive</h2>
<p>The information may be disclosed to: ________________________________________ (name, relationship/organization, and contact details).</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Purpose of Disclosure</h2>
<p>Purpose: ☐ Coordination of care &nbsp;&nbsp; ☐ At my request &nbsp;&nbsp; ☐ Family/caregiver &nbsp;&nbsp; ☐ Other: _____________</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">5. Expiration</h2>
<p>This authorization expires one (1) year from the date of signature unless an earlier date or event is specified here: _______________________.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">6. Right to Revoke</h2>
<p>I understand I may revoke this authorization in writing at any time, except to the extent that action has already been taken in reliance on it. Information disclosed may be re-disclosed by the recipient and may no longer be protected by federal privacy law.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">7. Acknowledgment</h2>
<p>I understand that signing is voluntary and that Holistic Functional Care may not condition treatment on whether I sign, except as permitted by law.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:60%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:40%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Signature of Client / Personal Representative</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'signature', x: 2, y: 89, width: 42, height: 6, required: true, label: 'Client Signature', recipientIndex: 0 },
      { field_type: 'date', x: 48, y: 89, width: 20, height: 6, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
  {
    id: 'hfm-health-history-release',
    name: 'Health History & Intake Release',
    category: 'Intake',
    description: 'Authorizes sharing of health history with the care team and certifies accuracy of provided information.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">Health History &amp; Intake Release</h1>
<p>This release accompanies the health history and intake information I have provided to <strong>Holistic Functional Care</strong>.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Authorization to Share With Care Team</h2>
<p>I authorize Holistic Functional Care to share my health history and intake information with members of my care team and authorized staff for the purpose of coordinating and delivering my wellness services.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Accuracy of Information</h2>
<p>I certify that the health history, medications, allergies, and other information I have provided are accurate and complete to the best of my knowledge. I agree to promptly notify the Practice of any changes to my health status.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Emergency Contact Permission</h2>
<p>I grant permission for Holistic Functional Care to contact the emergency contact(s) I have listed should the need arise during the course of my care.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Acknowledgment</h2>
<p>I have read and understand this release and sign it voluntarily.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:60%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:40%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Client Signature</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'signature', x: 2, y: 82, width: 42, height: 6, required: true, label: 'Client Signature', recipientIndex: 0 },
      { field_type: 'date', x: 48, y: 82, width: 22, height: 6, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
  {
    id: 'hfm-program-enrollment',
    name: 'Program Enrollment Agreement',
    category: 'Enrollment',
    description: 'Enrollment terms covering program duration, fees, refund policy, and commitment acknowledgment.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">Program Enrollment Agreement</h1>
<p>This Program Enrollment Agreement is entered into between <strong>Holistic Functional Care</strong> and the enrolling client named below, for participation in the program identified here: <strong>[Program Name]</strong>.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Program Duration &amp; Deliverables</h2>
<p>The program runs for the duration specified at enrollment. Deliverables may include scheduled sessions, assessments, educational materials, program tools, and ongoing support as described in your program outline. Specific deliverables and the program schedule will be confirmed in writing at enrollment.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Investment &amp; Fee Schedule</h2>
<p>The program investment is as quoted at enrollment and may be paid in full or through an agreed installment schedule. Installment plans represent a commitment to the full program fee. Failed or late payments may pause program access until the account is current.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Refund Policy</h2>
<p>Because program spots and resources are reserved upon enrollment, fees are generally non-refundable once the program has begun. Any refund eligibility, including a cancellation window, will be governed by the refund terms provided at enrollment.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Commitment Acknowledgment</h2>
<p>I understand that results depend on my active participation and that Holistic Functional Care does not guarantee specific outcomes. I commit to engaging with the program to the best of my ability.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">5. Acknowledgment</h2>
<p>By signing below, I agree to enroll in the program under the terms above.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:50%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:50%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Client Signature &amp; Date</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Practice Representative &amp; Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'signature', x: 2, y: 87, width: 32, height: 6, required: true, label: 'Client Signature', recipientIndex: 0 },
      { field_type: 'date', x: 2, y: 94, width: 18, height: 4, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
  {
    id: 'hfm-membership',
    name: 'Service & Membership Agreement',
    category: 'Membership',
    description: 'Recurring membership terms with payment authorization, auto-renewal, and 30-day cancellation policy.',
    contentHtml: `<h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#1a1a1a">Service &amp; Membership Agreement</h1>
<p>This Membership Agreement is entered into between <strong>Holistic Functional Care</strong> and the member named below.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">1. Membership Terms</h2>
<p>Membership provides access to the services and benefits described in your selected membership tier, billed on a recurring monthly basis. Benefits, included services, and any usage limits are as described at sign-up and may be updated with reasonable notice.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">2. Payment Authorization</h2>
<p>I authorize Holistic Functional Care to charge my designated payment method the recurring membership fee on each billing date until this membership is cancelled in accordance with this Agreement. I am responsible for keeping my payment information current.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">3. Auto-Renewal</h2>
<p>Membership renews automatically each billing period at the then-current rate unless cancelled. We will provide reasonable notice of any fee changes before they take effect.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">4. Cancellation Policy</h2>
<p>You may cancel your membership at any time by providing at least thirty (30) days' written notice. Cancellation takes effect at the end of the current billing period; fees already billed are non-refundable, and you retain access through the paid period.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">5. Dispute Resolution</h2>
<p>The parties agree to first attempt to resolve any dispute in good faith through direct discussion. Any dispute not resolved informally will be handled in accordance with applicable law in the Practice's jurisdiction.</p>

<h2 style="font-size:16px;font-weight:700;margin:20px 0 8px">6. Acknowledgment</h2>
<p>By signing below, I agree to the membership terms, payment authorization, and auto-renewal described above.</p>

<table style="width:100%;border-collapse:collapse;margin-top:40px">
  <tr>
    <td style="width:60%;padding:24px 16px 8px 0;border-bottom:1px solid #999"></td>
    <td style="width:40%;padding:24px 0 8px 16px;border-bottom:1px solid #999"></td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:11px;color:#666">Member Signature</td>
    <td style="padding-top:6px;padding-left:16px;font-size:11px;color:#666">Date</td>
  </tr>
</table>`,
    fields: [
      { field_type: 'checkbox', x: 2, y: 83, width: 90, height: 4, required: true, label: 'I authorize recurring billing to my payment method on file', recipientIndex: 0 },
      { field_type: 'signature', x: 2, y: 88, width: 40, height: 6, required: true, label: 'Member Signature', recipientIndex: 0 },
      { field_type: 'date', x: 45, y: 88, width: 22, height: 6, required: true, label: 'Date', recipientIndex: 0 },
    ],
  },
]
