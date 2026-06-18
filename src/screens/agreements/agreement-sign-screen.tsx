/**
 * Public agreement signing page — /sign/:token
 * No auth required. Clean white/light theme.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  fetchPublicAgreement,
  submitSignature,
  declineAgreement,
  fmtDate,
  type PublicAgreementDoc,
  type AgreementField,
} from '@/lib/agreements-api'

// ── Signature canvas ──────────────────────────────────────────────────────────

function SignatureCanvas({
  onCapture,
  label,
}: {
  onCapture: (dataUrl: string) => void
  label?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#1e293b'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawing(true)
  }, [isDrawing])

  const stopDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (isDrawing && canvasRef.current) {
      onCapture(canvasRef.current.toDataURL('image/png'))
    }
    setIsDrawing(false)
  }, [isDrawing, onCapture])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
    onCapture('')
  }

  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-semibold text-gray-600">{label} *</label>}
      <div className="overflow-hidden rounded-xl border border-gray-200" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={160}
          className="w-full cursor-crosshair"
          style={{ height: '120px', display: 'block', background: '#fff' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {hasDrawing
          ? <p className="text-xs text-green-600">✓ Captured</p>
          : <p className="text-xs text-gray-400">Draw your {label?.toLowerCase() ?? 'signature'} above</p>
        }
        {hasDrawing && (
          <button onClick={clearCanvas} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ── Field inputs ──────────────────────────────────────────────────────────────

function FieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: AgreementField[]
  values: Record<string, string>
  onChange: (id: string, value: string) => void
}) {
  if (fields.length === 0) return null

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Complete your signature</h2>
      {fields.map(f => (
        <div key={f.id}>
          {f.field_type === 'signature' && (
            <SignatureCanvas
              label={f.label ?? 'Signature'}
              onCapture={(v) => onChange(f.id, v)}
            />
          )}
          {f.field_type === 'initials' && (
            <SignatureCanvas
              label={f.label ?? 'Initials'}
              onCapture={(v) => onChange(f.id, v)}
            />
          )}
          {f.field_type === 'date' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{f.label ?? 'Date'}{f.required ? ' *' : ''}</label>
              <input
                type="date"
                value={values[f.id] ?? new Date().toISOString().slice(0, 10)}
                onChange={e => onChange(f.id, e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
              />
            </div>
          )}
          {f.field_type === 'text' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{f.label ?? 'Text field'}{f.required ? ' *' : ''}</label>
              <input
                type="text"
                value={values[f.id] ?? ''}
                onChange={e => onChange(f.id, e.target.value)}
                placeholder="Enter text…"
                className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
              />
            </div>
          )}
          {f.field_type === 'checkbox' && (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={values[f.id] === 'true'}
                onChange={e => onChange(f.id, e.target.checked ? 'true' : 'false')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{f.label ?? 'I agree'}{f.required ? ' *' : ''}</span>
            </label>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Recipient progress ────────────────────────────────────────────────────────

function SigningProgress({ signedCount, total }: { signedCount: number; total: number }) {
  if (total <= 1) return null
  const pct = Math.round((signedCount / total) * 100)
  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{signedCount} of {total} parties have signed</p>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: '#22c55e' }} />
      </div>
    </div>
  )
}

// ── Main sign page ────────────────────────────────────────────────────────────

export function AgreementSignScreen({ token }: { token: string }) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [declined, setDeclined] = useState(false)

  const { data, isLoading, isError } = useQuery<PublicAgreementDoc>({
    queryKey: ['public-agreement', token],
    queryFn: () => fetchPublicAgreement(token),
  })

  // Pre-fill date fields with today
  useEffect(() => {
    if (data?.fields) {
      const today = new Date().toISOString().slice(0, 10)
      const presets: Record<string, string> = {}
      data.fields.forEach(f => { if (f.field_type === 'date') presets[f.id] = today })
      if (Object.keys(presets).length > 0) setFieldValues(v => ({ ...presets, ...v }))
    }
  }, [data])

  const signMut = useMutation({
    mutationFn: () => {
      const submissions = (data?.fields ?? []).map(f => ({ id: f.id, value: fieldValues[f.id] ?? '' }))
      return submitSignature(token, submissions)
    },
    onError: (e: Error) => setError(e.message),
  })

  const declineMut = useMutation({
    mutationFn: () => declineAgreement(token),
    onSuccess: () => setDeclined(true),
    onError: (e: Error) => setError(e.message),
  })

  function handleFieldChange(id: string, value: string) {
    setFieldValues(v => ({ ...v, [id]: value }))
  }

  function validateAndSubmit() {
    setError('')
    const fields = data?.fields ?? []
    for (const f of fields) {
      if (!f.required) continue
      const val = fieldValues[f.id] ?? ''
      if (!val || val === 'false') {
        setError(`Please complete: ${f.label ?? f.field_type}`)
        return
      }
    }
    signMut.mutate()
  }

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">Loading document…</p>
    </div>
  )

  if (isError || !data) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm max-w-sm">
        <p className="text-lg font-semibold text-gray-800">Document not found</p>
        <p className="mt-1 text-sm text-gray-400">This link may be invalid or the document was removed.</p>
      </div>
    </div>
  )

  const alreadySigned = data.recipient.status === 'signed'
  const wasDeclined = data.recipient.status === 'declined' || declined
  const isCompleted = data.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-[740px]">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-400">
                  {data.sender_name ? `${data.sender_name} sent you a document to sign` : 'Document for signature'}
                </p>
                <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
                <p className="mt-1 text-sm text-gray-500">For: <span className="font-medium text-gray-700">{data.recipient.recipient_name}</span></p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  isCompleted ? 'bg-green-100 text-green-700'
                  : alreadySigned ? 'bg-purple-100 text-purple-700'
                  : wasDeclined ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-600'
                }`}
              >
                {isCompleted ? 'Completed' : alreadySigned ? 'Signed' : wasDeclined ? 'Declined' : 'Awaiting signature'}
              </span>
            </div>
          </div>

          {/* Document body */}
          <div
            className="px-8 py-6 text-sm text-gray-900 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: data.content_html }}
          />
        </div>

        {/* Progress */}
        <SigningProgress signedCount={data.signed_count} total={data.total_recipients} />

        {/* Sign or state sections */}
        {signMut.isSuccess ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-8 py-8 text-center">
            <div className="mb-3 text-4xl">✅</div>
            <p className="text-lg font-bold text-gray-800">You've signed!</p>
            <p className="mt-1 text-sm text-gray-500">
              Signed on {fmtDate(signMut.data?.signed_at ?? new Date().toISOString())}
            </p>
            <p className="mt-2 text-xs text-gray-400">A record has been saved. Thank you.</p>
          </div>
        ) : alreadySigned ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-8 py-8 text-center">
            <div className="mb-3 text-4xl">✅</div>
            <p className="text-lg font-bold text-gray-800">
              Already signed{data.recipient.signed_at ? ` on ${fmtDate(data.recipient.signed_at)}` : ''}
            </p>
          </div>
        ) : isCompleted ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-8 py-8 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-lg font-bold text-gray-800">All parties have signed</p>
            <p className="mt-1 text-sm text-gray-500">This document is fully executed.</p>
          </div>
        ) : wasDeclined ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-8 text-center">
            <p className="text-lg font-bold text-red-700">You've declined to sign</p>
            <p className="mt-1 text-sm text-gray-500">The sender has been notified.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-8 py-5">
              <h2 className="text-lg font-bold text-gray-900">Your signature</h2>
              <p className="mt-0.5 text-sm text-gray-500">Complete all required fields below, then click Sign & Submit.</p>
            </div>
            <div className="px-8 py-6">
              <FieldInputs
                fields={data.fields}
                values={fieldValues}
                onChange={handleFieldChange}
              />

              {/* Default signature if no fields */}
              {data.fields.length === 0 && (
                <div className="mt-4">
                  <SignatureCanvas
                    label="Signature"
                    onCapture={(v) => handleFieldChange('__default__', v)}
                  />
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-6 flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to decline to sign this document?')) {
                      declineMut.mutate()
                    }
                  }}
                  disabled={declineMut.isPending}
                  className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-40"
                >
                  Decline to sign
                </button>
                <button
                  onClick={validateAndSubmit}
                  disabled={signMut.isPending}
                  className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#1a1a1a' }}
                >
                  {signMut.isPending ? 'Submitting…' : 'Sign & Submit →'}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] text-gray-300">
          Secure digital signature · Do not share this link
        </p>
      </div>
    </div>
  )
}
