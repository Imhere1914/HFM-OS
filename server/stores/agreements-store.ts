import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { sendEmail } from './email-sender'

const DATA_DIR = process.env.AIOS_DATA_DIR ?? join(process.env.HOME ?? '/tmp', '.ai-os')

function dbPath(name: string) {
  mkdirSync(DATA_DIR, { recursive: true })
  return join(DATA_DIR, name)
}

function readJson<T>(file: string, fallback: T): T {
  const p = dbPath(file)
  if (!existsSync(p)) return fallback
  try { return JSON.parse(readFileSync(p, 'utf8')) as T } catch { return fallback }
}

function writeJson(file: string, data: unknown) {
  const p = dbPath(file)
  writeFileSync(p + '.tmp', JSON.stringify(data, null, 2))
  renameSync(p + '.tmp', p)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgreementStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'archived'
export type AgreementType = 'agreement' | 'proposal'
export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
export type RecipientStatus = 'pending' | 'viewed' | 'signed' | 'declined'

export interface AgreementRecipient {
  id: string
  document_id: string
  recipient_name: string
  recipient_email: string
  status: RecipientStatus
  viewed_at?: string
  signed_at?: string
  declined_at?: string
  token: string
  order: number
}

export interface AgreementField {
  id: string
  document_id: string
  recipient_id: string
  field_type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  value?: string
  label?: string
}

export interface AgreementTemplate {
  id: string
  brand: string
  name: string
  category: string
  content_html: string
  fields_json: string
  created_at: string
  updated_at: string
}

export interface AgreementDocument {
  id: string
  brand: string
  title: string
  type: AgreementType
  status: AgreementStatus
  content_html: string
  created_at: string
  updated_at: string
  sender_name: string
  sender_email: string
  template_id?: string
  sent_at?: string
  completed_at?: string
  archived_at?: string
  deleted_at?: string
}

// ── File helpers ──────────────────────────────────────────────────────────────

const agreementsFile = (brand: string) => `agreements-${brand}.json`
const recipientsFile = (brand: string) => `agreement-recipients-${brand}.json`
const fieldsFile = (brand: string) => `agreement-fields-${brand}.json`
const templatesFile = (brand: string) => `agreement-templates-${brand}.json`

const BRANDS = ['sc', 'hfm', 'default']

// ── Agreement CRUD ────────────────────────────────────────────────────────────

export function listAgreements(brand: string, opts?: { status?: AgreementStatus; type?: AgreementType }): AgreementDocument[] {
  let all = readJson<AgreementDocument[]>(agreementsFile(brand), []).filter(d => !d.deleted_at)
  if (opts?.status) all = all.filter(d => d.status === opts.status)
  if (opts?.type) all = all.filter(d => d.type === opts.type)
  return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getAgreement(brand: string, id: string): AgreementDocument | null {
  return readJson<AgreementDocument[]>(agreementsFile(brand), []).find(d => d.id === id) ?? null
}

export function createAgreement(
  brand: string,
  data: Pick<AgreementDocument, 'title' | 'type' | 'sender_name' | 'sender_email' | 'content_html'> & Partial<AgreementDocument>,
): AgreementDocument {
  const docs = readJson<AgreementDocument[]>(agreementsFile(brand), [])
  const now = new Date().toISOString()
  const doc: AgreementDocument = {
    id: crypto.randomUUID(),
    brand,
    title: data.title,
    type: data.type ?? 'agreement',
    status: 'draft',
    content_html: data.content_html ?? '',
    sender_name: data.sender_name ?? '',
    sender_email: data.sender_email ?? '',
    template_id: data.template_id,
    created_at: now,
    updated_at: now,
  }
  writeJson(agreementsFile(brand), [doc, ...docs])
  return doc
}

export function updateAgreement(brand: string, id: string, patch: Partial<AgreementDocument>): AgreementDocument | null {
  const docs = readJson<AgreementDocument[]>(agreementsFile(brand), [])
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  const updated: AgreementDocument = { ...docs[idx], ...patch, id, brand, updated_at: new Date().toISOString() }
  docs[idx] = updated
  writeJson(agreementsFile(brand), docs)
  return updated
}

export function softDeleteAgreement(brand: string, id: string): boolean {
  const now = new Date().toISOString()
  return !!updateAgreement(brand, id, { deleted_at: now })
}

// ── Recipients ────────────────────────────────────────────────────────────────

export function listRecipients(brand: string, documentId: string): AgreementRecipient[] {
  return readJson<AgreementRecipient[]>(recipientsFile(brand), [])
    .filter(r => r.document_id === documentId)
    .sort((a, b) => a.order - b.order)
}

export function getRecipientByToken(token: string): { recipient: AgreementRecipient; brand: string } | null {
  for (const brand of BRANDS) {
    const found = readJson<AgreementRecipient[]>(recipientsFile(brand), []).find(r => r.token === token)
    if (found) return { recipient: found, brand }
  }
  return null
}

export function addRecipient(brand: string, data: Omit<AgreementRecipient, 'id'>): AgreementRecipient {
  const all = readJson<AgreementRecipient[]>(recipientsFile(brand), [])
  const r: AgreementRecipient = { id: crypto.randomUUID(), ...data }
  writeJson(recipientsFile(brand), [...all, r])
  return r
}

export function updateRecipient(brand: string, id: string, patch: Partial<AgreementRecipient>): AgreementRecipient | null {
  const all = readJson<AgreementRecipient[]>(recipientsFile(brand), [])
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...patch, id }
  writeJson(recipientsFile(brand), all)
  return all[idx]
}

export function removeRecipientsForDoc(brand: string, documentId: string) {
  const all = readJson<AgreementRecipient[]>(recipientsFile(brand), [])
  writeJson(recipientsFile(brand), all.filter(r => r.document_id !== documentId))
}

// ── Fields ────────────────────────────────────────────────────────────────────

export function listFields(brand: string, documentId: string): AgreementField[] {
  return readJson<AgreementField[]>(fieldsFile(brand), []).filter(f => f.document_id === documentId)
}

export function upsertField(brand: string, field: AgreementField): AgreementField {
  const all = readJson<AgreementField[]>(fieldsFile(brand), [])
  const idx = all.findIndex(f => f.id === field.id)
  if (idx === -1) {
    writeJson(fieldsFile(brand), [...all, field])
  } else {
    all[idx] = field
    writeJson(fieldsFile(brand), all)
  }
  return field
}

export function updateField(brand: string, id: string, patch: Partial<AgreementField>): AgreementField | null {
  const all = readJson<AgreementField[]>(fieldsFile(brand), [])
  const idx = all.findIndex(f => f.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...patch, id }
  writeJson(fieldsFile(brand), all)
  return all[idx]
}

export function deleteField(brand: string, id: string): boolean {
  const all = readJson<AgreementField[]>(fieldsFile(brand), [])
  const next = all.filter(f => f.id !== id)
  if (next.length === all.length) return false
  writeJson(fieldsFile(brand), next)
  return true
}

export function deleteFieldsForDoc(brand: string, documentId: string) {
  const all = readJson<AgreementField[]>(fieldsFile(brand), [])
  writeJson(fieldsFile(brand), all.filter(f => f.document_id !== documentId))
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function listAgreementTemplates(brand: string): AgreementTemplate[] {
  return readJson<AgreementTemplate[]>(templatesFile(brand), []).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function createAgreementTemplate(brand: string, data: Pick<AgreementTemplate, 'name' | 'category' | 'content_html' | 'fields_json'>): AgreementTemplate {
  const all = readJson<AgreementTemplate[]>(templatesFile(brand), [])
  const now = new Date().toISOString()
  const t: AgreementTemplate = { id: crypto.randomUUID(), brand, ...data, created_at: now, updated_at: now }
  writeJson(templatesFile(brand), [t, ...all])
  return t
}

export function updateAgreementTemplate(brand: string, id: string, patch: Partial<AgreementTemplate>): AgreementTemplate | null {
  const all = readJson<AgreementTemplate[]>(templatesFile(brand), [])
  const idx = all.findIndex(t => t.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...patch, id, brand, updated_at: new Date().toISOString() }
  writeJson(templatesFile(brand), all)
  return all[idx]
}

export function deleteAgreementTemplate(brand: string, id: string): boolean {
  const all = readJson<AgreementTemplate[]>(templatesFile(brand), [])
  const next = all.filter(t => t.id !== id)
  if (next.length === all.length) return false
  writeJson(templatesFile(brand), next)
  return true
}

// ── Email rendering ───────────────────────────────────────────────────────────

export function renderAgreementEmail(opts: {
  brandName: string
  brandAccent: string
  senderName: string
  recipientName: string
  documentTitle: string
  signUrl: string
}): string {
  const { brandName, brandAccent, senderName, recipientName, documentTitle, signUrl } = opts
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
  <div style="background:${brandAccent};padding:20px 32px">
    <p style="color:#fff;font-size:13px;font-weight:600;margin:0;letter-spacing:0.5px">${brandName}</p>
  </div>
  <div style="padding:32px">
    <h2 style="font-size:20px;margin:0 0 12px;color:#1a1a1a">Hi ${recipientName},</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 8px"><strong style="color:#1a1a1a">${senderName}</strong> has sent you a document to review and sign:</p>
    <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:16px 0;padding:16px;background:#f9f9f9;border-radius:10px;border-left:4px solid ${brandAccent}">${documentTitle}</p>
    <p style="margin:28px 0 0">
      <a href="${signUrl}" style="background:${brandAccent};color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Review &amp; Sign →</a>
    </p>
    <p style="margin:20px 0 0;font-size:11px;color:#aaa">Or copy this link: <a href="${signUrl}" style="color:#666;word-break:break-all">${signUrl}</a></p>
  </div>
  <div style="border-top:1px solid #eee;padding:16px 32px">
    <p style="font-size:11px;color:#aaa;margin:0">${brandName} · Do not share this link</p>
  </div>
</div>
</body></html>`
}

// ── Send helper ───────────────────────────────────────────────────────────────

export async function sendAgreementEmails(
  brand: string,
  doc: AgreementDocument,
  recipients: AgreementRecipient[],
  origin: string,
) {
  const brandAccent = brand === 'hfm' ? '#c4a04e' : '#22c55e'
  const brandName = brand === 'hfm' ? 'Holistic Functional Care' : 'SimpleConnect'
  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const r of recipients) {
    const signUrl = `${origin}/sign/${r.token}`
    const html = renderAgreementEmail({
      brandName,
      brandAccent,
      senderName: doc.sender_name || brandName,
      recipientName: r.recipient_name,
      documentTitle: doc.title,
      signUrl,
    })
    const result = await sendEmail({
      to: r.recipient_email,
      subject: `${doc.sender_name || brandName} sent you "${doc.title}" to sign`,
      html,
    })
    results.push({ email: r.recipient_email, ok: result.ok, error: !result.ok ? result.error : undefined })
  }

  return results
}
