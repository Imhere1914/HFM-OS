import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete01Icon, PencilEdit02Icon, Target02Icon } from '@hugeicons/core-free-icons'
import { ScreenShell } from '@/components/screen-shell'
import { toast } from '@/components/toast'
import {
  DECISION_IMPACTS, DECISION_STATUS_LABELS, DECISION_STATUSES,
  IMPACT_COLORS, OKR_CYCLES, OKR_STATUS_COLORS, OKR_STATUSES,
  createDecision, createOkr, deleteDecision, deleteOkr,
  fetchDecisions, fetchOkrs, updateDecision, updateOkr,
  type DecisionImpact, type DecisionRecord, type DecisionStatus,
  type KeyResult, type OkrCycle, type OkrRecord, type OkrStatus,
} from '@/lib/strategy-api'

// ── Small helpers ─────────────────────────────────────────────────────────────

function inputCls(extra = '') { return `w-full rounded-xl border px-3 py-2 text-[13px] text-[var(--theme-text)] outline-none ${extra}` }
const inputStyle = { borderColor: 'var(--theme-border)', background: 'var(--theme-input)' }

// ── OKR form ──────────────────────────────────────────────────────────────────

function OkrModal({ initial, onSave, onClose }: {
  initial?: OkrRecord | null
  onSave: (data: Omit<OkrRecord, 'id'|'brand'|'created_at'|'updated_at'>) => void
  onClose: () => void
}) {
  const [objective, setObjective] = useState(initial?.objective ?? '')
  const [cycle, setCycle] = useState<OkrCycle>(initial?.cycle ?? 'Q1')
  const [year, setYear] = useState(initial?.year ?? new Date().getFullYear())
  const [status, setStatus] = useState<OkrStatus>(initial?.status ?? 'on-track')
  const [owner, setOwner] = useState(initial?.owner ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [krs, setKrs] = useState<KeyResult[]>(initial?.key_results ?? [])

  const addKr = () => setKrs(k => [...k, { id: crypto.randomUUID(), description: '', target: '', current: '', progress: 0 }])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border shadow-2xl" style={{ background: 'var(--theme-card-solid)', borderColor: 'var(--theme-border)' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <h2 className="text-[15px] font-semibold text-[var(--theme-text)]">{initial ? 'Edit OKR' : 'New OKR'}</h2>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="Objective (what we want to achieve)" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
          <div className="grid grid-cols-3 gap-2">
            <select value={cycle} onChange={e => setCycle(e.target.value as OkrCycle)} className={inputCls()} style={inputStyle}>
              {OKR_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls()} style={inputStyle} />
            <select value={status} onChange={e => setStatus(e.target.value as OkrStatus)} className={inputCls()} style={inputStyle}>
              {OKR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner" className={inputCls()} style={inputStyle} />

          {/* Key Results */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">Key Results</span>
              <button onClick={addKr} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--theme-accent)' }}>
                <HugeiconsIcon icon={Add01Icon} size={12} /> Add KR
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {krs.map((kr, i) => (
                <div key={kr.id} className="flex items-start gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <input value={kr.description} onChange={e => setKrs(k => k.map((x,j) => j===i ? {...x, description: e.target.value} : x))}
                      placeholder="Description" className="w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={inputStyle} />
                    <div className="flex gap-1">
                      <input value={kr.target} onChange={e => setKrs(k => k.map((x,j) => j===i ? {...x, target: e.target.value} : x))}
                        placeholder="Target" className="w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={inputStyle} />
                      <input value={kr.current} onChange={e => setKrs(k => k.map((x,j) => j===i ? {...x, current: e.target.value} : x))}
                        placeholder="Current" className="w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={inputStyle} />
                      <input type="number" min={0} max={100} value={kr.progress} onChange={e => setKrs(k => k.map((x,j) => j===i ? {...x, progress: Number(e.target.value)} : x))}
                        placeholder="%" className="w-16 rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={() => setKrs(k => k.filter((_,j) => j!==i))} className="mt-1 rounded-lg p-1" style={{ color: 'var(--theme-danger)' }}>
                    <HugeiconsIcon icon={Delete01Icon} size={13} />
                  </button>
                </div>
              ))}
              {krs.length === 0 && <p className="text-[12px] text-[var(--theme-muted)]">No key results yet</p>}
            </div>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-[13px] text-[var(--theme-muted)]" style={{ borderColor: 'var(--theme-border)' }}>Cancel</button>
          <button onClick={() => {
            if (!objective.trim()) { toast('Objective is required', { type: 'error' }); return }
            onSave({ objective, cycle, year, status, owner, notes, key_results: krs })
          }} className="btn-primary rounded-xl px-4 py-2 text-[13px] font-medium text-white">
            {initial ? 'Save' : 'Create OKR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Decision form ─────────────────────────────────────────────────────────────

function DecisionModal({ initial, onSave, onClose }: {
  initial?: DecisionRecord | null
  onSave: (data: Omit<DecisionRecord, 'id'|'brand'|'created_at'|'updated_at'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [context, setContext] = useState(initial?.context ?? '')
  const [options, setOptions] = useState(initial?.options_considered ?? '')
  const [decision, setDecision] = useState(initial?.decision ?? '')
  const [rationale, setRationale] = useState(initial?.rationale ?? '')
  const [owner, setOwner] = useState(initial?.owner ?? '')
  const [impact, setImpact] = useState<DecisionImpact>(initial?.impact ?? 'medium')
  const [status, setStatus] = useState<DecisionStatus>(initial?.status ?? 'pending')
  const [reviewDate, setReviewDate] = useState(initial?.review_date ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border shadow-2xl" style={{ background: 'var(--theme-card-solid)', borderColor: 'var(--theme-border)' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <h2 className="text-[15px] font-semibold text-[var(--theme-text)]">{initial ? 'Edit Decision' : 'Log a Decision'}</h2>
        </div>
        <div className="flex flex-col gap-3 p-6">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Decision title" className={inputCls()} style={inputStyle} />
          <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Context — what problem/situation prompted this?" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
          <textarea value={options} onChange={e => setOptions(e.target.value)} placeholder="Options considered" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
          <textarea value={decision} onChange={e => setDecision(e.target.value)} placeholder="What was decided?" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
          <textarea value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Why? Rationale / trade-offs" rows={2} className={`${inputCls()} resize-none`} style={inputStyle} />
          <div className="grid grid-cols-3 gap-2">
            <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner" className={inputCls()} style={inputStyle} />
            <select value={impact} onChange={e => setImpact(e.target.value as DecisionImpact)} className={inputCls()} style={inputStyle}>
              {DECISION_IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value as DecisionStatus)} className={inputCls()} style={inputStyle}>
              {DECISION_STATUSES.map(s => <option key={s} value={s}>{DECISION_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className={inputCls()} style={inputStyle} placeholder="Review date (optional)" />
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-[13px] text-[var(--theme-muted)]" style={{ borderColor: 'var(--theme-border)' }}>Cancel</button>
          <button onClick={() => {
            if (!title.trim()) { toast('Title is required', { type: 'error' }); return }
            onSave({ title, context, options_considered: options, decision, rationale, owner, impact, status, review_date: reviewDate || null })
          }} className="btn-primary rounded-xl px-4 py-2 text-[13px] font-medium text-white">
            {initial ? 'Save' : 'Log Decision'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Tab = 'okrs' | 'decisions'

export function StrategyScreen() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('okrs')
  const [okrModal, setOkrModal] = useState<'new' | OkrRecord | null>(null)
  const [decisionModal, setDecisionModal] = useState<'new' | DecisionRecord | null>(null)

  const { data: okrs = [] } = useQuery({ queryKey: ['strategy-okrs'], queryFn: fetchOkrs })
  const { data: decisions = [] } = useQuery({ queryKey: ['strategy-decisions'], queryFn: fetchDecisions })

  const createOkrM = useMutation({
    mutationFn: createOkr, onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategy-okrs'] }); setOkrModal(null); toast('OKR created') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })
  const updateOkrM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateOkr>[1] }) => updateOkr(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategy-okrs'] }); setOkrModal(null); toast('Saved') },
  })
  const deleteOkrM = useMutation({ mutationFn: deleteOkr, onSuccess: () => qc.invalidateQueries({ queryKey: ['strategy-okrs'] }) })

  const createDecisionM = useMutation({
    mutationFn: createDecision, onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategy-decisions'] }); setDecisionModal(null); toast('Decision logged') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })
  const updateDecisionM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateDecision>[1] }) => updateDecision(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategy-decisions'] }); setDecisionModal(null); toast('Saved') },
  })
  const deleteDecisionM = useMutation({ mutationFn: deleteDecision, onSuccess: () => qc.invalidateQueries({ queryKey: ['strategy-decisions'] }) })

  const tabAction = tab === 'okrs'
    ? <button onClick={() => setOkrModal('new')} className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white"><HugeiconsIcon icon={Add01Icon} size={15} />New OKR</button>
    : <button onClick={() => setDecisionModal('new')} className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white"><HugeiconsIcon icon={Add01Icon} size={15} />Log Decision</button>

  return (
    <>
      <ScreenShell
        icon={Target02Icon}
        title="Strategy Partner"
        subtitle="OKRs, key results, and decision log"
        action={tabAction}
      >
        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)', width: 'fit-content' }}>
          {(['okrs', 'decisions'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all"
              style={tab === t ? { background: 'var(--theme-accent)', color: 'white' } : { color: 'var(--theme-muted)' }}>
              {t === 'okrs' ? `🎯 OKRs (${okrs.length})` : `📋 Decisions (${decisions.length})`}
            </button>
          ))}
        </div>

        {/* ── OKRs ── */}
        {tab === 'okrs' && (
          okrs.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: 'var(--theme-border)' }}>
              <p className="text-[32px]">🎯</p>
              <p className="mt-2 text-[14px] font-medium text-[var(--theme-text)]">No OKRs yet</p>
              <p className="mt-1 text-[13px] text-[var(--theme-muted)]">Set objectives and key results to track your most important goals.</p>
              <button onClick={() => setOkrModal('new')} className="mt-4 text-[13px] font-medium" style={{ color: 'var(--theme-accent)' }}>Create first OKR →</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {okrs.map(okr => {
                const sc = OKR_STATUS_COLORS[okr.status]
                const avgProgress = okr.key_results.length
                  ? Math.round(okr.key_results.reduce((s, kr) => s + kr.progress, 0) / okr.key_results.length)
                  : 0
                return (
                  <div key={okr.id} className="group rounded-2xl border p-4" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)', backdropFilter: 'blur(10px)' }}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--theme-accent-soft)', color: 'var(--theme-accent)' }}>
                            {okr.cycle} {okr.year}
                          </span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: sc.bg, color: sc.text }}>
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
                            {okr.status}
                          </span>
                          {okr.owner && <span className="text-[11px] text-[var(--theme-muted)]">👤 {okr.owner}</span>}
                        </div>
                        <p className="mt-1.5 text-[13px] font-semibold text-[var(--theme-text)]">{okr.objective}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setOkrModal(okr)} className="rounded-lg p-1.5 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-muted)' }}>
                          <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                        </button>
                        <button onClick={() => deleteOkrM.mutate(okr.id)} className="rounded-lg p-1.5 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-danger)' }}>
                          <HugeiconsIcon icon={Delete01Icon} size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {okr.key_results.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--theme-muted)]">
                          <span>Overall progress</span><span className="font-medium" style={{ color: sc.text }}>{avgProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--theme-hover)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${avgProgress}%`, background: sc.dot }} />
                        </div>
                      </div>
                    )}

                    {/* Key Results */}
                    {okr.key_results.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {okr.key_results.map(kr => (
                          <div key={kr.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--theme-hover)' }}>
                            <div className="w-20 shrink-0">
                              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--theme-border)' }}>
                                <div className="h-full rounded-full" style={{ width: `${kr.progress}%`, background: sc.dot }} />
                              </div>
                            </div>
                            <span className="flex-1 truncate text-[11px] text-[var(--theme-text)]">{kr.description}</span>
                            <span className="shrink-0 text-[10px] text-[var(--theme-muted)]">{kr.current} / {kr.target}</span>
                            <span className="shrink-0 text-[10px] font-medium" style={{ color: sc.text }}>{kr.progress}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Decisions ── */}
        {tab === 'decisions' && (
          decisions.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: 'var(--theme-border)' }}>
              <p className="text-[32px]">📋</p>
              <p className="mt-2 text-[14px] font-medium text-[var(--theme-text)]">No decisions logged</p>
              <p className="mt-1 text-[13px] text-[var(--theme-muted)]">Record key business decisions with context and rationale so you can look back later.</p>
              <button onClick={() => setDecisionModal('new')} className="mt-4 text-[13px] font-medium" style={{ color: 'var(--theme-accent)' }}>Log first decision →</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {decisions.map(d => {
                const imp = IMPACT_COLORS[d.impact]
                return (
                  <div key={d.id} className="group rounded-2xl border p-4" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)', backdropFilter: 'blur(10px)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: imp.bg, color: imp.text }}>
                            {d.impact} impact
                          </span>
                          <span className="text-[11px] text-[var(--theme-muted)]">{DECISION_STATUS_LABELS[d.status]}</span>
                          {d.owner && <span className="text-[11px] text-[var(--theme-muted)]">👤 {d.owner}</span>}
                          <span className="text-[10px] text-[var(--theme-muted)]">{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-[var(--theme-text)]">{d.title}</p>
                        {d.decision && <p className="mt-1 text-[12px] text-[var(--theme-muted)] line-clamp-2">→ {d.decision}</p>}
                        {d.rationale && <p className="mt-0.5 text-[11px] text-[var(--theme-muted)] line-clamp-1 italic">{d.rationale}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setDecisionModal(d)} className="rounded-lg p-1.5 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-muted)' }}>
                          <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                        </button>
                        <button onClick={() => deleteDecisionM.mutate(d.id)} className="rounded-lg p-1.5 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-danger)' }}>
                          <HugeiconsIcon icon={Delete01Icon} size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </ScreenShell>

      {okrModal && (
        <OkrModal
          initial={okrModal === 'new' ? null : okrModal}
          onSave={data => okrModal === 'new'
            ? createOkrM.mutate(data)
            : updateOkrM.mutate({ id: (okrModal as OkrRecord).id, patch: data })
          }
          onClose={() => setOkrModal(null)}
        />
      )}
      {decisionModal && (
        <DecisionModal
          initial={decisionModal === 'new' ? null : decisionModal}
          onSave={data => decisionModal === 'new'
            ? createDecisionM.mutate(data)
            : updateDecisionM.mutate({ id: (decisionModal as DecisionRecord).id, patch: data })
          }
          onClose={() => setDecisionModal(null)}
        />
      )}
    </>
  )
}
