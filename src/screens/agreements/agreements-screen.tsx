import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Agreement01Icon,
  PlusSignIcon,
  Archive01Icon,
  Delete01Icon,
  Copy01Icon,
  DocumentValidationIcon,
  GridIcon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from '@/components/toast'
import {
  fetchAgreements,
  createAgreement,
  deleteAgreement,
  updateAgreement,
  fetchAgreementTemplates,
  STATUS_LABELS,
  STATUS_COLORS,
  timeAgo,
  type AgreementDocument,
  type AgreementStatus,
  type AgreementTemplate,
} from '@/lib/agreements-api'

type Tab = 'all' | 'sent' | 'drafts' | 'templates' | 'archive'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'templates', label: 'Templates' },
  { id: 'archive', label: 'Archive' },
]

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgreementStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Recipient avatars ─────────────────────────────────────────────────────────

function RecipientAvatars({ recipients }: { recipients: AgreementDocument['recipients'] }) {
  if (!recipients?.length) return null
  return (
    <div className="flex items-center -space-x-1.5">
      {recipients.slice(0, 4).map((r) => {
        const color = r.status === 'signed' ? '#22c55e' : r.status === 'viewed' ? '#0ea5e9' : r.status === 'declined' ? '#ef4444' : '#64748b'
        return (
          <div
            key={r.id}
            title={`${r.recipient_name} (${r.status})`}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold text-white"
            style={{ background: color, borderColor: 'var(--theme-card)' }}
          >
            {r.recipient_name.charAt(0).toUpperCase()}
          </div>
        )
      })}
      {(recipients.length > 4) && (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold"
          style={{ background: 'var(--theme-border)', color: 'var(--theme-text-muted)', borderColor: 'var(--theme-card)' }}
        >
          +{recipients.length - 4}
        </div>
      )}
    </div>
  )
}

// ── Agreement card ────────────────────────────────────────────────────────────

function AgreementCard({
  doc,
  onEdit,
  onDelete,
  onArchive,
  onCopyLink,
}: {
  doc: AgreementDocument
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
  onCopyLink: () => void
}) {
  const lastActivity = doc.completed_at ?? doc.sent_at ?? doc.updated_at

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all hover:shadow-md"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(196,160,78,0.1)' }}
          >
            <HugeiconsIcon icon={Agreement01Icon} size={18} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
              {doc.title}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} · {timeAgo(lastActivity)}
            </p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <RecipientAvatars recipients={doc.recipients} />
        {doc.recipients && doc.recipients.length > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
            {doc.recipients.filter(r => r.status === 'signed').length}/{doc.recipients.length} signed
          </span>
        )}
      </div>

      {/* Context menu */}
      <div
        className="absolute right-3 top-3 hidden gap-1 group-hover:flex"
        onClick={(e) => e.stopPropagation()}
      >
        {doc.status === 'sent' || doc.status === 'viewed' ? (
          <button
            title="Copy signing link"
            onClick={onCopyLink}
            className="rounded-lg p-1.5 transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          >
            <HugeiconsIcon icon={Copy01Icon} size={14} style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        ) : null}
        {doc.status !== 'archived' && (
          <button
            title="Archive"
            onClick={onArchive}
            className="rounded-lg p-1.5 transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          >
            <HugeiconsIcon icon={Archive01Icon} size={14} style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        )}
        <button
          title="Delete"
          onClick={onDelete}
          className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
        >
          <HugeiconsIcon icon={Delete01Icon} size={14} className="text-red-400" />
        </button>
      </div>
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ tmpl, onUse }: { tmpl: AgreementTemplate; onUse: () => void }) {
  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all hover:shadow-md"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(196,160,78,0.1)' }}
        >
          <HugeiconsIcon icon={DocumentValidationIcon} size={18} style={{ color: 'var(--theme-accent)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{tmpl.name}</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(196,160,78,0.1)', color: 'var(--theme-accent)' }}
          >
            {tmpl.category}
          </span>
        </div>
      </div>
      <button
        onClick={onUse}
        className="w-full rounded-xl py-2 text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
      >
        Use Template
      </button>
    </div>
  )
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({
  brand,
  onClose,
  template,
}: {
  brand: string
  onClose: () => void
  template?: AgreementTemplate
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState(template ? `${template.name} – Copy` : '')
  const [type, setType] = useState<'agreement' | 'proposal'>('agreement')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')

  const mut = useMutation({
    mutationFn: () => createAgreement(brand, {
      title: title.trim(),
      type,
      sender_name: senderName,
      sender_email: senderEmail,
      content_html: template?.content_html,
      template_id: template?.id,
    }),
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: ['agreements', brand] })
      void navigate({ to: '/agreements/$id', params: { id: doc.id } })
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
      >
        <h2 className="mb-4 text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
          {template ? `Use "${template.name}"` : 'New Agreement'}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Agreement title"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
              style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'agreement' | 'proposal')}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              <option value="agreement">Agreement</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Your name</label>
              <input
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
                style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Your email</label>
              <input
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
                style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!title.trim() || mut.isPending}
            className="rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
          >
            {mut.isPending ? 'Creating…' : 'Create →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AgreementsScreen() {
  const brand = useBrand()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [useTemplate, setUseTemplate] = useState<AgreementTemplate | undefined>()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['agreements', brand.id],
    queryFn: () => fetchAgreements(brand.id),
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['agreement-templates', brand.id],
    queryFn: () => fetchAgreementTemplates(brand.id),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAgreement(brand.id, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreements', brand.id] }); toast('Deleted') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => updateAgreement(brand.id, id, { status: 'archived', archived_at: new Date().toISOString() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreements', brand.id] }); toast('Archived') },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  function visibleDocs() {
    if (tab === 'all') return docs.filter(d => d.status !== 'archived')
    if (tab === 'sent') return docs.filter(d => ['sent', 'viewed', 'signed', 'completed'].includes(d.status))
    if (tab === 'drafts') return docs.filter(d => d.status === 'draft')
    if (tab === 'archive') return docs.filter(d => d.status === 'archived')
    return []
  }

  async function copySignLink(doc: AgreementDocument) {
    const firstRecipient = doc.recipients?.[0]
    if (!firstRecipient?.token) { toast('No signing link available', { type: 'error' }); return }
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${firstRecipient.token}`)
    toast('Link copied')
  }

  const shown = visibleDocs()

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--theme-bg-grad)' }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'rgba(196,160,78,0.1)' }}
          >
            <HugeiconsIcon icon={Agreement01Icon} size={20} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--theme-text)' }}>Agreements</h1>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Send, sign, and track documents</p>
          </div>
        </div>
        <button
          onClick={() => { setUseTemplate(undefined); setShowCreate(true) }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
          New Agreement
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0 gap-1 border-b px-6 pt-3"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors"
            style={{
              color: tab === t.id ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--theme-accent)' : '2px solid transparent',
            }}
          >
            {t.label}
            {t.id !== 'templates' && t.id !== 'archive' && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: 'var(--theme-border)' }}
              >
                {t.id === 'all' ? docs.filter(d => d.status !== 'archived').length
                  : t.id === 'sent' ? docs.filter(d => ['sent','viewed','signed','completed'].includes(d.status)).length
                  : docs.filter(d => d.status === 'draft').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'templates' ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {templates.length} template{templates.length !== 1 ? 's' : ''}
              </p>
            </div>
            {templates.length === 0 ? (
              <div className="py-16 text-center">
                <HugeiconsIcon icon={GridIcon} size={40} style={{ color: 'var(--theme-border)', margin: '0 auto 12px' }} />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No templates yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(t => (
                  <TemplateCard
                    key={t.id}
                    tmpl={t}
                    onUse={() => { setUseTemplate(t); setShowCreate(true) }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }} />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(196,160,78,0.08)' }}
            >
              <HugeiconsIcon icon={Agreement01Icon} size={32} style={{ color: 'var(--theme-accent)', opacity: 0.5 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {tab === 'drafts' ? 'No drafts' : tab === 'sent' ? 'Nothing sent yet' : tab === 'archive' ? 'Archive is empty' : 'No agreements yet'}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Create an agreement and send it for signatures
            </p>
            {tab === 'all' && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
              >
                Create First Agreement
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(doc => (
              <AgreementCard
                key={doc.id}
                doc={doc}
                onEdit={() => void navigate({ to: '/agreements/$id', params: { id: doc.id } })}
                onDelete={() => { if (confirm('Delete this agreement?')) deleteMut.mutate(doc.id) }}
                onArchive={() => archiveMut.mutate(doc.id)}
                onCopyLink={() => void copySignLink(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          brand={brand.id}
          onClose={() => { setShowCreate(false); setUseTemplate(undefined) }}
          template={useTemplate}
        />
      )}
    </div>
  )
}

// ── Quick stats row ───────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }: { icon: unknown; label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    >
      <HugeiconsIcon icon={icon as Parameters<typeof HugeiconsIcon>[0]['icon']} size={16} style={{ color }} />
      <span className="text-xs font-semibold" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
    </div>
  )
}

export { StatChip }
