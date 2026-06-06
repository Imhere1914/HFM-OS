
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowDown01Icon,
  Copy01Icon,
  Delete01Icon,
  PencilEdit02Icon,
  RefreshIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import {
  CATEGORY_LABELS,
  TEMPLATE_CATEGORIES,
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  updateTemplate,
} from '@/lib/templates-api'
import type {
  CreateTemplateInput,
  Template,
  TemplateCategory,
} from '@/lib/templates-api'
import {
  PACK_DESCRIPTIONS,
  PACK_LABELS,
  TEMPLATE_PRESETS,
} from '@/lib/template-presets'
import type { TemplatePreset } from '@/lib/template-presets'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'
import { useBrand } from '@/contexts/BrandContext'

const QUERY_KEY = ['platform', 'templates'] as const

type TopTab = 'library' | 'gallery'

type FormState = {
  name: string
  category: TemplateCategory
  subject: string
  body: string
  tags: string
}

const EMPTY_FORM: FormState = {
  name: '',
  category: 'reply',
  subject: '',
  body: '',
  tags: '',
}

function TemplateDialog({
  open,
  initial,
  title,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  initial: FormState
  title: string
  onClose: () => void
  onSubmit: (form: FormState) => void
  isSubmitting: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)

  useMemo(() => {
    if (open) setForm(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-[var(--theme-text)]">
          {title}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
              Template name
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value as TemplateCategory)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)]"
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {form.category === 'email' && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Subject
              </label>
              <input
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
              Body (use {'{{name}}'} for placeholders)
            </label>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-2 text-sm text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
              Tags (comma-separated)
            </label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
            />
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
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Gallery preset card ──────────────────────────────────────────────────────
function PresetCard({
  preset,
  imported,
  importing,
  onImport,
}: {
  preset: TemplatePreset
  imported: boolean
  importing: boolean
  onImport: (p: TemplatePreset) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: 'var(--theme-bg)', color: 'var(--theme-accent)' }}
            >
              {CATEGORY_LABELS[preset.category]}
            </span>
            <h3 className="truncate text-sm font-medium text-[var(--theme-text)]">
              {preset.name}
            </h3>
          </div>
          {preset.subject && (
            <p className="mb-1 text-[11px] font-medium text-[var(--theme-muted)]">
              Subject: {preset.subject}
            </p>
          )}
          <p className="line-clamp-2 text-xs text-[var(--theme-muted)]">
            {preset.body}
          </p>
          {preset.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {preset.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[var(--theme-border)] px-1.5 py-0.5 text-[9px] text-[var(--theme-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {imported ? (
            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--theme-muted)]">
              <HugeiconsIcon icon={Tick02Icon} size={12} className="text-green-500" />
              Imported
            </span>
          ) : (
            <button
              onClick={() => onImport(preset)}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-hover)] disabled:opacity-50"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                className="text-[var(--theme-accent)]"
              />
              {importing ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
export function TemplatesScreen() {
  const queryClient = useQueryClient()
  const brand = useBrand()

  const [topTab, setTopTab] = useState<TopTab>('library')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set())
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

  const templatesQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      fetchTemplates({ brand: brand.id !== 'hermes' ? brand.id : undefined }),
    refetchInterval: 60_000,
  })

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const createMutation = useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplate(input),
    onSuccess: () => {
      invalidate()
      toast('Template saved')
      setShowCreate(false)
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : 'Failed to save', { type: 'error' }),
  })

  const importMutation = useMutation({
    mutationFn: (input: CreateTemplateInput & { _presetId: string }) => {
      const { _presetId: _, ...body } = input
      return createTemplate(body)
    },
    onSuccess: (_, vars) => {
      const id = vars._presetId
      setImportingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
      setImportedIds((prev) => new Set([...prev, id]))
      invalidate()
      toast('Template imported to your library')
    },
    onError: (e, vars) => {
      setImportingIds((prev) => { const s = new Set(prev); s.delete(vars._presetId); return s })
      toast(e instanceof Error ? e.message : 'Failed to import', { type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (p: { id: string; updates: Partial<CreateTemplateInput> }) =>
      updateTemplate(p.id, p.updates),
    onSuccess: () => {
      invalidate()
      toast('Template updated')
      setEditing(null)
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : 'Failed to update', { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      invalidate()
      toast('Template deleted')
    },
  })

  const filtered = useMemo(() => {
    const templates = templatesQuery.data ?? []
    if (categoryFilter === 'all') return templates
    return templates.filter((t) => t.category === categoryFilter)
  }, [templatesQuery.data, categoryFilter])

  // Gallery: filter presets by current brand
  const galleryPresets = useMemo(() => {
    const id = brand.id
    return TEMPLATE_PRESETS.filter((p) => {
      if (p.pack === 'universal') return true
      if (id === 'sc' && p.pack === 'sc-starter') return true
      if (id === 'hfm' && p.pack === 'hfm-starter') return true
      if (id === 'default') return true // show everything in dev
      return false
    })
  }, [brand.id])

  // Group gallery presets by pack
  const galleryByPack = useMemo(() => {
    const map: Record<string, TemplatePreset[]> = {}
    galleryPresets.forEach((p) => {
      if (!map[p.pack]) map[p.pack] = []
      map[p.pack].push(p)
    })
    return map
  }, [galleryPresets])

  const toForm = (t: Template): FormState => ({
    name: t.name,
    category: t.category,
    subject: t.subject,
    body: t.body,
    tags: t.tags.join(', '),
  })

  const fromForm = (f: FormState): CreateTemplateInput => ({
    name: f.name.trim(),
    category: f.category,
    subject: f.subject,
    body: f.body,
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    brand: brand.id !== 'hermes' ? brand.id : undefined,
  })

  const copyBody = (body: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(body)
      toast('Copied to clipboard')
    }
  }

  const handleImport = (preset: TemplatePreset) => {
    if (importingIds.has(preset.id) || importedIds.has(preset.id)) return
    setImportingIds((prev) => new Set([...prev, preset.id]))
    importMutation.mutate({
      _presetId: preset.id,
      name: preset.name,
      category: preset.category,
      subject: preset.subject,
      body: preset.body,
      tags: preset.tags,
      brand: brand.id !== 'hermes' ? brand.id : undefined,
    })
  }

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-primary-200 bg-primary-50/85 p-4 backdrop-blur-xl">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Copy01Icon}
                size={18}
                className="text-[var(--theme-accent)]"
              />
              <h1 className="text-base font-semibold text-[var(--theme-text)]">
                Templates
              </h1>
              {topTab === 'library' && templatesQuery.data && (
                <span className="ml-1 text-xs text-[var(--theme-muted)]">
                  ({templatesQuery.data.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {topTab === 'library' && (
                <>
                  <button
                    onClick={invalidate}
                    className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                    title="Refresh"
                  >
                    <HugeiconsIcon
                      icon={RefreshIcon}
                      size={16}
                      className="text-[var(--theme-muted)]"
                    />
                  </button>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--theme-accent)' }}
                  >
                    <HugeiconsIcon icon={Add01Icon} size={14} />
                    New Template
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Top tab switcher */}
          <div className="mt-3 flex items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-1 w-fit">
            {(['library', 'gallery'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTopTab(tab)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  topTab === tab
                    ? 'text-white shadow-sm'
                    : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
                )}
                style={topTab === tab ? { background: 'var(--theme-accent)' } : undefined}
              >
                {tab === 'library' ? 'My Templates' : 'Gallery'}
              </button>
            ))}
          </div>

          {/* Category filters — library only */}
          {topTab === 'library' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['all', ...TEMPLATE_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    categoryFilter === c
                      ? 'border-transparent text-white'
                      : 'border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]',
                  )}
                  style={
                    categoryFilter === c
                      ? { background: 'var(--theme-accent)' }
                      : undefined
                  }
                >
                  {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* ── Library tab ── */}
        {topTab === 'library' && (
          <div className="flex-1 space-y-2">
            {templatesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-[var(--theme-muted)]">
                Loading templates…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--theme-muted)]">
                <HugeiconsIcon icon={Copy01Icon} size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No templates yet</p>
                <p className="mt-1 text-xs">
                  Create your own or import from the Gallery.
                </p>
                <button
                  onClick={() => setTopTab('gallery')}
                  className="mt-3 rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-hover)]"
                >
                  Browse Gallery
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                            style={{
                              background: 'var(--theme-bg)',
                              color: 'var(--theme-accent)',
                            }}
                          >
                            {CATEGORY_LABELS[t.category]}
                          </span>
                          <h3 className="truncate text-sm font-medium text-[var(--theme-text)]">
                            {t.name}
                          </h3>
                        </div>
                        {t.subject && (
                          <p className="mb-1 text-[11px] font-medium text-[var(--theme-muted)]">
                            Subject: {t.subject}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--theme-muted)]">
                          {t.body}
                        </p>
                        {t.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md border border-[var(--theme-border)] px-1.5 py-0.5 text-[9px] text-[var(--theme-muted)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => copyBody(t.body)}
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                          title="Copy body"
                        >
                          <HugeiconsIcon
                            icon={Copy01Icon}
                            size={14}
                            className="text-[var(--theme-accent)]"
                          />
                        </button>
                        <button
                          onClick={() => setEditing(t)}
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                          title="Edit"
                        >
                          <HugeiconsIcon
                            icon={PencilEdit02Icon}
                            size={14}
                            className="text-[var(--theme-muted)]"
                          />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${t.name}"?`))
                              deleteMutation.mutate(t.id)
                          }}
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
                          title="Delete"
                        >
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            size={14}
                            style={{ color: 'var(--theme-danger)' }}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* ── Gallery tab ── */}
        {topTab === 'gallery' && (
          <div className="space-y-8">
            {Object.entries(galleryByPack).map(([pack, presets]) => (
              <div key={pack}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-[var(--theme-text)]">
                    {PACK_LABELS[pack] ?? pack}
                  </h2>
                  <p className="text-xs text-[var(--theme-muted)]">
                    {PACK_DESCRIPTIONS[pack]}
                  </p>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {presets.map((preset) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        imported={importedIds.has(preset.id)}
                        importing={importingIds.has(preset.id)}
                        onImport={handleImport}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateDialog
        open={showCreate}
        initial={EMPTY_FORM}
        title="New Template"
        onClose={() => setShowCreate(false)}
        onSubmit={(f) => createMutation.mutate(fromForm(f))}
        isSubmitting={createMutation.isPending}
      />
      <TemplateDialog
        open={editing !== null}
        initial={editing ? toForm(editing) : EMPTY_FORM}
        title="Edit Template"
        onClose={() => setEditing(null)}
        onSubmit={(f) => {
          if (editing)
            updateMutation.mutate({ id: editing.id, updates: fromForm(f) })
        }}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  )
}
