import type { Hono } from 'hono'
import {
  listCalendars, getCalendar, createCalendar, updateCalendar, deleteCalendar,
  type CalendarDef,
} from '../stores/calendars-store'

const BRAND = process.env.BRAND ?? 'default'

export function registerCalendars(app: Hono): void {
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
