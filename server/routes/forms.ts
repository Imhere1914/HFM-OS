import type { Hono } from 'hono'
import {
  createForm,
  deleteForm,
  listForms,
  updateForm,
} from '../stores/forms-store'

export function registerForms(app: Hono) {
  // List
  app.get('/api/forms', (c) => {
    const brand = c.req.query('brand')
    return c.json(listForms(brand))
  })

  // Create
  app.post('/api/forms', async (c) => {
    const body = await c.req.json()
    if (!body.name?.trim()) return c.json({ error: 'name required' }, 400)
    const form = createForm({
      brand: body.brand,
      name: body.name.trim(),
      description: body.description ?? '',
      fields: body.fields ?? [],
      status: body.status ?? 'draft',
    })
    return c.json(form, 201)
  })

  // Update
  app.patch('/api/forms/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const brand = body.brand ?? c.req.query('brand')
    const updated = updateForm(id, body, brand)
    if (!updated) return c.json({ error: 'not found' }, 404)
    return c.json(updated)
  })

  // Delete
  app.delete('/api/forms/:id', (c) => {
    const id = c.req.param('id')
    const brand = c.req.query('brand')
    const ok = deleteForm(id, brand)
    return ok ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404)
  })
}
