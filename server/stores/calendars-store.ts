import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

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
  renameSync(dbPath(file) + '.tmp', dbPath(file))
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DaySchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  enabled: boolean
  start_time: string
  end_time: string
}

export interface CalendarDef {
  id: string
  brand: string
  name: string
  slug: string
  description: string
  color: string
  meeting_type: 'video' | 'phone' | 'in_person'
  meeting_location: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  max_per_day: number
  booking_window_days: number
  timezone: string
  days: DaySchedule[]
  blocked_dates: string[]   // YYYY-MM-DD
  require_phone: boolean
  phone_required: boolean   // true = required (vs optional)
  allow_guests: boolean
  max_guests: number
  collect_notes: boolean
  confirmation_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_DAYS: DaySchedule[] = [
  { day: 0, enabled: false, start_time: '09:00', end_time: '17:00' },
  { day: 1, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 2, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 3, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 4, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 5, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 6, enabled: false, start_time: '09:00', end_time: '17:00' },
]

function calFile(brand: string) { return `calendars-${brand}.json` }

export function listCalendars(brand: string): CalendarDef[] {
  return readJson<CalendarDef[]>(calFile(brand), [])
}

export function getCalendar(brand: string, idOrSlug: string): CalendarDef | null {
  const all = listCalendars(brand)
  return all.find(c => c.id === idOrSlug || c.slug === idOrSlug) ?? null
}

export function createCalendar(brand: string, input: Partial<CalendarDef>): CalendarDef {
  const all = listCalendars(brand)
  const now = new Date().toISOString()
  const name = (input.name ?? 'New Calendar').trim()
  const slug = input.slug?.trim()
    || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const cal: CalendarDef = {
    id: randomUUID(),
    brand,
    name,
    slug,
    description: input.description ?? '',
    color: input.color ?? '#22c55e',
    meeting_type: input.meeting_type ?? 'video',
    meeting_location: input.meeting_location ?? '',
    duration_minutes: input.duration_minutes ?? 30,
    buffer_before_minutes: input.buffer_before_minutes ?? 5,
    buffer_after_minutes: input.buffer_after_minutes ?? 5,
    max_per_day: input.max_per_day ?? 8,
    booking_window_days: input.booking_window_days ?? 30,
    timezone: input.timezone ?? 'America/New_York',
    days: (input.days ?? DEFAULT_DAYS) as DaySchedule[],
    blocked_dates: input.blocked_dates ?? [],
    require_phone: input.require_phone ?? false,
    phone_required: input.phone_required ?? false,
    allow_guests: input.allow_guests ?? false,
    max_guests: input.max_guests ?? 3,
    collect_notes: input.collect_notes ?? true,
    confirmation_message: input.confirmation_message ?? 'Your appointment has been confirmed. We look forward to speaking with you!',
    is_active: input.is_active ?? true,
    created_at: now,
    updated_at: now,
  }
  writeJson(calFile(brand), [...all, cal])
  return cal
}

export function updateCalendar(brand: string, id: string, patch: Partial<CalendarDef>): CalendarDef | null {
  const all = listCalendars(brand)
  const idx = all.findIndex(c => c.id === id)
  if (idx === -1) return null
  const updated: CalendarDef = {
    ...all[idx],
    ...patch,
    id,
    brand,
    updated_at: new Date().toISOString(),
  }
  all[idx] = updated
  writeJson(calFile(brand), all)
  return updated
}

export function deleteCalendar(brand: string, id: string): boolean {
  const all = listCalendars(brand)
  const next = all.filter(c => c.id !== id)
  if (next.length === all.length) return false
  writeJson(calFile(brand), next)
  return true
}
