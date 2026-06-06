import type { Hono } from 'hono'
import {
  createInvoice,
  deleteInvoice,
  listInvoices,
  updateInvoice,
} from '../stores/invoices-store'

export function registerInvoices(app: Hono) {
  // List
  app.get('/api/invoices', (c) => {
    const brand = c.req.query('brand')
    return c.json(listInvoices(brand))
  })

  // Create
  app.post('/api/invoices', async (c) => {
    const body = await c.req.json()
    if (!body.contact_name?.trim()) return c.json({ error: 'contact_name required' }, 400)
    if (!Array.isArray(body.line_items) || body.line_items.length === 0)
      return c.json({ error: 'at least one line item required' }, 400)
    const invoice = createInvoice(body)
    return c.json(invoice, 201)
  })

  // Update (status, line items, etc.)
  app.patch('/api/invoices/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const brand = body.brand ?? c.req.query('brand')
    const updated = updateInvoice(id, body, brand)
    if (!updated) return c.json({ error: 'not found' }, 404)
    return c.json(updated)
  })

  // Delete
  app.delete('/api/invoices/:id', (c) => {
    const id = c.req.param('id')
    const brand = c.req.query('brand')
    const ok = deleteInvoice(id, brand)
    return ok ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404)
  })
}
