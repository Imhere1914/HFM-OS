import type { Hono } from 'hono'
import {
  createDecision, createOkr, deleteDecision, deleteOkr,
  getDecision, getOkr, listDecisions, listOkrs, updateDecision, updateOkr,
  type DecisionImpact, type DecisionStatus, type OkrCycle, type OkrStatus,
} from '../stores/strategy-store'

const VALID_CYCLES: OkrCycle[] = ['Q1', 'Q2', 'Q3', 'Q4', 'annual']
const VALID_OKR_STATUS: OkrStatus[] = ['on-track', 'at-risk', 'off-track', 'complete']
const VALID_IMPACT: DecisionImpact[] = ['high', 'medium', 'low']
const VALID_DECISION_STATUS: DecisionStatus[] = ['pending', 'decided', 'revisit']

export function registerStrategy(app: Hono): void {
  // ── OKRs ──────────────────────────────────────────────────────────────────
  app.get('/api/strategy/okrs', (c) => {
    const u = new URL(c.req.url)
    return c.json({ okrs: listOkrs({
      brand: u.searchParams.get('brand'),
      cycle: u.searchParams.get('cycle'),
      year: u.searchParams.has('year') ? Number(u.searchParams.get('year')) : null,
    }) })
  })

  app.post('/api/strategy/okrs', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    if (typeof b.objective !== 'string' || !b.objective.trim()) return c.json({ error: 'objective is required' }, 400)
    if (!VALID_CYCLES.includes(b.cycle as OkrCycle)) return c.json({ error: 'valid cycle (Q1/Q2/Q3/Q4/annual) is required' }, 400)
    const okr = createOkr({
      objective: b.objective.trim(),
      cycle: b.cycle as OkrCycle,
      year: typeof b.year === 'number' ? b.year : new Date().getFullYear(),
      key_results: Array.isArray(b.key_results) ? b.key_results : [],
      owner: typeof b.owner === 'string' ? b.owner : undefined,
      notes: typeof b.notes === 'string' ? b.notes : undefined,
      status: VALID_OKR_STATUS.includes(b.status as OkrStatus) ? b.status as OkrStatus : undefined,
      brand: typeof b.brand === 'string' ? b.brand : undefined,
    })
    return c.json({ okr }, 201)
  })

  app.get('/api/strategy/okrs/:id', (c) => {
    const o = getOkr(c.req.param('id'))
    return o ? c.json({ okr: o }) : c.json({ error: 'Not found' }, 404)
  })

  app.patch('/api/strategy/okrs/:id', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const okr = updateOkr(c.req.param('id'), {
      objective: typeof b.objective === 'string' ? b.objective.trim() : undefined,
      cycle: VALID_CYCLES.includes(b.cycle as OkrCycle) ? b.cycle as OkrCycle : undefined,
      year: typeof b.year === 'number' ? b.year : undefined,
      key_results: Array.isArray(b.key_results) ? b.key_results : undefined,
      owner: typeof b.owner === 'string' ? b.owner : undefined,
      notes: typeof b.notes === 'string' ? b.notes : undefined,
      status: VALID_OKR_STATUS.includes(b.status as OkrStatus) ? b.status as OkrStatus : undefined,
    })
    return okr ? c.json({ okr }) : c.json({ error: 'Not found' }, 404)
  })

  app.delete('/api/strategy/okrs/:id', (c) =>
    deleteOkr(c.req.param('id')) ? c.json({ ok: true }) : c.json({ error: 'Not found' }, 404))

  // ── Decision Log ──────────────────────────────────────────────────────────
  app.get('/api/strategy/decisions', (c) => {
    const u = new URL(c.req.url)
    return c.json({ decisions: listDecisions({
      brand: u.searchParams.get('brand'),
      status: u.searchParams.get('status'),
    }) })
  })

  app.post('/api/strategy/decisions', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    if (typeof b.title !== 'string' || !b.title.trim()) return c.json({ error: 'title is required' }, 400)
    const decision = createDecision({
      title: b.title.trim(),
      context: typeof b.context === 'string' ? b.context : undefined,
      options_considered: typeof b.options_considered === 'string' ? b.options_considered : undefined,
      decision: typeof b.decision === 'string' ? b.decision : undefined,
      rationale: typeof b.rationale === 'string' ? b.rationale : undefined,
      owner: typeof b.owner === 'string' ? b.owner : undefined,
      impact: VALID_IMPACT.includes(b.impact as DecisionImpact) ? b.impact as DecisionImpact : undefined,
      status: VALID_DECISION_STATUS.includes(b.status as DecisionStatus) ? b.status as DecisionStatus : undefined,
      review_date: typeof b.review_date === 'string' ? b.review_date : null,
      brand: typeof b.brand === 'string' ? b.brand : undefined,
    })
    return c.json({ decision }, 201)
  })

  app.get('/api/strategy/decisions/:id', (c) => {
    const d = getDecision(c.req.param('id'))
    return d ? c.json({ decision: d }) : c.json({ error: 'Not found' }, 404)
  })

  app.patch('/api/strategy/decisions/:id', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const decision = updateDecision(c.req.param('id'), {
      title: typeof b.title === 'string' ? b.title.trim() : undefined,
      context: typeof b.context === 'string' ? b.context : undefined,
      options_considered: typeof b.options_considered === 'string' ? b.options_considered : undefined,
      decision: typeof b.decision === 'string' ? b.decision : undefined,
      rationale: typeof b.rationale === 'string' ? b.rationale : undefined,
      owner: typeof b.owner === 'string' ? b.owner : undefined,
      impact: VALID_IMPACT.includes(b.impact as DecisionImpact) ? b.impact as DecisionImpact : undefined,
      status: VALID_DECISION_STATUS.includes(b.status as DecisionStatus) ? b.status as DecisionStatus : undefined,
      review_date: b.review_date === null || typeof b.review_date === 'string' ? b.review_date as string | null : undefined,
    })
    return decision ? c.json({ decision }) : c.json({ error: 'Not found' }, 404)
  })

  app.delete('/api/strategy/decisions/:id', (c) =>
    deleteDecision(c.req.param('id')) ? c.json({ ok: true }) : c.json({ error: 'Not found' }, 404))
}
