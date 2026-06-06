import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Delete01Icon,
  PencilEdit02Icon,
  TaskEdit01Icon,
} from '@hugeicons/core-free-icons'
import {
  FIELD_TYPE_LABELS,
  createForm,
  deleteForm,
  fetchForms,
  updateForm,
} from '@/lib/forms-api'
import type {
  CreateFormInput,
  FieldType,
  FormField,
  FormRecord,
} from '@/lib/forms-api'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'
import { useBrand } from '@/contexts/BrandContext'

const QUERY_KEY = ['platform', 'forms'] as const

const FIELD_TYPES: FieldType[] = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'date']

function newField(): FormField {
  return {
    id: crypto.randomUUID(),
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
  }
}

// ── Field editor row ─────────────────────────────────────────────────────────
function FieldRow({
  field,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: FormField
  index: number
  total: number
  onChange: (f: FormField) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const set = <K extends keyof FormField>(k: K, v: FormField[K]) =>
    onChange({ ...field, [k]: v })

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              value={field.label}
              onChange={(e) => set('label', e.target.value)}
              placeholder="Field label"
              className="min-w-0 flex-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
            <select
              value={field.type}
              onChange={(e) => set('type', e.target.value as FieldType)}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1.5 text-xs text-[var(--theme-text)]"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {field.type !== 'checkbox' && field.type !== 'select' && (
            <input
              value={field.placeholder ?? ''}
              onChange={(e) => set('placeholder', e.target.value)}
              placeholder="Placeholder text (optional)"
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          )}
          {field.type === 'select' && (
            <input
              value={(field.options ?? []).join(', ')}
              onChange={(e) => set('options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="Options (comma-separated)"
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          )}
          <label className="flex items-center gap-1.5 text-xs text-[var(--theme-muted)]">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => set('required', e.target.checked)}
              className="rounded"
            />
            Required
          </label>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--theme-hover)] disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={12} className="text-[var(--theme-muted)]" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--theme-hover)] disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="text-[var(--theme-muted)]" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--theme-hover)]"
          >
            <HugeiconsIcon icon={Delete01Icon} size={12} style={{ color: 'var(--theme-danger)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Form dialog ──────────────────────────────────────────────────────────────
function FormDialog({
  open,
  initial,
  title,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  initial: { name: string; description: string; fields: FormField[]; status: 'active' | 'draft' }
  title: string
  onClose: () => void
  onSubmit: (data: typeof initial) => void
  isSubmitting: boolean
}) {
  const [form, setForm] = useState(initial)

  useMemo(() => {
    if (open) setForm(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const addField = () => setForm((f) => ({ ...f, fields: [...f.fields, newField()] }))

  const updateField = (idx: number, field: FormField) =>
    setForm((f) => { const fs = [...f.fields]; fs[idx] = field; return { ...f, fields: fs } })

  const deleteField = (idx: number) =>
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }))

  const moveField = (idx: number, dir: -1 | 1) =>
    setForm((f) => {
      const fs = [...f.fields]
      const swap = idx + dir
      if (swap < 0 || swap >= fs.length) return f;
      [fs[idx], fs[swap]] = [fs[swap], fs[idx]]
      return { ...f, fields: fs }
    })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-[var(--theme-text)]">{title}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">Form name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What's this form for?"
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'draft' }))}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)]"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>

          {/* Fields */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--theme-muted)]">
                Fields ({form.fields.length})
              </label>
              <button
                onClick={addField}
                className="flex items-center gap-1 rounded-lg border border-[var(--theme-border)] px-2 py-1 text-[10px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-hover)]"
              >
                <HugeiconsIcon icon={Add01Icon} size={10} />
                Add field
              </button>
            </div>
            <div className="space-y-2">
              {form.fields.length === 0 && (
                <p className="rounded-xl border border-dashed border-[var(--theme-border)] py-6 text-center text-xs text-[var(--theme-muted)]">
                  No fields yet — click Add field to start
                </p>
              )}
              {form.fields.map((field, idx) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  total={form.fields.length}
                  onChange={(f) => updateField(idx, f)}
                  onDelete={() => deleteField(idx)}
                  onMoveUp={() => moveField(idx, -1)}
                  onMoveDown={() => moveField(idx, 1)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={!form.name.trim() || isSubmitting}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--theme-accent)' }}
          >
            {isSubmitting ? 'Saving…' : 'Save Form'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', description: '', fields: [] as FormField[], status: 'draft' as const }

export function FormsScreen() {
  const queryClient = useQueryClient()
  const brand = useBrand()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<FormRecord | null>(null)

  const formsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchForms({ brand: brand.id !== 'hermes' ? brand.id : undefined }),
    refetchInterval: 60_000,
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const createMutation = useMutation({
    mutationFn: (input: CreateFormInput) => createForm(input),
    onSuccess: () => { invalidate(); toast('Form created'); setShowCreate(false) },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to create', { type: 'error' }),
  })

  const updateMutation = useMutation({
    mutationFn: (p: { id: string; updates: Partial<CreateFormInput> }) => updateForm(p.id, p.updates),
    onSuccess: () => { invalidate(); toast('Form updated'); setEditing(null) },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to update', { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteForm(id),
    onSuccess: () => { invalidate(); toast('Form deleted') },
  })

  const toggleStatus = (form: FormRecord) => {
    updateMutation.mutate({ id: form.id, updates: { status: form.status === 'active' ? 'draft' : 'active' } })
  }

  const toInitial = (f: FormRecord) => ({
    name: f.name,
    description: f.description,
    fields: f.fields,
    status: f.status,
  })

  const copyEmbedCode = (form: FormRecord) => {
    const code = `<script src="${location.origin}/embed/form.js" data-form-id="${form.id}"></script>`
    void navigator.clipboard.writeText(code)
    toast('Embed code copied')
  }

  const forms = formsQuery.data ?? []

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-2xl border border-primary-200 bg-primary-50/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={TaskEdit01Icon} size={18} className="text-[var(--theme-accent)]" />
              <h1 className="text-base font-semibold text-[var(--theme-text)]">Forms</h1>
              {formsQuery.data && (
                <span className="ml-1 text-xs text-[var(--theme-muted)]">({forms.length})</span>
              )}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--theme-accent)' }}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} />
              New Form
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--theme-muted)]">
            Build intake forms and lead capture pages. Embed on any website.
          </p>
        </header>

        {/* List */}
        <div className="space-y-2">
          {formsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--theme-muted)]">
              Loading forms…
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--theme-muted)]">
              <HugeiconsIcon icon={TaskEdit01Icon} size={32} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">No forms yet</p>
              <p className="mt-1 text-xs">Create intake forms to capture leads and patient information.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {forms.map((form) => (
                <motion.div
                  key={form.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => toggleStatus(form)}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors',
                            form.status === 'active'
                              ? 'bg-green-500/15 text-green-600'
                              : 'bg-[var(--theme-hover)] text-[var(--theme-muted)]',
                          )}
                          title="Toggle status"
                        >
                          {form.status === 'active' ? '● Active' : '○ Draft'}
                        </button>
                        <h3 className="truncate text-sm font-medium text-[var(--theme-text)]">{form.name}</h3>
                      </div>
                      {form.description && (
                        <p className="mb-1 text-xs text-[var(--theme-muted)]">{form.description}</p>
                      )}
                      <p className="text-[11px] text-[var(--theme-muted)]">
                        {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} ·{' '}
                        {form.submissions_count} submission{form.submissions_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => copyEmbedCode(form)}
                        className="rounded-lg border border-[var(--theme-border)] px-2 py-1 text-[10px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-hover)]"
                        title="Copy embed code"
                      >
                        &lt;/&gt; Embed
                      </button>
                      <button
                        onClick={() => setEditing(form)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} size={14} className="text-[var(--theme-muted)]" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${form.name}"?`)) deleteMutation.mutate(form.id) }}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={14} style={{ color: 'var(--theme-danger)' }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <FormDialog
        open={showCreate}
        initial={EMPTY_FORM}
        title="New Form"
        onClose={() => setShowCreate(false)}
        onSubmit={(f) =>
          createMutation.mutate({
            name: f.name.trim(),
            description: f.description,
            fields: f.fields,
            status: f.status,
            brand: brand.id !== 'hermes' ? brand.id : undefined,
          })
        }
        isSubmitting={createMutation.isPending}
      />
      <FormDialog
        open={editing !== null}
        initial={editing ? toInitial(editing) : EMPTY_FORM}
        title="Edit Form"
        onClose={() => setEditing(null)}
        onSubmit={(f) => {
          if (editing)
            updateMutation.mutate({
              id: editing.id,
              updates: { name: f.name.trim(), description: f.description, fields: f.fields, status: f.status },
            })
        }}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  )
}
