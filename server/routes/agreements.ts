import type { Hono, Context } from 'hono'
import {
  listAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  softDeleteAgreement,
  listRecipients,
  getRecipientByToken,
  addRecipient,
  updateRecipient,
  removeRecipientsForDoc,
  listFields,
  upsertField,
  updateField,
  deleteField,

  listAgreementTemplates,
  createAgreementTemplate,
  updateAgreementTemplate,
  deleteAgreementTemplate,
  sendAgreementEmails,
} from '../stores/agreements-store'
import type { AgreementField, AgreementRecipient, AgreementStatus, AgreementType } from '../stores/agreements-store'
import { appendNotification } from '../stores/notifications-store'
import { getBrandId } from '../lib/brand'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOrigin(c: Context<any, any, any>): string {
  const proto = c.req.header('x-forwarded-proto') ?? 'http'
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? 'localhost'
  return `${proto}://${host}`
}

export function registerAgreements(app: Hono) {
  // ── Templates ─────────────────────────────────────────────────────────────

  app.get('/api/agreement-templates', (c) => {
    const brand = getBrandId(c)
    return c.json(listAgreementTemplates(brand))
  })

  app.post('/api/agreement-templates', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    if (!body.name?.trim()) return c.json({ error: 'name required' }, 400)
    return c.json(createAgreementTemplate(brand, {
      name: body.name,
      category: body.category ?? 'General',
      content_html: body.content_html ?? '',
      fields_json: body.fields_json ?? '[]',
    }), 201)
  })

  app.patch('/api/agreement-templates/:id', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    const updated = updateAgreementTemplate(brand, c.req.param('id'), body)
    return updated ? c.json(updated) : c.json({ error: 'not found' }, 404)
  })

  app.delete('/api/agreement-templates/:id', (c) => {
    const brand = getBrandId(c)
    return deleteAgreementTemplate(brand, c.req.param('id'))
      ? c.json({ ok: true })
      : c.json({ error: 'not found' }, 404)
  })

  // ── Public signing routes — MUST be before /:id routes ───────────────────

  app.get('/api/agreements/sign/:token', (c) => {
    const result = getRecipientByToken(c.req.param('token'))
    if (!result) return c.json({ error: 'not found' }, 404)
    const { recipient, brand } = result
    const doc = getAgreement(brand, recipient.document_id)
    if (!doc) return c.json({ error: 'not found' }, 404)
    if (doc.deleted_at) return c.json({ error: 'not found' }, 404)

    // Mark viewed on first open
    if (recipient.status === 'pending') {
      updateRecipient(brand, recipient.id, { status: 'viewed', viewed_at: new Date().toISOString() })
      // Upgrade doc status to 'viewed' if it was just 'sent'
      if (doc.status === 'sent') {
        updateAgreement(brand, doc.id, { status: 'viewed' })
      }
    }

    const fields = listFields(brand, doc.id).filter(f => f.recipient_id === recipient.id)
    const allRecipients = listRecipients(brand, doc.id)
    const signedCount = allRecipients.filter(r => r.status === 'signed').length

    return c.json({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      status: doc.status,
      content_html: doc.content_html,
      sender_name: doc.sender_name,
      recipient,
      fields,
      total_recipients: allRecipients.length,
      signed_count: signedCount,
    })
  })

  app.post('/api/agreements/sign/:token', async (c) => {
    const result = getRecipientByToken(c.req.param('token'))
    if (!result) return c.json({ error: 'not found' }, 404)
    const { recipient, brand } = result
    const doc = getAgreement(brand, recipient.document_id)
    if (!doc) return c.json({ error: 'not found' }, 404)

    if (recipient.status === 'signed') return c.json({ error: 'Already signed' }, 409)
    if (recipient.status === 'declined') return c.json({ error: 'Already declined' }, 409)
    if (doc.deleted_at) return c.json({ error: 'Document unavailable' }, 410)

    const body = await c.req.json().catch(() => ({})) as {
      fields?: { id: string; value: string }[]
      declined?: boolean
    }

    if (body.declined) {
      updateRecipient(brand, recipient.id, { status: 'declined', declined_at: new Date().toISOString() })
      appendNotification({ brand, message: `Agreement declined: ${doc.title}`, context_summary: `Declined by ${recipient.recipient_name}` })
      return c.json({ ok: true, declined: true })
    }

    // Validate and write field values
    for (const submission of body.fields ?? []) {
      if (submission.value && submission.value.length > 2_000_000) {
        return c.json({ error: 'field value too large' }, 400)
      }
      updateField(brand, submission.id, { value: submission.value })
    }

    const now = new Date().toISOString()
    updateRecipient(brand, recipient.id, { status: 'signed', signed_at: now })

    // Check if all recipients have signed → complete the doc
    const allRecipients = listRecipients(brand, doc.id)
    const allSigned = allRecipients.every(r => r.id === recipient.id ? true : r.status === 'signed')
    if (allSigned) {
      updateAgreement(brand, doc.id, { status: 'completed', completed_at: now })
      appendNotification({ brand, message: `Agreement completed: ${doc.title}`, context_summary: `All ${allRecipients.length} parties have signed` })
    } else {
      if (doc.status !== 'signed') {
        updateAgreement(brand, doc.id, { status: 'signed' })
      }
    }

    return c.json({ ok: true, signed_at: now })
  })

  // ── Agreement CRUD ────────────────────────────────────────────────────────

  app.get('/api/agreements', (c) => {
    const brand = getBrandId(c)
    const url = new URL(c.req.url)
    const status = (url.searchParams.get('status') ?? undefined) as AgreementStatus | undefined
    const type = (url.searchParams.get('type') ?? undefined) as AgreementType | undefined
    const docs = listAgreements(brand, { status, type })
    // Attach recipient counts
    const result = docs.map(d => {
      const recipients = listRecipients(brand, d.id)
      return { ...d, recipients, recipient_count: recipients.length }
    })
    return c.json(result)
  })

  app.post('/api/agreements', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    if (!body.title?.trim()) return c.json({ error: 'title required' }, 400)
    const doc = createAgreement(brand, {
      title: body.title,
      type: body.type ?? 'agreement',
      sender_name: body.sender_name ?? '',
      sender_email: body.sender_email ?? '',
      content_html: body.content_html ?? getDefaultContent(body.title),
      template_id: body.template_id,
    })
    // Create recipients if provided
    if (Array.isArray(body.recipients)) {
      for (const r of body.recipients) {
        addRecipient(brand, {
          document_id: doc.id,
          recipient_name: r.recipient_name ?? r.name ?? '',
          recipient_email: r.recipient_email ?? r.email ?? '',
          status: 'pending',
          token: crypto.randomUUID(),
          order: r.order ?? 1,
        })
      }
    }
    appendNotification({ brand, message: `Agreement created: ${doc.title}`, context_summary: '' })
    return c.json(doc, 201)
  })

  app.get('/api/agreements/:id', (c) => {
    const brand = getBrandId(c)
    const doc = getAgreement(brand, c.req.param('id'))
    if (!doc || doc.deleted_at) return c.json({ error: 'not found' }, 404)
    const recipients = listRecipients(brand, doc.id)
    const fields = listFields(brand, doc.id)
    return c.json({ ...doc, recipients, fields })
  })

  app.patch('/api/agreements/:id', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    const updated = updateAgreement(brand, c.req.param('id'), body)
    return updated ? c.json(updated) : c.json({ error: 'not found' }, 404)
  })

  app.delete('/api/agreements/:id', (c) => {
    const brand = getBrandId(c)
    return softDeleteAgreement(brand, c.req.param('id'))
      ? c.json({ ok: true })
      : c.json({ error: 'not found' }, 404)
  })

  // ── Send ──────────────────────────────────────────────────────────────────

  app.post('/api/agreements/:id/send', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({})) as Record<string, string>
    const brand = getBrandId(c)
    const doc = getAgreement(brand, id)
    if (!doc || doc.deleted_at) return c.json({ error: 'not found' }, 404)
    if (doc.status !== 'draft' && doc.status !== 'sent') {
      return c.json({ error: 'Cannot resend a completed or archived agreement' }, 400)
    }

    // Update sender info if provided
    if (body.sender_name || body.sender_email) {
      updateAgreement(brand, id, {
        sender_name: body.sender_name ?? doc.sender_name,
        sender_email: body.sender_email ?? doc.sender_email,
      })
    }

    let recipients = listRecipients(brand, id)

    // If recipients in body, replace them (only when draft)
    if (Array.isArray((body as unknown as { recipients?: AgreementRecipient[] }).recipients) && doc.status === 'draft') {
      removeRecipientsForDoc(brand, id)
      const rList = (body as unknown as { recipients: AgreementRecipient[] }).recipients
      recipients = []
      for (const r of rList) {
        const added = addRecipient(brand, {
          document_id: id,
          recipient_name: r.recipient_name,
          recipient_email: r.recipient_email,
          status: 'pending',
          token: crypto.randomUUID(),
          order: r.order ?? 1,
        })
        recipients.push(added)
      }
    }

    if (recipients.length === 0) {
      return c.json({ error: 'Add at least one recipient before sending' }, 400)
    }

    const now = new Date().toISOString()
    const updated = updateAgreement(brand, id, { status: 'sent', sent_at: doc.sent_at ?? now })
    if (!updated) return c.json({ error: 'update failed' }, 500)

    const origin = getOrigin(c)
    const emailResults = await sendAgreementEmails(brand, updated, recipients, origin)
    const sentCount = emailResults.filter(r => r.ok).length

    appendNotification({
      brand,
      message: `Agreement sent: ${updated.title}`,
      context_summary: `Sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`,
    })

    return c.json({ ...updated, recipients, email_results: emailResults, sent_count: sentCount })
  })

  // ── Recipients ────────────────────────────────────────────────────────────

  app.get('/api/agreements/:id/recipients', (c) => {
    const brand = getBrandId(c)
    return c.json(listRecipients(brand, c.req.param('id')))
  })

  app.post('/api/agreements/:id/recipients', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    const r = addRecipient(brand, {
      document_id: c.req.param('id'),
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email,
      status: 'pending',
      token: crypto.randomUUID(),
      order: body.order ?? 1,
    })
    return c.json(r, 201)
  })

  app.delete('/api/agreements/:id/recipients/:rid', (c) => {
    const brand = getBrandId(c)
    const rid = c.req.param('rid')
    updateRecipient(brand, rid, { status: 'pending' })
    // Actually remove it: reassign via deleteField equivalent
    const allRecipients = listRecipients(brand, c.req.param('id'))
    if (!allRecipients.find(r => r.id === rid)) return c.json({ error: 'not found' }, 404)
    const updated = allRecipients.filter(r => r.id !== rid)
    const { writeJson: _wj, ..._ } = {} as Record<string, unknown>
    void _, _wj
    // Re-save via brand-level recipients file rewrite
    removeRecipientsForDoc(brand, c.req.param('id'))
    for (const r of updated) addRecipient(brand, { ...r, id: r.id } as Omit<AgreementRecipient, 'id'> & { id: string })
    return c.json({ ok: true })
  })

  // ── Fields ────────────────────────────────────────────────────────────────

  app.get('/api/agreements/:id/fields', (c) => {
    const brand = getBrandId(c)
    return c.json(listFields(brand, c.req.param('id')))
  })

  app.post('/api/agreements/:id/fields', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    const field: AgreementField = {
      id: body.id ?? crypto.randomUUID(),
      document_id: c.req.param('id'),
      recipient_id: body.recipient_id ?? '',
      field_type: body.field_type ?? 'signature',
      page: body.page ?? 1,
      x: body.x ?? 10,
      y: body.y ?? 10,
      width: body.width ?? 20,
      height: body.height ?? 8,
      required: body.required ?? true,
      label: body.label,
      value: body.value,
    }
    return c.json(upsertField(brand, field), 201)
  })

  app.patch('/api/agreements/:id/fields/:fid', async (c) => {
    const body = await c.req.json()
    const brand = getBrandId(c)
    const updated = updateField(brand, c.req.param('fid'), body)
    return updated ? c.json(updated) : c.json({ error: 'not found' }, 404)
  })

  app.delete('/api/agreements/:id/fields/:fid', (c) => {
    const brand = getBrandId(c)
    return deleteField(brand, c.req.param('fid'))
      ? c.json({ ok: true })
      : c.json({ error: 'not found' }, 404)
  })

  // ── Activity audit trail ──────────────────────────────────────────────────

  app.get('/api/agreements/:id/activity', (c) => {
    const brand = getBrandId(c)
    const doc = getAgreement(brand, c.req.param('id'))
    if (!doc || doc.deleted_at) return c.json({ error: 'not found' }, 404)
    const recipients = listRecipients(brand, doc.id)
    const events: { type: string; label: string; at: string; name?: string }[] = [
      { type: 'created', label: `Created by ${doc.sender_name || 'you'}`, at: doc.created_at },
    ]
    if (doc.sent_at) events.push({ type: 'sent', label: `Sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`, at: doc.sent_at })
    for (const r of recipients) {
      if (r.viewed_at) events.push({ type: 'viewed', label: `Viewed by ${r.recipient_name}`, at: r.viewed_at, name: r.recipient_name })
      if (r.signed_at) events.push({ type: 'signed', label: `Signed by ${r.recipient_name}`, at: r.signed_at, name: r.recipient_name })
      if (r.declined_at) events.push({ type: 'declined', label: `Declined by ${r.recipient_name}`, at: r.declined_at, name: r.recipient_name })
    }
    if (doc.completed_at) events.push({ type: 'completed', label: 'All parties signed — completed', at: doc.completed_at })
    events.sort((a, b) => b.at.localeCompare(a.at))
    return c.json(events)
  })
}

function getDefaultContent(title: string): string {
  return `<h1>${title}</h1>
<p>This agreement is entered into by the parties identified below.</p>
<h2>Terms</h2>
<p>Add your terms and conditions here. You can format text, add headings, and include lists.</p>
<h2>Signatures</h2>
<p>By signing below, the parties agree to the terms outlined in this document.</p>`
}
