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
  token?: string
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
  recipients?: AgreementRecipient[]
  fields?: AgreementField[]
  recipient_count?: number
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

export interface PublicAgreementDoc {
  id: string
  title: string
  type: AgreementType
  status: AgreementStatus
  content_html: string
  sender_name: string
  recipient: AgreementRecipient
  fields: AgreementField[]
  total_recipients: number
  signed_count: number
}

export interface ActivityEntry {
  type: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed'
  label: string
  at: string
  name?: string
}

export const STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signing',
  completed: 'Completed',
  archived: 'Archived',
}

export const STATUS_COLORS: Record<AgreementStatus, { bg: string; text: string }> = {
  draft: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
  sent: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  viewed: { bg: 'rgba(14,165,233,0.12)', text: '#0ea5e9' },
  signed: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7' },
  completed: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  archived: { bg: 'rgba(100,116,139,0.08)', text: '#94a3b8' },
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAgreements(brand: string, opts?: { status?: AgreementStatus; type?: AgreementType }): Promise<AgreementDocument[]> {
  const params = new URLSearchParams({ brand })
  if (opts?.status) params.set('status', opts.status)
  if (opts?.type) params.set('type', opts.type)
  return apiFetch<AgreementDocument[]>(`/api/agreements?${params}`)
}

export async function fetchAgreement(brand: string, id: string): Promise<AgreementDocument> {
  return apiFetch<AgreementDocument>(`/api/agreements/${id}?brand=${brand}`)
}

export async function createAgreement(brand: string, data: Partial<AgreementDocument>): Promise<AgreementDocument> {
  return apiFetch<AgreementDocument>('/api/agreements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(data),
  })
}

export async function updateAgreement(brand: string, id: string, patch: Partial<AgreementDocument>): Promise<AgreementDocument> {
  return apiFetch<AgreementDocument>(`/api/agreements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(patch),
  })
}

export async function deleteAgreement(brand: string, id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/agreements/${id}`, {
    method: 'DELETE',
    headers: { 'X-Brand': brand },
  })
}

export async function sendAgreement(brand: string, id: string, body: { sender_name?: string; sender_email?: string; recipients?: AgreementRecipient[]; personal_message?: string }): Promise<AgreementDocument> {
  return apiFetch<AgreementDocument>(`/api/agreements/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(body),
  })
}

export async function fetchActivityLog(brand: string, id: string): Promise<ActivityEntry[]> {
  return apiFetch<ActivityEntry[]>(`/api/agreements/${id}/activity?brand=${brand}`)
}

export async function upsertAgreementField(brand: string, docId: string, field: Partial<AgreementField>): Promise<AgreementField> {
  return apiFetch<AgreementField>(`/api/agreements/${docId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(field),
  })
}

export async function patchAgreementField(brand: string, docId: string, fieldId: string, patch: Partial<AgreementField>): Promise<AgreementField> {
  return apiFetch<AgreementField>(`/api/agreements/${docId}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(patch),
  })
}

export async function deleteAgreementField(brand: string, docId: string, fieldId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/agreements/${docId}/fields/${fieldId}`, {
    method: 'DELETE',
    headers: { 'X-Brand': brand },
  })
}

export async function addRecipient(brand: string, docId: string, data: { recipient_name: string; recipient_email: string; order?: number }): Promise<AgreementRecipient> {
  return apiFetch<AgreementRecipient>(`/api/agreements/${docId}/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(data),
  })
}

export async function deleteRecipient(brand: string, docId: string, recipientId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/agreements/${docId}/recipients/${recipientId}`, {
    method: 'DELETE',
    headers: { 'X-Brand': brand },
  })
}

// Public (no auth)
export async function fetchPublicAgreement(token: string): Promise<PublicAgreementDoc> {
  return apiFetch<PublicAgreementDoc>(`/api/agreements/sign/${token}`)
}

export async function submitSignature(token: string, fields: { id: string; value: string }[]): Promise<{ ok: boolean; signed_at: string }> {
  return apiFetch<{ ok: boolean; signed_at: string }>(`/api/agreements/sign/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
}

export async function declineAgreement(token: string): Promise<{ ok: boolean; declined: boolean }> {
  return apiFetch<{ ok: boolean; declined: boolean }>(`/api/agreements/sign/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ declined: true }),
  })
}

export async function fetchAgreementTemplates(brand: string): Promise<AgreementTemplate[]> {
  return apiFetch<AgreementTemplate[]>(`/api/agreement-templates?brand=${brand}`)
}

export async function createAgreementTemplate(brand: string, data: Pick<AgreementTemplate, 'name' | 'category' | 'content_html' | 'fields_json'>): Promise<AgreementTemplate> {
  return apiFetch<AgreementTemplate>('/api/agreement-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand': brand },
    body: JSON.stringify(data),
  })
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
