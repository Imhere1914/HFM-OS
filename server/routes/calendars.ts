import type { Hono } from 'hono'
import {
  listCalendars, getCalendar, createCalendar, updateCalendar, deleteCalendar,
  type CalendarDef,
} from '../stores/calendars-store'

const BRAND = process.env.BRAND ?? 'default'

const DEFAULT_DAYS = [
  { day: 0 as const, enabled: false, start_time: '09:00', end_time: '17:00' },
  { day: 1 as const, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 2 as const, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 3 as const, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 4 as const, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 5 as const, enabled: true,  start_time: '09:00', end_time: '17:00' },
  { day: 6 as const, enabled: false, start_time: '09:00', end_time: '17:00' },
]

function seedDefaultCalendars(brand: string): void {
  const existing = listCalendars(brand)
  if (existing.length > 0) return

  const isSC = brand === 'sc'
  createCalendar(brand, {
    name: isSC ? '30 Minute Meeting' : '30 Minute Consultation',
    slug: '30-min',
    duration_minutes: 30,
    timezone: 'America/New_York',
    days: DEFAULT_DAYS,
    color: isSC ? '#22c55e' : '#a3843b',
    meeting_type: 'video',
    booking_window_days: 30,
    is_active: true,
  } satisfies Partial<CalendarDef>)
}

export function registerCalendars(app: Hono): void {
  // Seed default calendars for known brands on startup
  seedDefaultCalendars('sc')
  seedDefaultCalendars('hfm')
  // GET /api/calendars — list all calendars for the current brand (authenticated)
  app.get('/api/calendars', (c) => {
    const brand = c.req.query('brand') ?? BRAND
    return c.json(listCalendars(brand))
  })

  // POST /api/calendars — create a new calendar (authenticated)
  app.post('/api/calendars', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Partial<CalendarDef>
    const brand = (body.brand as string | undefined) ?? BRAND
    const cal = createCalendar(brand, body)
    return c.json(cal, 201)
  })

  // GET /api/calendars/:id — single calendar (public — used by booking pages)
  app.get('/api/calendars/:id', (c) => {
    const id = c.req.param('id')
    const brand = c.req.query('brand') ?? BRAND
    const cal = getCalendar(brand, id)
    if (!cal) return c.json({ error: 'Calendar not found' }, 404)
    return c.json(cal)
  })

  // PUT /api/calendars/:id — update a calendar (authenticated)
  app.put('/api/calendars/:id', async (c) => {
    const id = c.req.param('id')
    const body = (await c.req.json().catch(() => ({}))) as Partial<CalendarDef>
    const brand = (body.brand as string | undefined) ?? BRAND
    const cal = updateCalendar(brand, id, body)
    if (!cal) return c.json({ error: 'Calendar not found' }, 404)
    return c.json(cal)
  })

  // DELETE /api/calendars/:id — delete a calendar (authenticated)
  app.delete('/api/calendars/:id', (c) => {
    const id = c.req.param('id')
    const brand = c.req.query('brand') ?? BRAND
    const ok = deleteCalendar(brand, id)
    return c.json({ ok })
  })
}
