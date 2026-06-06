export type OkrStatus = 'on-track' | 'at-risk' | 'off-track' | 'complete'
export type OkrCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual'
export type DecisionStatus = 'pending' | 'decided' | 'revisit'
export type DecisionImpact = 'high' | 'medium' | 'low'

export interface KeyResult {
  id: string
  description: string
  target: string
  current: string
  progress: number
}

export interface OkrRecord {
  id: string; brand: string; cycle: OkrCycle; year: number
  objective: string; key_results: KeyResult[]
  status: OkrStatus; owner: string; notes: string
  created_at: string; updated_at: string
}

export interface DecisionRecord {
  id: string; brand: string; title: string; context: string
  options_considered: string; decision: string; rationale: string
  owner: string; impact: DecisionImpact; status: DecisionStatus
  review_date: string | null; created_at: string; updated_at: string
}

export const OKR_STATUS_COLORS: Record<OkrStatus, { bg: string; text: string; dot: string }> = {
  'on-track': { bg: 'rgba(31,168,92,0.12)', text: '#1fa85c', dot: '#1fa85c' },
  'at-risk':  { bg: 'rgba(248,123,79,0.12)', text: '#f87b4f', dot: '#f87b4f' },
  'off-track': { bg: 'rgba(212,68,68,0.12)', text: '#d44444', dot: '#d44444' },
  'complete': { bg: 'rgba(79,126,248,0.12)', text: '#4f7ef8', dot: '#4f7ef8' },
}
export const IMPACT_COLORS: Record<DecisionImpact, { bg: string; text: string }> = {
  high:   { bg: 'rgba(212,68,68,0.12)', text: '#d44444' },
  medium: { bg: 'rgba(248,123,79,0.12)', text: '#f87b4f' },
  low:    { bg: 'rgba(160,160,160,0.12)', text: '#888' },
}
export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pending: '⏳ Pending', decided: '✅ Decided', revisit: '🔄 Revisit',
}
export const OKR_CYCLES: OkrCycle[] = ['Q1','Q2','Q3','Q4','annual']
export const OKR_STATUSES: OkrStatus[] = ['on-track','at-risk','off-track','complete']
export const DECISION_STATUSES: DecisionStatus[] = ['pending','decided','revisit']
export const DECISION_IMPACTS: DecisionImpact[] = ['high','medium','low']

export async function fetchOkrs(): Promise<OkrRecord[]> {
  const r = await fetch('/api/strategy/okrs')
  if (!r.ok) throw new Error('Failed to load OKRs')
  return (await r.json()).okrs
}
export async function createOkr(input: Omit<OkrRecord, 'id'|'brand'|'created_at'|'updated_at'>): Promise<OkrRecord> {
  const r = await fetch('/api/strategy/okrs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Create failed')
  return (await r.json()).okr
}
export async function updateOkr(id: string, patch: Partial<OkrRecord>): Promise<OkrRecord> {
  const r = await fetch(`/api/strategy/okrs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  if (!r.ok) throw new Error('Update failed')
  return (await r.json()).okr
}
export async function deleteOkr(id: string): Promise<void> {
  await fetch(`/api/strategy/okrs/${id}`, { method: 'DELETE' })
}

export async function fetchDecisions(): Promise<DecisionRecord[]> {
  const r = await fetch('/api/strategy/decisions')
  if (!r.ok) throw new Error('Failed to load decisions')
  return (await r.json()).decisions
}
export async function createDecision(input: Omit<DecisionRecord, 'id'|'brand'|'created_at'|'updated_at'>): Promise<DecisionRecord> {
  const r = await fetch('/api/strategy/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Create failed')
  return (await r.json()).decision
}
export async function updateDecision(id: string, patch: Partial<DecisionRecord>): Promise<DecisionRecord> {
  const r = await fetch(`/api/strategy/decisions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  if (!r.ok) throw new Error('Update failed')
  return (await r.json()).decision
}
export async function deleteDecision(id: string): Promise<void> {
  await fetch(`/api/strategy/decisions/${id}`, { method: 'DELETE' })
}
