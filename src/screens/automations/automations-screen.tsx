import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete01Icon, FlowSquareIcon, PencilEdit02Icon, PlayIcon } from '@hugeicons/core-free-icons'
import { ScreenShell } from '@/components/screen-shell'
import { toast } from '@/components/toast'
import {
  ACTION_EMOJIS, ACTION_LABELS, ACTION_TYPES, CONDITION_OPERATORS, OPERATOR_LABELS,
  TRIGGER_EMOJIS, TRIGGER_EVENTS, TRIGGER_LABELS,
  createAutomation, deleteAutomation, fetchAutomations, updateAutomation,
  type ActionConfig, type AutomationInput, type AutomationRecord, type Condition,
  type ConditionOperator, type TriggerEvent, type ActionType,
} from '@/lib/automations-api'

// ─── Action editor component ────────────────────────────────────────────────

function ActionEditor({ action, onChange, onRemove }: {
  action: ActionConfig
  onChange: (a: ActionConfig) => void
  onRemove: () => void
}) {
  const inputCls = 'w-full rounded-lg border px-2.5 py-1.5 text-[12px] text-[var(--theme-text)] outline-none'
  const inputStyle = { borderColor: 'var(--theme-border)', background: 'var(--theme-input)' }

  return (
    <div className="rounded-xl border p-3" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{ACTION_EMOJIS[action.type]}</span>
          <select
            value={action.type}
            onChange={e => onChange({ type: e.target.value as ActionType })}
            className={inputCls}
            style={{ ...inputStyle, width: 'auto' }}
          >
            {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_LABELS[t]}</option>)}
          </select>
        </div>
        <button onClick={onRemove} className="shrink-0 rounded-lg p-1 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-danger)' }}>
          <HugeiconsIcon icon={Delete01Icon} size={13} />
        </button>
      </div>

      {action.type === 'send_email' && (
        <div className="flex flex-col gap-1.5">
          <input value={action.to ?? 'contact'} onChange={e => onChange({ ...action, to: e.target.value })} placeholder="To: 'contact' or email address" className={inputCls} style={inputStyle} />
          <input value={action.subject ?? ''} onChange={e => onChange({ ...action, subject: e.target.value })} placeholder="Subject (use {{contact_name}} for variables)" className={inputCls} style={inputStyle} />
          <textarea value={action.body ?? ''} onChange={e => onChange({ ...action, body: e.target.value })} placeholder="Email body…" rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
        </div>
      )}
      {action.type === 'update_stage' && (
        <select value={action.stage ?? ''} onChange={e => onChange({ ...action, stage: e.target.value })} className={inputCls} style={inputStyle}>
          <option value="">Select stage…</option>
          {['lead', 'contacted', 'qualified', 'customer', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {action.type === 'add_tag' && (
        <input value={action.tag ?? ''} onChange={e => onChange({ ...action, tag: e.target.value })} placeholder="Tag name" className={inputCls} style={inputStyle} />
      )}
      {action.type === 'create_task' && (
        <div className="flex gap-1.5">
          <input value={action.task_title ?? ''} onChange={e => onChange({ ...action, task_title: e.target.value })} placeholder="Task title (use {{contact_name}} etc.)" className={`${inputCls} flex-1`} style={inputStyle} />
          <select value={action.task_priority ?? 'medium'} onChange={e => onChange({ ...action, task_priority: e.target.value as 'high' | 'medium' | 'low' })} className={inputCls} style={{ ...inputStyle, width: '90px' }}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      )}
      {action.type === 'send_notification' && (
        <input value={action.message ?? ''} onChange={e => onChange({ ...action, message: e.target.value })} placeholder="Notification message (use {{contact_name}} etc.)" className={inputCls} style={inputStyle} />
      )}
      {action.type === 'webhook' && (
        <div className="flex gap-1.5">
          <input value={action.url ?? ''} onChange={e => onChange({ ...action, url: e.target.value })} placeholder="https://…" className={`${inputCls} flex-1`} style={inputStyle} />
          <select value={action.method ?? 'POST'} onChange={e => onChange({ ...action, method: e.target.value as 'POST' | 'GET' })} className={inputCls} style={{ ...inputStyle, width: '70px' }}>
            <option>POST</option><option>GET</option>
          </select>
        </div>
      )}
    </div>
  )
}

// ─── Builder modal ──────────────────────────────────────────────────────────

function BuilderModal({ initial, onSave, onClose }: {
  initial?: AutomationRecord | null
  onSave: (input: AutomationInput) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [trigger, setTrigger] = useState<TriggerEvent>(initial?.trigger ?? 'new_contact')
  const [conditions, setConditions] = useState<Condition[]>(initial?.conditions ?? [])
  const [actions, setActions] = useState<ActionConfig[]>(initial?.actions ?? [{ type: 'send_notification', message: 'Automation triggered: {{contact_name}}' }])

  const inputCls = 'w-full rounded-xl border px-3 py-2 text-[13px] text-[var(--theme-text)] outline-none'
  const inputStyle = { borderColor: 'var(--theme-border)', background: 'var(--theme-input)' }
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--theme-accent)' },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--theme-border)' },
  }

  const addCondition = () => setConditions(c => [...c, { field: 'stage', operator: 'equals', value: '' }])
  const addAction = () => setActions(a => [...a, { type: 'send_notification', message: '' }])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl" style={{ background: 'var(--theme-card-solid)', borderColor: 'var(--theme-border)' }}>

        {/* Header */}
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <h2 className="text-[15px] font-semibold text-[var(--theme-text)]">
            {initial ? 'Edit automation' : 'New automation'}
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--theme-muted)]">When a trigger fires → check conditions → run actions</p>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Name + description */}
          <div className="flex flex-col gap-2.5">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Automation name…" className={inputCls} style={inputStyle} {...focusHandlers} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className={inputCls} style={inputStyle} {...focusHandlers} />
          </div>

          {/* ── WHEN ─────────────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--theme-accent)' }}>1</span>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">When</span>
            </div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_EVENTS.map(ev => (
                  <button
                    key={ev}
                    onClick={() => setTrigger(ev)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                    style={trigger === ev
                      ? { background: 'var(--theme-accent)', color: 'white' }
                      : { background: 'var(--theme-card)', border: '1px solid var(--theme-border)', color: 'var(--theme-muted)' }
                    }
                  >
                    <span>{TRIGGER_EMOJIS[ev]}</span>
                    {TRIGGER_LABELS[ev]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── IF ───────────────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--theme-accent)' }}>2</span>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">If (conditions — all must match)</span>
              </div>
              <button onClick={addCondition} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--theme-accent)' }}>
                <HugeiconsIcon icon={Add01Icon} size={13} /> Add condition
              </button>
            </div>
            {conditions.length === 0 ? (
              <p className="rounded-xl border border-dashed py-3 text-center text-[12px] text-[var(--theme-muted)]" style={{ borderColor: 'var(--theme-border)' }}>
                No conditions — automation runs on every trigger
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <select value={cond.field} onChange={e => setConditions(cs => cs.map((c, j) => j === i ? { ...c, field: e.target.value } : c))}
                      className="rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-input)', color: 'var(--theme-text)', width: '110px' }}>
                      {['stage', 'source', 'name', 'email', 'tags'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={cond.operator} onChange={e => setConditions(cs => cs.map((c, j) => j === i ? { ...c, operator: e.target.value as ConditionOperator } : c))}
                      className="rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-input)', color: 'var(--theme-text)', width: '140px' }}>
                      {CONDITION_OPERATORS.map(op => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                    </select>
                    {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                      <input value={cond.value} onChange={e => setConditions(cs => cs.map((c, j) => j === i ? { ...c, value: e.target.value } : c))}
                        placeholder="value…" className="flex-1 rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-input)', color: 'var(--theme-text)' }} />
                    )}
                    <button onClick={() => setConditions(cs => cs.filter((_, j) => j !== i))} className="rounded-lg p-1 hover:bg-[var(--theme-hover)]" style={{ color: 'var(--theme-danger)' }}>
                      <HugeiconsIcon icon={Delete01Icon} size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── THEN ─────────────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--theme-accent)' }}>3</span>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">Then (actions — run in order)</span>
              </div>
              <button onClick={addAction} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--theme-accent)' }}>
                <HugeiconsIcon icon={Add01Icon} size={13} /> Add action
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {actions.map((action, i) => (
                <ActionEditor
                  key={i}
                  action={action}
                  onChange={a => setActions(as => as.map((x, j) => j === i ? a : x))}
                  onRemove={() => setActions(as => as.filter((_, j) => j !== i))}
                />
              ))}
              {actions.length === 0 && (
                <p className="rounded-xl border border-dashed py-3 text-center text-[12px] text-[var(--theme-muted)]" style={{ borderColor: 'var(--theme-border)' }}>
                  Add at least one action
                </p>
              )}
            </div>
          </section>

          {/* Variables hint */}
          <p className="text-[11px] text-[var(--theme-muted)]">
            💡 Use <code className="rounded bg-[var(--theme-hover)] px-1 py-0.5">{'{{contact_name}}'}</code> <code className="rounded bg-[var(--theme-hover)] px-1 py-0.5">{'{{contact_email}}'}</code> <code className="rounded bg-[var(--theme-hover)] px-1 py-0.5">{'{{contact_stage}}'}</code> in text fields.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-[13px] text-[var(--theme-muted)]" style={{ borderColor: 'var(--theme-border)' }}>Cancel</button>
          <button
            onClick={() => {
              if (!name.trim()) { toast('Name is required', { type: 'error' }); return }
              if (actions.length === 0) { toast('Add at least one action', { type: 'error' }); return }
              onSave({ name, description, trigger, conditions, actions })
            }}
            className="btn-primary rounded-xl px-4 py-2 text-[13px] font-medium text-white"
          >
            {initial ? 'Save changes' : 'Create automation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AutomationsScreen() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | AutomationRecord | null>(null)

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: fetchAutomations,
  })

  const create = useMutation({
    mutationFn: (input: AutomationInput) => createAutomation(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); setModal(null); toast('Automation created') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateAutomation>[1] }) => updateAutomation(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); setModal(null); toast('Saved') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  })

  const enabled = automations.filter(a => a.enabled)
  const disabled = automations.filter(a => !a.enabled)

  return (
    <>
      <ScreenShell
        icon={FlowSquareIcon}
        title="Automations"
        count={automations.length}
        subtitle="IF trigger → check conditions → run actions"
        action={
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white">
            <HugeiconsIcon icon={Add01Icon} size={15} />
            New automation
          </button>
        }
      >
        {isLoading ? (
          <p className="py-12 text-center text-[13px] text-[var(--theme-muted)]">Loading…</p>
        ) : automations.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center" style={{ borderColor: 'var(--theme-border)' }}>
            <p className="text-[36px]">⚡</p>
            <p className="mt-2 text-[14px] font-medium text-[var(--theme-text)]">No automations yet</p>
            <p className="mt-1 text-[13px] text-[var(--theme-muted)]">Create your first rule to start automating your business workflows.</p>
            <button onClick={() => setModal('create')} className="mt-4 text-[13px] font-medium" style={{ color: 'var(--theme-accent)' }}>
              Create first automation →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {[{ label: 'Active', items: enabled }, { label: 'Paused', items: disabled }]
              .filter(g => g.items.length > 0)
              .map(group => (
                <section key={group.label}>
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--theme-muted)] opacity-70">{group.label}</h2>
                  <div className="flex flex-col gap-2">
                    {group.items.map(auto => (
                      <div
                        key={auto.id}
                        className="group flex items-start gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm"
                        style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)', backdropFilter: 'blur(12px)' }}
                      >
                        {/* Trigger badge */}
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px]"
                          style={{ background: auto.enabled ? 'var(--theme-accent-soft)' : 'var(--theme-hover)' }}
                        >
                          {TRIGGER_EMOJIS[auto.trigger]}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[var(--theme-text)]">{auto.name}</span>
                            {auto.run_count > 0 && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--theme-muted)]" style={{ background: 'var(--theme-hover)' }}>
                                {auto.run_count} runs
                              </span>
                            )}
                          </div>
                          {auto.description && (
                            <p className="mt-0.5 text-[12px] text-[var(--theme-muted)]">{auto.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--theme-muted)]">
                            <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--theme-accent-soft)', color: 'var(--theme-accent)' }}>
                              {TRIGGER_EMOJIS[auto.trigger]} {TRIGGER_LABELS[auto.trigger]}
                            </span>
                            {auto.conditions.length > 0 && <span>· {auto.conditions.length} condition{auto.conditions.length > 1 ? 's' : ''}</span>}
                            <span>→</span>
                            {auto.actions.map((a, i) => (
                              <span key={i} className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--theme-border)' }}>
                                {ACTION_EMOJIS[a.type]} {ACTION_LABELS[a.type]}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {/* Enable/disable toggle */}
                          <button
                            onClick={() => update.mutate({ id: auto.id, patch: { enabled: !auto.enabled } })}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                            title={auto.enabled ? 'Pause' : 'Enable'}
                            style={{ color: auto.enabled ? 'var(--theme-success)' : 'var(--theme-muted)' }}
                          >
                            <HugeiconsIcon icon={PlayIcon} size={15} />
                          </button>
                          <button
                            onClick={() => setModal(auto)}
                            className="rounded-lg p-1.5 text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-hover)] hover:text-[var(--theme-text)]"
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                          </button>
                          <button
                            onClick={() => remove.mutate(auto.id)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                            style={{ color: 'var(--theme-danger)' }}
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </ScreenShell>

      {modal && (
        <BuilderModal
          initial={modal === 'create' ? null : modal}
          onSave={input =>
            modal === 'create'
              ? create.mutate(input)
              : update.mutate({ id: (modal as AutomationRecord).id, patch: input })
          }
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
