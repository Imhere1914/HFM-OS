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

export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  options?: string[]  // for select fields
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

// ── Store ────────────────────────────────────────────────────────────────────

function file(brand?: string) {
  return brand ? `forms-${brand}.json` : 'forms.json'
}

export function listForms(brand?: string): FormRecord[] {
  return readJson<FormRecord[]>(file(brand), [])
}

export function createForm(data: Omit<FormRecord, 'id' | 'created_at' | 'updated_at' | 'submissions_count'>): FormRecord {
  const forms = listForms(data.brand)
  const now = new Date().toISOString()
  const form: FormRecord = {
    ...data,
    id: crypto.randomUUID(),
    submissions_count: 0,
    created_at: now,
    updated_at: now,
  }
  writeJson(file(data.brand), [form, ...forms])
  return form
}

export function updateForm(id: string, updates: Partial<Omit<FormRecord, 'id' | 'created_at'>>, brand?: string): FormRecord | null {
  const forms = listForms(brand)
  const idx = forms.findIndex((f) => f.id === id)
  if (idx === -1) return null
  const updated = { ...forms[idx], ...updates, updated_at: new Date().toISOString() }
  forms[idx] = updated
  writeJson(file(brand), forms)
  return updated
}

export function deleteForm(id: string, brand?: string): boolean {
  const forms = listForms(brand)
  const next = forms.filter((f) => f.id !== id)
  if (next.length === forms.length) return false
  writeJson(file(brand), next)
  return true
}
