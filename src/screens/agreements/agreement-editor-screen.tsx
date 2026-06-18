import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Mail01Icon,
  UserAdd01Icon,
  Delete01Icon,
  Cancel01Icon,
  Archive01Icon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from '@/components/toast'
import {
  fetchAgreement,
  updateAgreement,
  sendAgreement,
  fetchActivityLog,
  upsertAgreementField,
  patchAgreementField,
  deleteAgreementField,
  addRecipient,
  deleteRecipient,
  STATUS_LABELS,
  STATUS_COLORS,
  timeAgo,
  fmtDate,
  type AgreementDocument,
  type AgreementField,
  type ActivityEntry,
  type FieldType,
} from '@/lib/agreements-api'
import { RECIPIENT_COLORS } from '@/lib/agreement-templates'

const FIELD_TYPES: { type: FieldType; label: string; symbol: string }[] = [
  { type: 'signature', label: 'Signature', symbol: '✍' },
  { type: 'initials', label: 'Initials', symbol: 'Aa' },
  { type: 'date', label: 'Date', symbol: '📅' },
  { type: 'text', label: 'Text', symbol: 'T' },
  { type: 'checkbox', label: 'Checkbox', symbol: '☑' },
]

const FIELD_COLORS: Record<FieldType, string> = {
  signature: '#c4a04e',
  initials: '#a855f7',
  date: '#0ea5e9',
  text: '#22c55e',
  checkbox: '#f59e0b',
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

function useAutoSave(brand: string, id: string, html: string, title: string, enabled: boolean) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (!enabled || first.current) { first.current = false; return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateAgreement(brand, id, { content_html: html, title })
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch { setSaveState('idle') }
    }, 800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [html, title, brand, id, enabled])

  return saveState
}

// ── Format toolbar ────────────────────────────────────────────────────────────

function EditorToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1 border-b px-3 py-1.5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
    >
      {[
        { label: <b>B</b>, cmd: 'bold' },
        { label: <i>I</i>, cmd: 'italic' },
        { label: <u>U</u>, cmd: 'underline' },
      ].map((b, i) => (
        <button
          key={i}
          onMouseDown={e => { e.preventDefault(); exec(b.cmd) }}
          className="rounded px-2 py-1 text-sm transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          style={{ color: 'var(--theme-text)' }}
        >
          {b.label}
        </button>
      ))}
      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
      {(['H1', 'H2', 'H3'] as const).map((h, i) => (
        <button
          key={h}
          onMouseDown={e => { e.preventDefault(); exec('formatBlock', `h${i + 1}`) }}
          className="rounded px-2 py-1 text-xs font-bold transition-colors hover:bg-[rgba(196,160,78,0.1)]"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {h}
        </button>
      ))}
      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
      <button onMouseDown={e => { e.preventDefault(); exec('justifyLeft') }} className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]" style={{ color: 'var(--theme-text-muted)' }}>≡L</button>
      <button onMouseDown={e => { e.preventDefault(); exec('justifyCenter') }} className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]" style={{ color: 'var(--theme-text-muted)' }}>≡C</button>
      <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }} className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]" style={{ color: 'var(--theme-text-muted)' }}>• List</button>
      <button onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }} className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]" style={{ color: 'var(--theme-text-muted)' }}>1. List</button>
      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
      <button onMouseDown={e => { e.preventDefault(); exec('removeFormat') }} className="rounded px-2 py-1 text-xs transition-colors hover:bg-[rgba(196,160,78,0.1)]" style={{ color: 'var(--theme-text-muted)' }}>Clear</button>
    </div>
  )
}

// ── Draggable, resizable field overlay ────────────────────────────────────────

function FieldOverlay({
  field,
  recipientName,
  recipientIdx,
  isEditable,
  containerRef,
  onDelete,
  onUpdate,
}: {
  field: AgreementField
  recipientName: string
  recipientIdx: number
  isEditable: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  onDelete: () => void
  onUpdate: (patch: Partial<AgreementField>) => void
}) {
  const [pos, setPos] = useState({ x: field.x, y: field.y, w: field.width, h: field.height })
  const live = useRef(pos)

  // Sync incoming field changes (e.g. after refetch) without overwriting active drag
  useEffect(() => {
    const next = { x: field.x, y: field.y, w: field.width, h: field.height }
    live.current = next
    setPos(next)
  }, [field.x, field.y, field.width, field.height])

  function startDrag(e: React.MouseEvent) {
    if (!isEditable || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const ox = e.clientX, oy = e.clientY
    const sx = live.current.x, sy = live.current.y

    function onMove(e: MouseEvent) {
      const dx = ((e.clientX - ox) / rect.width) * 100
      const dy = ((e.clientY - oy) / rect.height) * 100
      const next = { ...live.current, x: Math.max(0, Math.min(100 - live.current.w, sx + dx)), y: Math.max(0, Math.min(98, sy + dy)) }
      live.current = next
      setPos({ ...next })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      onUpdate({ x: live.current.x, y: live.current.y })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function startResize(e: React.MouseEvent) {
    if (!isEditable || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const ox = e.clientX, oy = e.clientY
    const sw = live.current.w, sh = live.current.h

    function onMove(e: MouseEvent) {
      const dw = ((e.clientX - ox) / rect.width) * 100
      const dh = ((e.clientY - oy) / rect.height) * 100
      const next = { ...live.current, w: Math.max(5, sw + dw), h: Math.max(3, sh + dh) }
      live.current = next
      setPos({ ...next })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      onUpdate({ width: live.current.w, height: live.current.h })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const fcolor = FIELD_COLORS[field.field_type]
  const rcolor = RECIPIENT_COLORS[recipientIdx % RECIPIENT_COLORS.length]

  return (
    <div
      className="group absolute flex select-none items-center gap-1.5 rounded-lg border text-[10px] font-semibold"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
        minHeight: '26px',
        borderColor: fcolor,
        background: `${fcolor}1a`,
        color: fcolor,
        padding: '2px 6px',
        cursor: isEditable ? 'grab' : 'default',
        zIndex: 10,
        boxSizing: 'border-box',
      }}
      onMouseDown={startDrag}
    >
      <span style={{ pointerEvents: 'none' }}>{FIELD_TYPES.find(f => f.type === field.field_type)?.symbol}</span>
      <span className="flex-1 truncate" style={{ pointerEvents: 'none' }}>
        {field.field_type}
      </span>
      {recipientName && (
        <span
          className="rounded-full px-1.5 py-0"
          style={{ background: `${rcolor}33`, color: rcolor, pointerEvents: 'none' }}
        >
          {recipientName.split(' ')[0]}
        </span>
      )}
      {isEditable && (
        <>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="hidden items-center justify-center rounded p-0.5 hover:bg-red-100 group-hover:flex"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={10} className="text-red-500" />
          </button>
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize opacity-0 group-hover:opacity-100"
            style={{ borderRight: `2px solid ${fcolor}`, borderBottom: `2px solid ${fcolor}`, borderRadius: '0 0 4px 0' }}
            onMouseDown={startResize}
          />
        </>
      )}
    </div>
  )
}

// ── Send modal ────────────────────────────────────────────────────────────────

function SendModal({ doc, onClose, onSent }: { doc: AgreementDocument; onClose: () => void; onSent: () => void }) {
  const brand = useBrand()
  const qc = useQueryClient()
  const recipients = doc.recipients ?? []
  const [senderName, setSenderName] = useState(doc.sender_name ?? '')
  const [senderEmail, setSenderEmail] = useState(doc.sender_email ?? '')
  const [message, setMessage] = useState('')

  const mut = useMutation({
    mutationFn: () => sendAgreement(brand.id, doc.id, { sender_name: senderName, sender_email: senderEmail, personal_message: message }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agreement', brand.id, doc.id] })
      void qc.invalidateQueries({ queryKey: ['agreements', brand.id] })
      toast(`Sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`)
      onSent()
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
        <h2 className="mb-1 text-lg font-bold" style={{ color: 'var(--theme-text)' }}>Send for Signatures</h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {recipients.length === 0 ? 'Add recipients before sending' : `Signing link emailed to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
        </p>

        {recipients.length > 0 && (
          <div className="mb-4 space-y-2">
            {recipients.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--theme-border)' }}>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: RECIPIENT_COLORS[i % RECIPIENT_COLORS.length] }}
                >
                  {r.recipient_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{r.recipient_name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>{r.recipient_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender name</label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sender email</label>
            <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="you@example.com" type="email" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} />
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Personal message (optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a note for the recipient…"
            rows={2}
            className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          />
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
    created: '#64748b', sent: '#3b82f6', viewed: '#0ea5e9',
    signed: '#c4a04e', declined: '#ef4444', completed: '#22c55e',
  }

  if (!events.length) return (
    <p className="py-6 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>No activity yet</p>
  )

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor[e.type] }} />
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
  const [activeRecipientIdx, setActiveRecipientIdx] = useState(0)
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

  useEffect(() => {
    if (doc && !initialized.current) {
      setHtml(doc.content_html ?? '')
      setTitle(doc.title ?? '')
      initialized.current = true
      if (editorRef.current) editorRef.current.innerHTML = doc.content_html ?? ''
    }
  }, [doc])

  const addRecipientMut = useMutation({
    mutationFn: () => addRecipient(brand.id, id, { recipient_name: newRecipientName.trim(), recipient_email: newRecipientEmail.trim() }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }),
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const addFieldMut = useMutation({
    mutationFn: (field: Partial<AgreementField>) => upsertAgreementField(brand.id, id, field),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }),
  })

  const updateFieldMut = useMutation({
    mutationFn: ({ fid, patch }: { fid: string; patch: Partial<AgreementField> }) => patchAgreementField(brand.id, id, fid, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }),
  })

  const deleteFieldMut = useMutation({
    mutationFn: (fid: string) => deleteAgreementField(brand.id, id, fid),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agreement', brand.id, id] }),
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
    const recipient = doc?.recipients?.[activeRecipientIdx] ?? doc?.recipients?.[0]
    const defaultW = placingField === 'signature' ? 30 : placingField === 'checkbox' ? 5 : placingField === 'initials' ? 12 : 22
    const defaultH = placingField === 'checkbox' ? 4 : 6
    addFieldMut.mutate({
      field_type: placingField,
      x: Math.max(0, Math.min(100 - defaultW, x - defaultW / 2)),
      y: Math.max(0, Math.min(96, y - defaultH / 2)),
      width: defaultW,
      height: defaultH,
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

      {/* ── Top bar ── */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
      >
        <button
          onClick={() => void navigate({ to: '/agreements' })}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Back
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            readOnly={!isEditable}
            className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'var(--theme-text)' }}
          />
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: statusC.bg, color: statusC.text }}
          >
            {STATUS_LABELS[doc.status]}
          </span>
          {isEditable && (
            <span className="shrink-0 text-[10px]" style={{ color: saveState === 'saved' ? '#22c55e' : 'var(--theme-text-muted)' }}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

      {/* ── Three-zone layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Document column ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Field placement bar */}
          {isEditable && (
            <div
              className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}
            >
              {placingField ? (
                <>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-accent)' }}>
                    Click on the document to place the {placingField} field
                  </span>
                  <button
                    onClick={() => setPlacingField(null)}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Add field:</span>
                  {FIELD_TYPES.map(ft => (
                    <button
                      key={ft.type}
                      onClick={() => { setPlacingField(ft.type); setActivePanel('fields') }}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: `${FIELD_COLORS[ft.type]}1a`, color: FIELD_COLORS[ft.type] }}
                    >
                      {ft.symbol} {ft.label}
                    </button>
                  ))}
                  {recipients.length > 1 && (
                    <>
                      <div className="mx-1 h-4 w-px" style={{ background: 'var(--theme-border)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Assign to:</span>
                      {recipients.map((r, i) => (
                        <button
                          key={r.id}
                          onClick={() => setActiveRecipientIdx(i)}
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
                          style={{
                            background: activeRecipientIdx === i ? `${RECIPIENT_COLORS[i % RECIPIENT_COLORS.length]}33` : 'var(--theme-border)',
                            color: activeRecipientIdx === i ? RECIPIENT_COLORS[i % RECIPIENT_COLORS.length] : 'var(--theme-text-muted)',
                          }}
                        >
                          {r.recipient_name.split(' ')[0]}
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Format toolbar */}
          {isEditable && <EditorToolbar editorRef={editorRef} />}

          {/* Document canvas — letter size feel */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ background: '#e5e7eb', padding: '32px 24px' }}
            onClick={placingField ? handleDocClick : undefined}
          >
            <div
              ref={docContainerRef}
              className="relative mx-auto shadow-lg"
              style={{
                width: '100%',
                maxWidth: '816px',
                minHeight: '1056px',
                background: '#ffffff',
                cursor: placingField ? 'crosshair' : 'default',
                boxSizing: 'border-box',
              }}
              onClick={handleDocClick}
            >
              {/* Field overlays */}
              {fields.map(f => {
                const rIdx = recipients.findIndex(r => r.id === f.recipient_id)
                return (
                  <FieldOverlay
                    key={f.id}
                    field={f}
                    recipientName={recipients.find(r => r.id === f.recipient_id)?.recipient_name ?? ''}
                    recipientIdx={rIdx >= 0 ? rIdx : 0}
                    isEditable={isEditable}
                    containerRef={docContainerRef}
                    onDelete={() => deleteFieldMut.mutate(f.id)}
                    onUpdate={(patch) => updateFieldMut.mutate({ fid: f.id, patch })}
                  />
                )
              })}

              {/* Editable content */}
              <div
                ref={editorRef}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onInput={handleInput}
                className="min-h-[1056px] outline-none"
                style={{
                  padding: '72px 80px',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#1a1a1a',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div
          className="flex w-72 shrink-0 flex-col overflow-hidden border-l"
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
                {p === 'recipients' && recipients.length > 0 && (
                  <span className="ml-1 rounded-full px-1.5 text-[9px]" style={{ background: 'var(--theme-border)' }}>{recipients.length}</span>
                )}
                {p === 'fields' && fields.length > 0 && (
                  <span className="ml-1 rounded-full px-1.5 text-[9px]" style={{ background: 'var(--theme-border)' }}>{fields.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">

            {/* ── Recipients panel ── */}
            {activePanel === 'recipients' && (
              <div className="space-y-2.5">
                {recipients.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>No recipients yet.</p>
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Add someone who needs to sign.</p>
                  </div>
                ) : (
                  recipients.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 rounded-xl border p-2.5"
                      style={{ borderColor: 'var(--theme-border)', borderLeft: `3px solid ${RECIPIENT_COLORS[i % RECIPIENT_COLORS.length]}` }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: RECIPIENT_COLORS[i % RECIPIENT_COLORS.length] }}
                      >
                        {r.recipient_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--theme-text)' }}>{r.recipient_name}</p>
                        <p className="truncate text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{r.recipient_email}</p>
                        <span
                          className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize"
                          style={{
                            background: r.status === 'signed' ? 'rgba(34,197,94,0.12)' : r.status === 'viewed' ? 'rgba(14,165,233,0.12)' : 'rgba(100,116,139,0.12)',
                            color: r.status === 'signed' ? '#22c55e' : r.status === 'viewed' ? '#0ea5e9' : '#64748b',
                          }}
                        >
                          {r.status}
                          {r.viewed_at && r.status === 'viewed' ? ` · ${timeAgo(r.viewed_at)}` : ''}
                          {r.signed_at ? ` · ${fmtDate(r.signed_at)}` : ''}
                        </span>
                      </div>
                      {isEditable && (
                        <button onClick={() => deleteRecipientMut.mutate(r.id)} className="shrink-0 rounded p-1 hover:bg-red-50">
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
                      onKeyDown={e => { if (e.key === 'Enter') addRecipientMut.mutate() }}
                      placeholder="Full name"
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-[var(--theme-accent)]"
                      style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    />
                    <input
                      value={newRecipientEmail}
                      onChange={e => setNewRecipientEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addRecipientMut.mutate() }}
                      placeholder="Email address"
                      type="email"
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-[var(--theme-accent)]"
                      style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    />
                    <button
                      onClick={() => addRecipientMut.mutate()}
                      disabled={!newRecipientName.trim() || !newRecipientEmail.trim() || addRecipientMut.isPending}
                      className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--theme-accent)', color: '#0e0c09' }}
                    >
                      <HugeiconsIcon icon={UserAdd01Icon} size={12} />
                      Add Recipient
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Fields panel ── */}
            {activePanel === 'fields' && (
              <div className="space-y-2">
                {fields.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>No fields placed yet.</p>
                    {isEditable && <p className="mt-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Use the toolbar above the document to add signature, date, or text fields.</p>}
                  </div>
                ) : (
                  fields.map(f => {
                    const rIdx = recipients.findIndex(r => r.id === f.recipient_id)
                    const rColor = RECIPIENT_COLORS[rIdx >= 0 ? rIdx % RECIPIENT_COLORS.length : 0]
                    return (
                      <div key={f.id} className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: 'var(--theme-border)', borderLeft: `3px solid ${FIELD_COLORS[f.field_type]}` }}>
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                          style={{ background: `${FIELD_COLORS[f.field_type]}1a`, color: FIELD_COLORS[f.field_type] }}
                        >
                          {FIELD_TYPES.find(ft => ft.type === f.field_type)?.symbol}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold capitalize" style={{ color: 'var(--theme-text)' }}>{f.field_type}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {recipients[rIdx] && (
                              <span className="rounded-full px-1.5 py-0 text-[9px] font-medium" style={{ background: `${rColor}22`, color: rColor }}>
                                {recipients[rIdx].recipient_name.split(' ')[0]}
                              </span>
                            )}
                            <span className="text-[9px]" style={{ color: 'var(--theme-text-muted)' }}>
                              {f.value ? 'Filled' : f.required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        </div>
                        {isEditable && (
                          <button onClick={() => deleteFieldMut.mutate(f.id)} className="shrink-0 rounded p-1 hover:bg-red-50">
                            <HugeiconsIcon icon={Delete01Icon} size={12} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── Activity panel ── */}
            {activePanel === 'activity' && <ActivityFeed brand={brand.id} docId={id} />}
          </div>
        </div>
      </div>

      {showSend && <SendModal doc={doc} onClose={() => setShowSend(false)} onSent={() => setShowSend(false)} />}
    </div>
  )
}
