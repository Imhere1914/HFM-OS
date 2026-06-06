import type { Hono } from 'hono'
import {
  createContact, deleteContact, getContact, isContactSource,
  isContactStage, listContacts, updateContact,
} from '../stores/contacts-store'
import { triggerAutomations } from '../lib/automation-engine'

export function registerContacts(app: Hono): void {
  app.get('/api/contacts', (c) => {
    const url = new URL(c.req.url)
    return c.json({ contacts: listContacts({ stage: url.searchParams.get('stage'), source: url.searchParams.get('source'), search: url.searchParams.get('search') }) })
  })

  app.post('/api/contacts', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    if (!body.name || typeof body.name !== 'string') return c.json({ error: 'name is required' }, 400)
    const contact = createContact({
      name: body.name,
      email: typeof body.email === 'string' ? body.email : null,
      phone: typeof body.phone === 'string' ? body.phone : null,
      company: typeof body.company === 'string' ? body.company : null,
      stage: isContactStage(body.stage) ? body.stage : undefined,
      source: isContactSource(body.source) ? body.source : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [],
      notes: typeof body.notes === 'string' ? body.notes : '',
      owner: typeof body.owner === 'string' ? body.owner : null,
    })
    // Fire automation trigger (non-blocking)
    void triggerAutomations('new_contact', {
      contact_id: contact.id,
      contact_name: contact.name,
      contact_email: contact.email ?? undefined,
      contact_stage: contact.stage,
      contact_tags: contact.tags,
      contact_source: contact.source ?? undefined,
    })
    return c.json({ contact }, 201)
  })

  app.get('/api/contacts/:id', (c) => {
    const contact = getContact(c.req.param('id'))
    return contact ? c.json({ contact }) : c.json({ error: 'Contact not found' }, 404)
  })

  app.patch('/api/contacts/:id', async (c) => {
    const id = c.req.param('id')
    const prev = getContact(id)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const contact = updateContact(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      email: body.email === null || typeof body.email === 'string' ? (body.email as string | null) : undefined,
      phone: body.phone === null || typeof body.phone === 'string' ? (body.phone as string | null) : undefined,
      company: body.company === null || typeof body.company === 'string' ? (body.company as string | null) : undefined,
      stage: isContactStage(body.stage) ? body.stage : undefined,
      source: isContactSource(body.source) ? body.source : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      owner: body.owner === null || typeof body.owner === 'string' ? (body.owner as string | null) : undefined,
    })
    if (!contact) return c.json({ error: 'Contact not found' }, 404)
    // Fire stage-change trigger if stage changed
    if (prev && contact.stage !== prev.stage) {
      void triggerAutomations('contact_stage_changed', {
        contact_id: contact.id,
        contact_name: contact.name,
        contact_email: contact.email ?? undefined,
        contact_stage: contact.stage,
        contact_tags: contact.tags,
        contact_source: contact.source ?? undefined,
        previous_stage: prev.stage,
      })
    }
    return c.json({ contact })
  })

  app.delete('/api/contacts/:id', (c) => {
    const ok = deleteContact(c.req.param('id'))
    return ok ? c.json({ ok: true }) : c.json({ error: 'Contact not found' }, 404)
  })
}
