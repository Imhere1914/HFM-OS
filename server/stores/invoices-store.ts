import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

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
  writeFileSync(dbPath(file) + '.tmp', JSON.stringify(data, null, 2))
  const { renameSync } = require('fs') as typeof import('fs')
  renameSync(dbPath(file) + '.tmp', dbPath(file))
}

// ── Types ────────────────────────────────────────────────────────────────────

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
  tax_rate: number  // percent, e.g. 10 for 10%
  subtotal: number
  tax_amount: number
  total: number
  created_at: string
  updated_at: string
  paid_at?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const tax_amount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, tax_amount, total: Math.round((subtotal + tax_amount) * 100) / 100 }
}

function file(brand?: string) {
  return brand ? `invoices-${brand}.json` : 'invoices.json'
}

function nextInvoiceNumber(invoices: InvoiceRecord[]): string {
  const max = invoices.reduce((n, inv) => {
    const num = parseInt(inv.invoice_number.replace(/\D/g, ''), 10)
    return isNaN(num) ? n : Math.max(n, num)
  }, 0)
  return `INV-${String(max + 1).padStart(4, '0')}`
}

// ── Store ────────────────────────────────────────────────────────────────────

export function listInvoices(brand?: string): InvoiceRecord[] {
  return readJson<InvoiceRecord[]>(file(brand), [])
}

export interface CreateInvoiceInput {
  brand?: string
  contact_id?: string
  contact_name: string
  contact_email?: string
  line_items: Omit<LineItem, 'id'>[]
  status?: InvoiceStatus
  due_date?: string
  notes?: string
  tax_rate?: number
}

export function createInvoice(data: CreateInvoiceInput): InvoiceRecord {
  const invoices = listInvoices(data.brand)
  const now = new Date().toISOString()
  const items: LineItem[] = data.line_items.map((li) => ({ ...li, id: crypto.randomUUID() }))
  const taxRate = data.tax_rate ?? 0
  const totals = calcTotals(items, taxRate)
  const invoice: InvoiceRecord = {
    id: crypto.randomUUID(),
    invoice_number: nextInvoiceNumber(invoices),
    brand: data.brand,
    contact_id: data.contact_id,
    contact_name: data.contact_name,
    contact_email: data.contact_email,
    line_items: items,
    status: data.status ?? 'draft',
    due_date: data.due_date,
    notes: data.notes,
    tax_rate: taxRate,
    ...totals,
    created_at: now,
    updated_at: now,
  }
  writeJson(file(data.brand), [invoice, ...invoices])
  return invoice
}

export function updateInvoice(id: string, updates: Partial<Omit<InvoiceRecord, 'id' | 'invoice_number' | 'created_at'>>, brand?: string): InvoiceRecord | null {
  const invoices = listInvoices(brand)
  const idx = invoices.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const base = { ...invoices[idx], ...updates }
  // Recalculate totals if line_items or tax_rate changed
  if (updates.line_items !== undefined || updates.tax_rate !== undefined) {
    const totals = calcTotals(base.line_items, base.tax_rate)
    Object.assign(base, totals)
  }
  base.updated_at = new Date().toISOString()
  if (updates.status === 'paid' && !base.paid_at) base.paid_at = new Date().toISOString()
  invoices[idx] = base
  writeJson(file(brand), invoices)
  return base
}

export function deleteInvoice(id: string, brand?: string): boolean {
  const invoices = listInvoices(brand)
  const next = invoices.filter((i) => i.id !== id)
  if (next.length === invoices.length) return false
  writeJson(file(brand), next)
  return true
}
