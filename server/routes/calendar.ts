/**
 * /api/calendar — unified content calendar
 * Merges social posts + campaigns into a single sorted timeline.
 */
import type { Hono } from 'hono'
import { listPosts } from '../stores/social-store'
import { listCampaigns } from '../stores/campaigns-store'

export interface CalendarEvent {
  id: string
  kind: 'social' | 'campaign'
  title: string
  detail: string
  status: string
  platform?: string
  scheduled_at: string | null
  /** ISO date string for the calendar day bucket (YYYY-MM-DD) */
  date: string | null
}

function toDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function buildCalendar(brand: string | null, from: string | null, to: string | null): CalendarEvent[] {
  const bf = (b?: string | null) => !brand || !b || b === brand
  const fromMs = from ? Date.parse(from) : 0
  const toMs = to ? Date.parse(to) : Infinity

  const inRange = (iso: string | null | undefined): boolean => {
    if (!iso) return true
    const t = Date.parse(iso)
    return !isNaN(t) && t >= fromMs && t <= toMs
  }

  const events: CalendarEvent[] = []

  // Social posts
  for (const p of listPosts({})) {
    if (!bf((p as { brand?: string }).brand)) continue
    const at = p.scheduled_at ?? p.published_at ?? null
    if (!inRange(at)) continue
    events.push({
      id: `social-${p.id}`,
      kind: 'social',
      title: (p.content ?? '').slice(0, 60) || 'Untitled post',
      detail: Array.isArray(p.platforms) ? p.platforms.join(', ') : '',
      status: p.status,
      platform: Array.isArray(p.platforms) ? p.platforms[0] : undefined,
      scheduled_at: at,
      date: toDate(at),
    })
  }

  // Campaigns
  for (const cp of listCampaigns({})) {
    if (!bf((cp as { brand?: string }).brand)) continue
    const at = cp.scheduled_at ?? cp.sent_at ?? null
    if (!inRange(at)) continue
    events.push({
      id: `campaign-${cp.id}`,
      kind: 'campaign',
      title: cp.name,
      detail: cp.subject,
      status: cp.status,
      scheduled_at: at,
      date: toDate(at),
    })
  }

  events.sort((a, b) => {
    const ta = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity
    const tb = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity
    return ta - tb
  })

  return events
}

export function registerCalendar(app: Hono): void {
  app.get('/api/calendar', (c) => {
    const u = new URL(c.req.url)
    const events = buildCalendar(
      u.searchParams.get('brand'),
      u.searchParams.get('from'),
      u.searchParams.get('to'),
    )
    return c.json({ events })
  })
}
