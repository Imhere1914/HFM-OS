/**
 * Strategy Partner — OKRs + Decision Log
 * File-backed JSON store at AIOS_DATA_DIR/strategy.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const dataDir = process.env.AIOS_DATA_DIR ?? join(process.env.HOME ?? '/tmp', '.ai-os')
const FILE = join(dataDir, 'strategy.json')

function nowISO(): string { return new Date().toISOString() }

// ── Types ─────────────────────────────────────────────────────────────────────

export type OkrStatus = 'on-track' | 'at-risk' | 'off-track' | 'complete'
export type OkrCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual'
export type DecisionStatus = 'pending' | 'decided' | 'revisit'
export type DecisionImpact = 'high' | 'medium' | 'low'

export interface KeyResult {
  id: string
  description: string
  target: string
  current: string
  progress: number  // 0–100
}

export interface OkrRecord {
  id: string
  brand: string
  cycle: OkrCycle
  year: number
  objective: string
  key_results: KeyResult[]
  status: OkrStatus
  owner: string
  notes: string
  created_at: string
  updated_at: string
}

export interface DecisionRecord {
  id: string
  brand: string
  title: string
  context: string
  options_considered: string
  decision: string
  rationale: string
  owner: string
  impact: DecisionImpact
  status: DecisionStatus
  review_date: string | null
  created_at: string
  updated_at: string
}

interface StrategyData {
  okrs: OkrRecord[]
  decisions: DecisionRecord[]
}

// ── Storage ───────────────────────────────────────────────────────────────────

function readAll(): StrategyData {
  if (!existsSync(FILE)) return { okrs: [], decisions: [] }
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as StrategyData }
  catch { return { okrs: [], decisions: [] } }
}

function writeAll(data: StrategyData): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(FILE, JSON.stringify(data, null, 2))
}

// ── OKR CRUD ──────────────────────────────────────────────────────────────────

export function listOkrs(filters: { brand?: string | null; cycle?: string | null; year?: number | null } = {}): OkrRecord[] {
  return readAll().okrs.filter(o =>
    (!filters.brand || o.brand === filters.brand) &&
    (!filters.cycle || o.cycle === filters.cycle) &&
    (!filters.year || o.year === filters.year)
  )
}

export function getOkr(id: string): OkrRecord | undefined {
  return readAll().okrs.find(o => o.id === id)
}

export function createOkr(input: {
  brand?: string; cycle: OkrCycle; year: number; objective: string;
  key_results?: KeyResult[]; owner?: string; notes?: string; status?: OkrStatus
}): OkrRecord {
  const ts = nowISO()
  const rec: OkrRecord = {
    id: randomUUID(),
    brand: input.brand ?? process.env.BRAND ?? 'default',
    cycle: input.cycle,
    year: input.year,
    objective: input.objective,
    key_results: input.key_results ?? [],
    status: input.status ?? 'on-track',
    owner: input.owner ?? '',
    notes: input.notes ?? '',
    created_at: ts, updated_at: ts,
  }
  const data = readAll()
  data.okrs.push(rec)
  writeAll(data)
  return rec
}

export function updateOkr(id: string, patch: Partial<Omit<OkrRecord, 'id' | 'brand' | 'created_at'>>): OkrRecord | undefined {
  const data = readAll()
  const i = data.okrs.findIndex(o => o.id === id)
  if (i === -1) return undefined
  data.okrs[i] = { ...data.okrs[i], ...patch, updated_at: nowISO() }
  writeAll(data)
  return data.okrs[i]
}

export function deleteOkr(id: string): boolean {
  const data = readAll()
  const next = data.okrs.filter(o => o.id !== id)
  if (next.length === data.okrs.length) return false
  data.okrs = next
  writeAll(data)
  return true
}

// ── Decision Log CRUD ─────────────────────────────────────────────────────────

export function listDecisions(filters: { brand?: string | null; status?: string | null } = {}): DecisionRecord[] {
  return readAll().decisions.filter(d =>
    (!filters.brand || d.brand === filters.brand) &&
    (!filters.status || d.status === filters.status)
  ).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getDecision(id: string): DecisionRecord | undefined {
  return readAll().decisions.find(d => d.id === id)
}

export function createDecision(input: {
  brand?: string; title: string; context?: string; options_considered?: string;
  decision?: string; rationale?: string; owner?: string;
  impact?: DecisionImpact; status?: DecisionStatus; review_date?: string | null
}): DecisionRecord {
  const ts = nowISO()
  const rec: DecisionRecord = {
    id: randomUUID(),
    brand: input.brand ?? process.env.BRAND ?? 'default',
    title: input.title,
    context: input.context ?? '',
    options_considered: input.options_considered ?? '',
    decision: input.decision ?? '',
    rationale: input.rationale ?? '',
    owner: input.owner ?? '',
    impact: input.impact ?? 'medium',
    status: input.status ?? 'pending',
    review_date: input.review_date ?? null,
    created_at: ts, updated_at: ts,
  }
  const data = readAll()
  data.decisions.push(rec)
  writeAll(data)
  return rec
}

export function updateDecision(id: string, patch: Partial<Omit<DecisionRecord, 'id' | 'brand' | 'created_at'>>): DecisionRecord | undefined {
  const data = readAll()
  const i = data.decisions.findIndex(d => d.id === id)
  if (i === -1) return undefined
  data.decisions[i] = { ...data.decisions[i], ...patch, updated_at: nowISO() }
  writeAll(data)
  return data.decisions[i]
}

export function deleteDecision(id: string): boolean {
  const data = readAll()
  const next = data.decisions.filter(d => d.id !== id)
  if (next.length === data.decisions.length) return false
  data.decisions = next
  writeAll(data)
  return true
}
