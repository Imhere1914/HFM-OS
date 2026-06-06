export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  options?: string[]
}

export interface FormRecord {
  id: string
  brand?: string
  name: string
  description: string
  fields: FormField[]
  status: 'active' | 'draft'
  submissions_count: number
  created_at: string
  updated_at: string
}

export interface CreateFormInput {
  brand?: string
  name: string
  description?: string
  fields?: FormField[]
  status?: 'active' | 'draft'
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Short text',
  email: 'Email',
  phone: 'Phone',
  textarea: 'Long text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
}

export async function fetchForms(params?: { brand?: string }): Promise<FormRecord[]> {
  const url = new URL('/api/forms', location.origin)
  if (params?.brand) url.searchParams.set('brand', params.brand)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load forms')
  return res.json()
}

export async function createForm(input: CreateFormInput): Promise<FormRecord> {
  const res = await fetch('/api/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create form')
  return res.json()
}

export async function updateForm(id: string, updates: Partial<CreateFormInput>): Promise<FormRecord> {
  const res = await fetch(`/api/forms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update form')
  return res.json()
}

export async function deleteForm(id: string): Promise<void> {
  const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete form')
}
