import type { Hono } from 'hono'
import { getAvailability, saveAvailability } from '../stores/availability-store'

export function registerAvailability(app: Hono) {
  app.get('/api/availability', (c) => {
    const brand = c.req.query('brand')
    return c.json(getAvailability(brand))
  })

  app.put('/api/availability', async (c) => {
    const body = await c.req.json()
    const brand = body.brand ?? c.req.query('brand')
    const updated = saveAvailability(body, brand)
    return c.json(updated)
  })
}
