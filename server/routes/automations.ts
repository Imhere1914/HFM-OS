import type { Hono } from 'hono'
import {
  createAutomation, deleteAutomation, getAutomation, listAutomations,
  readRuns, updateAutomation, TRIGGER_EVENTS, ACTION_TYPES,
  TRIGGER_LABELS, TRIGGER_EMOJIS, ACTION_LABELS, ACTION_EMOJIS,
  OPERATOR_LABELS, CONDITION_OPERATORS,
  type ActionConfig, type Condition,
} from '../stores/automations-store'
import { triggerAutomations } from '../lib/automation-engine'
import { listNotifications, markAllRead, markRead } from '../stores/notifications-store'

export function registerAutomations(app: Hono): void {
  // ── Meta (schema for the UI builder) ──────────────────────────────────────
  app.get('/api/automations/meta', (c) => {
    return c.json({ TRIGGER_EVENTS, TRIGGER_LABELS, TRIGGER_EMOJIS, ACTION_TYPES, ACTION_LABELS, ACTION_EMOJIS, CONDITION_OPERATORS, OPERATOR_LABELS })
  })

  // ── Automations CRUD ───────────────────────────────────────────────────────
  app.get('/api/automations', (c) => {
    const u = new URL(c.req.url)
    return c.json({
      automations: listAutomations({
        brand: u.searchParams.get('brand'),
        enabled: u.searchParams.has('enabled') ? u.searchParams.get('enabled') === 'true' : undefined,
      }),
    })
  })

  app.post('/api/automations', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    if (typeof b.name !== 'string' || !b.name.trim()) return c.json({ error: 'name is required' }, 400)
    if (!TRIGGER_EVENTS.includes(b.trigger as never)) return c.json({ error: 'valid trigger is required' }, 400)
    const automation = createAutomation({
      name: b.name.trim(),
      description: typeof b.description === 'string' ? b.description : undefined,
      trigger: b.trigger as never,
      conditions: Array.isArray(b.conditions) ? (b.conditions as Condition[]) : [],
      actions: Array.isArray(b.actions) ? (b.actions as ActionConfig[]) : [],
      brand: typeof b.brand === 'string' ? b.brand : undefined,
    })
    return c.json({ automation }, 201)
  })

  app.get('/api/automations/:id', (c) => {
    const a = getAutomation(c.req.param('id'))
    return a ? c.json({ automation: a }) : c.json({ error: 'Not found' }, 404)
  })

  app.patch('/api/automations/:id', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const automation = updateAutomation(c.req.param('id'), {
      name: typeof b.name === 'string' ? b.name.trim() : undefined,
      description: typeof b.description === 'string' ? b.description : undefined,
      enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined,
      trigger: TRIGGER_EVENTS.includes(b.trigger as never) ? (b.trigger as never) : undefined,
      conditions: Array.isArray(b.conditions) ? (b.conditions as Condition[]) : undefined,
      actions: Array.isArray(b.actions) ? (b.actions as ActionConfig[]) : undefined,
    })
    return automation ? c.json({ automation }) : c.json({ error: 'Not found' }, 404)
  })

  app.delete('/api/automations/:id', (c) =>
    deleteAutomation(c.req.param('id'))
      ? c.json({ ok: true })
      : c.json({ error: 'Not found' }, 404))

  // ── Test run (simulate event without persisting side effects) ─────────────
  app.post('/api/automations/:id/test', async (c) => {
    const a = getAutomation(c.req.param('id'))
    if (!a) return c.json({ error: 'Not found' }, 404)
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    // Run with dry_run context — actual engine runs but email/webhook are skipped if no config
    await triggerAutomations(a.trigger, { ...b, _test: true })
    return c.json({ ok: true, message: 'Test run triggered — check the run log' })
  })

  // ── Run log ────────────────────────────────────────────────────────────────
  app.get('/api/automations/runs', (c) => {
    const id = new URL(c.req.url).searchParams.get('automation_id')
    const runs = readRuns().filter(r => !id || r.automation_id === id)
    return c.json({ runs: runs.slice(0, 50) })
  })

  // ── Notifications (from send_notification actions + highlights) ────────────
  app.get('/api/notifications', (c) => {
    const u = new URL(c.req.url)
    return c.json({
      notifications: listNotifications({
        brand: u.searchParams.get('brand'),
        unread_only: u.searchParams.get('unread') === 'true',
      }),
    })
  })

  app.patch('/api/notifications/:id', (c) =>
    markRead(c.req.param('id')) ? c.json({ ok: true }) : c.json({ error: 'Not found' }, 404))

  app.post('/api/notifications/mark-all-read', (c) => {
    const brand = new URL(c.req.url).searchParams.get('brand') ?? process.env.BRAND ?? 'default'
    markAllRead(brand)
    return c.json({ ok: true })
  })
}
