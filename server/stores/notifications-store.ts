/**
 * Internal notifications store — automation-generated alerts surfaced in Highlights.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DATA_DIR = process.env.AIOS_DATA_DIR ?? join(homedir(), '.ai-os')
const FILE = join(DATA_DIR, 'notifications.json')

export interface SystemNotification {
  id: string
  brand: string
  message: string
  context_summary: string
  read: boolean
  created_at: string
}

function readAll(): SystemNotification[] {
  if (!existsSync(FILE)) return []
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as SystemNotification[] }
  catch { return [] }
}

function writeAll(items: SystemNotification[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${FILE}.${randomUUID()}.tmp`
  writeFileSync(tmp, JSON.stringify(items, null, 2))
  renameSync(tmp, FILE)
}

export function appendNotification(input: { brand: string; message: string; context_summary: string }) {
  const all = readAll()
  all.unshift({
    id: randomUUID(),
    brand: input.brand,
    message: input.message,
    context_summary: input.context_summary,
    read: false,
    created_at: new Date().toISOString(),
  })
  writeAll(all.slice(0, 500))   // cap at 500
}

export function listNotifications(filters: { brand?: string | null; unread_only?: boolean } = {}): SystemNotification[] {
  const brand = filters.brand ?? process.env.BRAND ?? null
  return readAll()
    .filter(n => !brand || brand === 'default' ? true : n.brand === brand)
    .filter(n => filters.unread_only ? !n.read : true)
}

export function markRead(id: string): boolean {
  const all = readAll()
  const item = all.find(n => n.id === id)
  if (!item) return false
  item.read = true
  writeAll(all)
  return true
}

export function markAllRead(brand: string) {
  const all = readAll()
  all.forEach(n => { if (n.brand === brand) n.read = true })
  writeAll(all)
}
