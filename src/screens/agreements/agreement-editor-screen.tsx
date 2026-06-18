import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  Mail01Icon,
  UserAdd01Icon,
  Delete01Icon,
  Tick01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Cancel01Icon,
  Copy01Icon,
  Archive01Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from '@/components/toast'
import {
  fetchAgreement,
  updateAgreement,
  sendAgreement,
  fetchActivityLog,
  upsertAgreementField,
  deleteAgreementField,
  addRecipient,
  deleteRecipient,
  STATUS_LABELS,
  STATUS_COLORS,
  timeAgo,
  fmtDate,
  type AgreementDocument,
  type AgreementRecipient,
  type AgreementField,
  type ActivityEntry,
  type FieldType,
} from '@/lib/agreements-api'

const FIELD_TYPES: { type: FieldType; label: string; emoji: string }[] = [
  { type: 'signature', label: 'Signature', emoji: '✍️' },
  { type: 'initials', label: 'Initials', emoji: 'Aa' },
  { type: 'date', label: 'Date', emoji: '📅' },
  { type: 'text', label: 'Text', emoji: 'T' },
  { type: 'checkbox', label: 'Checkbox', emoji: '☑️' },
]

const FIELD_COLORS: Record<FieldType, string> = {
  signature: '#c4a04e',
  initials: '#a855f7',
  date: '#0ea5e9',
  text: '#22c55e',
  checkbox: '#f59e0b',
}

// ── Auto-save debounce hook ───────────────────────────────────────────────────

function useAutoSave(
  brand: string,
  id: string,
  html: string,
  title: string,
  enabled: boolean,
) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (!enabled || isFirstRender.current) { isFirstRender.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState('idle')
    timerRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateAgreement(brand, id, { content_html: html, title })
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('idle')
      }
    }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [html, title, brand, id, enabled])

  return saveState
}

// ── Rich text toolbar ─────────────────────────────────────────────────────────

function EditorToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  const btns = [
    { label: 'B', cmd: 'bold', style: 'font-weight:700' },
    { label: 'I', cmd: 'italic', style: 'font-style:italic' },
    { label: 'U', cmd: 'underline', style: 'text-decoration:underline' },
  ]

  return (
    <div
      className="flex items-center gap-1 border-b px-3 py-2"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      {btns.map(b => (
        <button
          key={b.cmd}
          onMouseDown={e => { e.preventDefault(); exec(b.cmd) }}
          className="rounded px-2 py-1 text-sm transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          style={{ style: b.style, color: 'var(--theme-text)' } as React.CSSProperties}
        >
          <span style={{ ...(b.cmd === 'bold' ? { fontWeight: 700 } : b.cmd === 'italic' ? { fontStyle: 'italic' } : { textDecoration: 'underline' }) }}>
            {b.label}
          </span>
        </button>
      ))}
      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
      {['H1', 'H2', 'H3'].map((h, i) => (
        <button
          key={h}
          onMouseDown={e => { e.preventDefault(); exec('formatBlock', `h${i + 1}`) }}
          className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {h}
        </button>
      ))}
      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
      <button
        onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}
        className="rounded px-2 py-1 text-sm transition-colors hover:bg-[rgba(196,160,78,0.1)]"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        • List
      </button>
      <button
        onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}
        className="ml-auto rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        Clear
      </button>
    </div>
  )
}

// ── Field overlay (draggable) ─────────────────────────────────────────────────

function FieldOverlay({
  field,
  recipientName,
  onDelete,
}: {
  field: AgreementField
  recipientName: string
  onDelete: () => void
}) {
  const color = FIELD_COLORS[field.field_type]
  return (
    <div
      className="group absolute flex items-center gap-1 rounded-lg border text-[10px] font-semibold"
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        minHeight: '28px',
        borderColor: color,
        background: `${color}22`,
        color,
        padding: '3px 6px',
        zIndex: 10,
        cursor: 'default',
      }}
    >
      <span>{FIELD_TYPES.find(f => f.type === field.field_type)?.emoji}</span>
      <span className="truncate">{field.field_type} · {recipientName || 'Unassigned'}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="ml-auto hidden rounded p-0.5 hover:bg-red-100 group-hover:block"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={10} className="text-red-500" />
      </button>
    </div>
  )
}

// ── Send modal ────────────────────────────────────────────────────────────────

function SendModal({
  doc,
  onClose,
  onSent,
}: {
  doc: AgreementDocument
  onClose: () => void
  onSent: () => void
}) {
  const brand = useBrand()
  const qc = useQueryClient()
  const recipients = doc.recipients ?? []
  const [senderName, setSenderName] = useState(doc.sender_name)
  const [senderEmail, setSenderEmail] = useState(doc.sender_email)

  const mut = useMutation({
    mutationFn: () => sendAgreement(brand.id, doc.id, { sender_name: senderName, sender_email: senderEmail }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agreement', brand.id, doc.id] })
      void qc.invalidateQueries({ queryKey: ['agreements', brand.id] })
      toast(`Sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`)
      onSent()
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
        <h2 className="mb-1 text-lg font-bold" style={{ color: 'var(--theme-text)' }}>Send for Signatures</h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {recipients.length === 0
            ? 'Add recipients before sending'
            : `Signing link will be emailed to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
        </p>

        {recipients.length > 0 && (
          <div className="mb-4 space-y-2">
            {recipients.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}>
                  {r.recipient_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{r.recipient_name}</p>
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{r.recipient_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender name</label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender email</label>
            <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="you@example.com" type="email" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || recipients.length === 0}
            className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
          >
            <HugeiconsIcon icon={Mail01Icon} size={14} />
            {mut.isPending ? 'Sending…' : `Send to ${recipients.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ brand, docId }: { brand: string; docId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ['agreement-activity', brand, docId],
    queryFn: () => fetchActivityLog(brand, docId),
    refetchInterval: 15000,
  })

  const dotColor: Record<ActivityEntry['type'], string> = {
    created: '#64748b',
    sent: '#3b82f6',
    viewed: '#0ea5e9',
    signed: '#c4a04e',
    declined: '#ef4444',
    completed: '#22c55e',
  }

  if (events.length === 0) return (
    <p className="py-4 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>No activity yet</p>
  )

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor[e.type] }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--theme-text)' }}>{e.label}</p>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{timeAgo(e.at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function AgreementEditorScreen({ id }: { id: string }) {
  const brand = useBrand()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const editorRef = useRef<HTMLDivElement>(null)
  const docContainerRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState('')
  const [title, setTitle] = useState('')
  const [placingField, setPlacingField] = useState<FieldType | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [newRecipientName, setNewRecipientName] = useState('')
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [activePanel, setActivePanel] = useState<'recipients' | 'fields' | 'activity'>('recipients')
  const initialized = useRef(false)

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['agreement', brand.id, id],
    queryFn: () => fetchAgreement(brand.id, id),
  })

  const isEditable = !doc || doc.status === 'draft'
  const saveState = useAutoSave(brand.id, id, html, title, isEditable && initialized.current)

  // Initialize editor content from fetched doc
  useEffect(() => {
    if (doc && !initialized.current) {
      setHtml(doc.content_html ?? '')
      setTitle(doc.title ?? '')
      initialized.current = true
      if (editorRef.current) editorRef.current.innerHTML = doc.content_html ?? ''
    }
  }, [doc])

  const addRecipientMut = useMutation({
    mutationFn: () => addRecipient(brand.id, id, { recipient_name: newRecipientName, recipient_email: newRecipientEmail }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] })
      setNewRecipientName('')
      setNewRecipientEmail('')
      toast('Recipient added')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const deleteRecipientMut = useMutation({
    mutationFn: (rid: string) => deleteRecipient(brand.id, id, rid),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }) },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const addFieldMut = useMutation({
    mutationFn: (field: Partial<AgreementField>) => upsertAgreementField(brand.id, id, field),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }) },
  })

  const deleteFieldMut = useMutation({
    mutationFn: (fid: string) => deleteAgreementField(brand.id, id, fid),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }) },
  })

  const archiveMut = useMutation({
    mutationFn: () => updateAgreement(brand.id, id, { status: 'archived', archived_at: new Date().toISOString() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agreements', brand.id] })
      toast('Archived')
      void navigate({ to: '/agreements' })
    },
  })

  function handleDocClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingField || !docContainerRef.current) return
    const rect = docContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const recipient = doc?.recipients?.[0]
    addFieldMut.mutate({
      field_type: placingField,
      x: Math.max(0, Math.min(80, x)),
      y: Math.max(0, Math.min(95, y)),
      width: placingField === 'signature' ? 30 : placingField === 'checkbox' ? 5 : 20,
      height: 8,
      required: true,
      recipient_id: recipient?.id ?? '',
      page: 1,
    })
    setPlacingField(null)
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) setHtml(editorRef.current.innerHTML)
  }, [])

  if (isLoading) return (
    <div className="flex h-full items-center justify-center" style={{ background: 'var(--theme-bg-grad)' }}>
      <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }} />
    </div>
  )

  if (isError || !doc) return (
    <div className="flex h-full items-center justify-center" style={{ background: 'var(--theme-bg-grad)' }}>
      <p style={{ color: 'var(--theme-text-muted)' }}>Agreement not found</p>
    </div>
  )

  const statusC = STATUS_COLORS[doc.status]
  const recipients = doc.recipients ?? []
  const fields = doc.fields ?? []

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--theme-bg-grad)' }}>
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
      >
        <button
          onClick={() => void navigate({ to: '/agreements' })}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Back
        </button>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 rounded-lg border-0 bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'var(--theme-text)' }}
            readOnly={!isEditable}
          />
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0"
            style={{ background: statusC.bg, color: statusC.text }}
          >
            {STATUS_LABELS[doc.status]}
          </span>
          {isEditable && (
            <span className="text-[10px] shrink-0" style={{ color: saveState === 'saved' ? '#22c55e' : 'var(--theme-text-muted)' }}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {doc.status === 'draft' && (
            <button
              onClick={() => setShowSend(true)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
            >
              <HugeiconsIcon icon={Mail01Icon} size={13} />
              Send for Signatures
            </button>
          )}
          {(doc.status === 'sent' || doc.status === 'viewed') && (
            <button
              onClick={() => setShowSend(true)}
              className="rounded-xl border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
            >
              Resend
            </button>
          )}
          {doc.status !== 'archived' && (
            <button
              onClick={() => archiveMut.mutate()}
              title="Archive"
              className="rounded-xl border p-1.5 transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <HugeiconsIcon icon={Archive01Icon} size={15} style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Field placement palette */}
          {isEditable && (
            <div
              className="flex shrink-0 items-center gap-2 border-b px-4 py-2"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {placingField ? `Click document to place ${placingField} field` : 'Add field:'}
              </span>
              {placingField ? (
                <button
                  onClick={() => setPlacingField(null)}
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                >
                  Cancel
                </button>
              ) : (
                FIELD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => setPlacingField(ft.type)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                    style={{ background: `${FIELD_COLORS[ft.type]}22`, color: FIELD_COLORS[ft.type] }}
                  >
                    {ft.emoji} {ft.label}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Rich text toolbar */}
          {isEditable && <EditorToolbar editorRef={editorRef} />}

          {/* Document body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="relative mx-auto w-full max-w-[740px] rounded-2xl border shadow-sm"
              style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
              ref={docContainerRef}
              onClick={handleDocClick}
              style={{ cursor: placingField ? 'crosshair' : 'default', background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
            >
              {/* Field overlays */}
              {fields.map(f => (
                <FieldOverlay
                  key={f.id}
                  field={f}
                  recipientName={recipients.find(r => r.id === f.recipient_id)?.recipient_name ?? ''}
                  onDelete={() => deleteFieldMut.mutate(f.id)}
                />
              ))}

              <div
                ref={editorRef}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onInput={handleInput}
                className="min-h-[500px] px-10 py-10 text-sm outline-none"
                style={{
                  color: 'var(--theme-text)',
                  lineHeight: '1.8',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div
          className="flex w-[280px] shrink-0 flex-col border-l overflow-hidden"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
        >
          {/* Panel tabs */}
          <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            {(['recipients', 'fields', 'activity'] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePanel(p)}
                className="flex-1 py-2.5 text-[11px] font-semibold capitalize transition-colors"
                style={{
                  color: activePanel === p ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
                  borderBottom: activePanel === p ? '2px solid var(--theme-accent)' : '2px solid transparent',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Recipients panel */}
            {activePanel === 'recipients' && (
              <div className="space-y-3">
                {recipients.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>No recipients yet</p>
                ) : (
                  recipients.map(r => (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: 'var(--theme-border)' }}>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
                      >
                        {r.recipient_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--theme-text)' }}>{r.recipient_name}</p>
                        <p className="truncate text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{r.recipient_email}</p>
                        <span
                          className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize"
                          style={{
                            background: r.status === 'signed' ? 'rgba(34,197,94,0.1)' : r.status === 'viewed' ? 'rgba(14,165,233,0.1)' : 'rgba(100,116,139,0.1)',
                            color: r.status === 'signed' ? '#22c55e' : r.status === 'viewed' ? '#0ea5e9' : '#64748b',
                          }}
                        >
                          {r.status}
                          {r.viewed_at && r.status === 'viewed' ? ` · ${timeAgo(r.viewed_at)}` : ''}
                          {r.signed_at && r.status === 'signed' ? ` · ${fmtDate(r.signed_at)}` : ''}
                        </span>
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => deleteRecipientMut.mutate(r.id)}
                          className="rounded p-1 transition-colors hover:bg-red-50"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {isEditable && (
                  <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--theme-border)' }}>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Add recipient</p>
                    <input
                      value={newRecipientName}
                      onChange={e => setNewRecipientName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                      style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    />
                    <input
                      value={newRecipientEmail}
                      onChange={e => setNewRecipientEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                      style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    />
                    <button
                      onClick={() => addRecipientMut.mutate()}
                      disabled={!newRecipientName.trim() || !newRecipientEmail.trim() || addRecipientMut.isPending}
                      className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
                    >
                      <HugeiconsIcon icon={UserAdd01Icon} size={12} />
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fields panel */}
            {activePanel === 'fields' && (
              <div className="space-y-2">
                {fields.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {isEditable ? 'Use the toolbar above to add signature fields to the document' : 'No signature fields placed'}
                  </p>
                ) : (
                  fields.map(f => (
                    <div key={f.id} className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: 'var(--theme-border)' }}>
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                        style={{ background: `${FIELD_COLORS[f.field_type]}22`, color: FIELD_COLORS[f.field_type] }}
                      >
                        {FIELD_TYPES.find(ft => ft.type === f.field_type)?.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold capitalize" style={{ color: 'var(--theme-text)' }}>{f.field_type}</p>
                        <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                          {recipients.find(r => r.id === f.recipient_id)?.recipient_name ?? 'Unassigned'}
                          {f.value ? ' · Filled' : f.required ? ' · Required' : ' · Optional'}
                        </p>
                      </div>
                      {isEditable && (
                        <button onClick={() => deleteFieldMut.mutate(f.id)} className="rounded p-1 hover:bg-red-50">
                          <HugeiconsIcon icon={Delete01Icon} size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Activity panel */}
            {activePanel === 'activity' && (
              <ActivityFeed brand={brand.id} docId={id} />
            )}
          </div>
        </div>
      </div>

      {showSend && <SendModal doc={doc} onClose={() => setShowSend(false)} onSent={() => setShowSend(false)} />}
    </div>
  )
}
