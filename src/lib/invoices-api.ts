export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

export interface InvoiceRecord {
  id: string
  invoice_number: string
  brand?: string
  contact_id?: string
  contact_name: string
  contact_email?: string
  line_items: LineItem[]
  status: InvoiceStatus
  due_date?: string
  notes?: string
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  created_at: string
  updated_at: string
  paid_at?: string
}

export interface CreateInvoiceInput {
  brand?: string
  contact_name: string
  contact_email?: string
  line_items: Omit<LineItem, 'id'>[]
  status?: InvoiceStatus
  due_date?: string
  notes?: string
  tax_rate?: number
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
}

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'var(--theme-muted)',
  sent: '#3b82f6',
  paid: '#22c55e',
  void: '#ef4444',
}

export const STATUS_BG: Record<InvoiceStatus, string> = {
  draft: 'var(--theme-hover)',
  sent: '#3b82f610',
  paid: '#22c55e10',
  void: '#ef444410',
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function fetchInvoices(params?: { brand?: string }): Promise<InvoiceRecord[]> {
  const url = new URL('/api/invoices', location.origin)
  if (params?.brand) url.searchParams.set('brand', params.brand)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load invoices')
  return res.json()
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create invoice')
  return res.json()
}

export async function updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update invoice')
  return res.json()
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete invoice')
}
