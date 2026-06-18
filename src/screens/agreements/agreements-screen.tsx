import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Agreement01Icon,
  PlusSignIcon,
  Mail01Icon,
  Delete01Icon,
  Archive01Icon,
  Copy01Icon,
  DocumentValidationIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  GridIcon,
  ArrowLeft01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { toast } from '@/components/toast'
import { useBrand } from '@/contexts/BrandContext'
import {
  fetchAgreements,
  createAgreement,
  deleteAgreement,
  updateAgreement,
  STATUS_LABELS,
  STATUS_COLORS,
  timeAgo,
  type AgreementDocument,
  type AgreementStatus,
} from '@/lib/agreements-api'
import { HFM_TEMPLATES, RECIPIENT_COLORS } from '@/lib/agreement-templates'

type TabKey = 'all' | 'draft' | 'sent' | 'completed' | 'archived' | 'templates'
const SENT_STATUSES: AgreementStatus[] = ['sent', 'viewed', 'signed']

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Documents' },
  { key: 'draft', label: 'Drafts' },
  { key: 'sent', label: 'Awaiting' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
  { key: 'templates', label: 'Templates' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Status pill ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: AgreementStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.text }} />
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Recipient avatars ──────────────────────────────────────────────────────

function RecipientAvatars({ recipients }: { recipients?: AgreementDocument['recipients'] }) {
  if (!recipients?.length) return <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>—</span>
  const shown = recipients.slice(0, 4)
  const overflow = recipients.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((r, i) => (
        <div
          key={r.id}
          title={`${r.recipient_name} (${r.status})`}
          className="relative -ml-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white first:ml-0"
          style={{ background: RECIPIENT_COLORS[i % RECIPIENT_COLORS.length], boxShadow: '0 0 0 2px var(--theme-card)', zIndex: shown.length - i }}
        >
          {initials(r.recipient_name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{ background: 'var(--theme-border)', color: 'var(--theme-text-muted)', boxShadow: '0 0 0 2px var(--theme-card)' }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

// ── Stat chip ──────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, accent }: { icon: Parameters<typeof HugeiconsIcon>[0]['icon']; label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="flex flex-1 items-center gap-3 rounded-xl border px-4 py-3"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: accent ? 'rgba(196,160,78,0.12)' : 'rgba(148,163,184,0.1)', color: accent ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }}
      >
        <HugeiconsIcon icon={icon} size={20} />
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none" style={{ color: 'var(--theme-text)' }}>{value}</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Document row ───────────────────────────────────────────────────────────

function DocRow({
  doc,
  onOpen,
  onSend,
  onCopyLink,
  onArchive,
  onDelete,
}: {
  doc: AgreementDocument
  onOpen: () => void
  onSend: (e: React.MouseEvent) => void
  onCopyLink: (e: React.MouseEvent) => void
  onArchive: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const lastActivity = doc.completed_at ?? doc.sent_at ?? doc.updated_at

  return (
    <tr
      className="group/row cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--theme-border)' }}
      onClick={onOpen}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Name + icon */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'rgba(196,160,78,0.1)' }}
          >
            <HugeiconsIcon icon={Agreement01Icon} size={16} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{doc.title}</p>
            <p className="text-[11px] capitalize" style={{ color: 'var(--theme-text-muted)' }}>{doc.type}</p>
          </div>
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusPill status={doc.status} />
      </td>
      {/* Recipients */}
      <td className="px-4 py-3.5">
        <RecipientAvatars recipients={doc.recipients} />
      </td>
      {/* Last activity */}
      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        {timeAgo(lastActivity)}
      </td>
      {/* Actions (visible on hover) */}
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
          <ActionBtn title="Send" icon={Mail01Icon} onClick={onSend} />
          <ActionBtn title="Copy link" icon={Copy01Icon} onClick={onCopyLink} />
          <ActionBtn title="Archive" icon={Archive01Icon} onClick={onArchive} />
          <ActionBtn title="Delete" icon={Delete01Icon} onClick={onDelete} danger />
        </div>
      </td>
    </tr>
  )
}

function ActionBtn({ icon, title, onClick, danger }: {
  icon: Parameters<typeof HugeiconsIcon>[0]['icon']
  title: string
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-border)]"
      style={{ color: danger ? '#ef4444' : 'var(--theme-text-muted)' }}
    >
      <HugeiconsIcon icon={icon} size={15} />
    </button>
  )
}

// ── New Document Modal ─────────────────────────────────────────────────────

type ModalStep = 'choose' | 'template' | 'blank'

function NewDocumentModal({ onClose }: { onClose: () => void }) {
  const brand = useBrand()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<ModalStep>('choose')
  const [category, setCategory] = useState('all')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<'agreement' | 'proposal'>('agreement')
  const [senderName, setSenderName] = useState(brand.name)
  const [senderEmail, setSenderEmail] = useState('')

  const mut = useMutation({
    mutationFn: (data: Parameters<typeof createAgreement>[1]) => createAgreement(brand.id, data),
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: ['agreements', brand.id] })
      void navigate({ to: '/agreements/$id', params: { id: doc.id } })
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const categories = useMemo(() => {
    const set = new Set(HFM_TEMPLATES.map(t => t.category))
    return ['all', ...Array.from(set)]
  }, [])

  const visibleTemplates = category === 'all' ? HFM_TEMPLATES : HFM_TEMPLATES.filter(t => t.category === category)

  function useTemplate(tpl: typeof HFM_TEMPLATES[number]) {
    mut.mutate({ title: tpl.name, type: 'agreement', content_html: tpl.contentHtml, sender_name: senderName })
  }

  function createBlank(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast('Enter a document title', { type: 'error' }); return }
    mut.mutate({ title: title.trim(), type: docType, content_html: `<h1>${title.trim()}</h1><p>Enter your document content here.</p>`, sender_name: senderName.trim() || brand.name, sender_email: senderEmail.trim() || '' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl"
        style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex items-center gap-2">
            {step !== 'choose' && (
              <button onClick={() => setStep('choose')} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-border)]" style={{ color: 'var(--theme-text-muted)' }}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={17} />
              </button>
            )}
            <h2 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
              {step === 'choose' ? 'Create a New Document' : step === 'template' ? 'Choose a Template' : 'Blank Document'}
            </h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-border)]" style={{ color: 'var(--theme-text-muted)' }}>
            <HugeiconsIcon icon={Cancel01Icon} size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Step: choose */}
          {step === 'choose' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'template' as ModalStep, icon: GridIcon, label: 'From Template', desc: `${HFM_TEMPLATES.length} ready-made ${brand.shortName} templates` },
                { id: 'blank' as ModalStep, icon: Agreement01Icon, label: 'Blank Document', desc: 'Start from scratch and build your own' },
                { id: 'upload' as 'upload', icon: DocumentValidationIcon, label: 'Upload', desc: 'Import a PDF or Word file · Coming soon', disabled: true },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.disabled) { toast('Upload is coming soon'); return }
                    setStep(opt.id as ModalStep)
                  }}
                  className="flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:border-[var(--theme-accent)]"
                  style={{ borderColor: opt.disabled ? 'var(--theme-border)' : 'var(--theme-border)', opacity: opt.disabled ? 0.6 : 1 }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ background: opt.id === 'template' ? 'rgba(196,160,78,0.12)' : 'rgba(148,163,184,0.1)', color: opt.id === 'template' ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }}
                  >
                    <HugeiconsIcon icon={opt.icon} size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{opt.label}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: template */}
          {step === 'template' && (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors"
                    style={{
                      background: category === c ? 'var(--theme-accent)' : 'var(--theme-border)',
                      color: category === c ? '#0e0c09' : 'var(--theme-text-muted)',
                    }}
                  >
                    {c === 'all' ? 'All templates' : c}
                  </button>
                ))}
              </div>
              <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
                {visibleTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className="flex flex-col rounded-xl border p-4 transition-all"
                    style={{ borderColor: 'var(--theme-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(196,160,78,0.1)', color: 'var(--theme-accent)' }}>
                        <HugeiconsIcon icon={Agreement01Icon} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{tpl.name}</p>
                        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>{tpl.category}</span>
                      </div>
                    </div>
                    {tpl.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>{tpl.description}</p>
                    )}
                    <button
                      onClick={() => useTemplate(tpl)}
                      disabled={mut.isPending}
                      className="mt-3 w-full rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
                    >
                      {mut.isPending ? 'Creating…' : 'Use Template →'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: blank */}
          {step === 'blank' && (
            <form onSubmit={createBlank} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Document title *</label>
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Wellness Coaching Agreement"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-accent)]"
                  style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as 'agreement' | 'proposal')}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  >
                    <option value="agreement">Agreement</option>
                    <option value="proposal">Proposal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender name</label>
                  <input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  placeholder="you@practice.com"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={!title.trim() || mut.isPending}
                  className="rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
                >
                  {mut.isPending ? 'Creating…' : 'Create Document →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Template grid tab ──────────────────────────────────────────────────────

function TemplateGrid({ onCreate }: { onCreate: (tpl: typeof HFM_TEMPLATES[number]) => void }) {
  const [cat, setCat] = useState('all')
  const cats = useMemo(() => ['all', ...Array.from(new Set(HFM_TEMPLATES.map(t => t.category)))], [])
  const visible = cat === 'all' ? HFM_TEMPLATES : HFM_TEMPLATES.filter(t => t.category === cat)

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors"
            style={{ background: cat === c ? 'var(--theme-accent)' : 'var(--theme-border)', color: cat === c ? '#0e0c09' : 'var(--theme-text-muted)' }}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(tpl => (
          <div
            key={tpl.id}
            className="flex flex-col rounded-2xl border p-5 transition-all hover:shadow-md"
            style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(196,160,78,0.1)' }}>
                <HugeiconsIcon icon={DocumentValidationIcon} size={20} style={{ color: 'var(--theme-accent)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{tpl.name}</p>
                <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(196,160,78,0.1)', color: 'var(--theme-accent)' }}>{tpl.category}</span>
              </div>
            </div>
            {tpl.description && (
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>{tpl.description}</p>
            )}
            <button
              onClick={() => onCreate(tpl)}
              className="mt-4 w-full rounded-xl py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────

export function AgreementsScreen() {
  const brand = useBrand()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('all')
  const [showNew, setShowNew] = useState(false)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['agreements', brand.id],
    queryFn: () => fetchAgreements(brand.id),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => updateAgreement(brand.id, id, { status: 'archived', archived_at: new Date().toISOString() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreements', brand.id] }); toast('Archived') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAgreement(brand.id, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreements', brand.id] }); toast('Deleted') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  // Fast create from template (bypasses modal)
  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createAgreement>[1]) => createAgreement(brand.id, data),
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: ['agreements', brand.id] })
      void navigate({ to: '/agreements/$id', params: { id: doc.id } })
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  function visibleDocs(): AgreementDocument[] {
    if (tab === 'all') return docs.filter(d => d.status !== 'archived')
    if (tab === 'draft') return docs.filter(d => d.status === 'draft')
    if (tab === 'sent') return docs.filter(d => SENT_STATUSES.includes(d.status))
    if (tab === 'completed') return docs.filter(d => d.status === 'completed')
    if (tab === 'archived') return docs.filter(d => d.status === 'archived')
    return []
  }

  async function copySignLink(doc: AgreementDocument) {
    const token = doc.recipients?.[0]?.token
    if (!token) { toast('No signing link — send first', { type: 'error' }); return }
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`)
    toast('Signing link copied')
  }

  const shown = visibleDocs()
  const pending = docs.filter(d => SENT_STATUSES.includes(d.status)).length
  const completed = docs.filter(d => d.status === 'completed').length
  const viewed = docs.filter(d => d.status === 'viewed').length

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--theme-bg-grad)' }}>

      {/* ── Header ── */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(196,160,78,0.1)' }}>
            <HugeiconsIcon icon={Agreement01Icon} size={20} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--theme-text)' }}>Documents</h1>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Send, sign, and track agreements</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
          New Document
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="flex shrink-0 gap-3 border-b px-6 py-3" style={{ borderColor: 'var(--theme-border)' }}>
        <StatChip icon={Agreement01Icon} label="Total documents" value={docs.filter(d => d.status !== 'archived').length} accent />
        <StatChip icon={Clock01Icon} label="Awaiting signature" value={pending} />
        <StatChip icon={CheckmarkCircle01Icon} label="Completed" value={completed} />
        <StatChip icon={Mail01Icon} label="Viewed" value={viewed} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 gap-0 border-b px-6" style={{ borderColor: 'var(--theme-border)' }}>
        {TABS.map(t => {
          const count = t.key === 'all' ? docs.filter(d => d.status !== 'archived').length
            : t.key === 'draft' ? docs.filter(d => d.status === 'draft').length
            : t.key === 'sent' ? pending
            : t.key === 'completed' ? completed
            : t.key === 'archived' ? docs.filter(d => d.status === 'archived').length
            : 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-4 py-2.5 text-xs font-medium transition-colors"
              style={{
                color: tab === t.key ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              }}
            >
              {t.label}
              {t.key !== 'templates' && count > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ background: tab === t.key ? 'rgba(196,160,78,0.15)' : 'var(--theme-border)', color: tab === t.key ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }}
                >
                  {count}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t" style={{ background: 'var(--theme-accent)' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'templates' ? (
          <div className="p-6">
            <TemplateGrid
              onCreate={tpl => createMut.mutate({ title: tpl.name, type: 'agreement', content_html: tpl.contentHtml, sender_name: brand.name })}
            />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }} />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: 'rgba(196,160,78,0.08)' }}>
              <HugeiconsIcon icon={Agreement01Icon} size={36} style={{ color: 'var(--theme-accent)', opacity: 0.4 }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
              {tab === 'draft' ? 'No drafts' : tab === 'sent' ? 'Nothing awaiting signature' : tab === 'completed' ? 'No completed documents' : tab === 'archived' ? 'Archive is empty' : 'No documents yet'}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Create a document and send it to recipients for signatures</p>
            {(tab === 'all' || tab === 'draft') && (
              <button
                onClick={() => setShowNew(true)}
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} />
                Create First Document
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-card)' }}>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Document</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Recipients</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Last Activity</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onOpen={() => void navigate({ to: '/agreements/$id', params: { id: doc.id } })}
                  onSend={e => { e.stopPropagation(); void navigate({ to: '/agreements/$id', params: { id: doc.id } }) }}
                  onCopyLink={e => { e.stopPropagation(); void copySignLink(doc) }}
                  onArchive={e => { e.stopPropagation(); archiveMut.mutate(doc.id) }}
                  onDelete={e => { e.stopPropagation(); if (confirm('Delete this document?')) deleteMut.mutate(doc.id) }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && <NewDocumentModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
