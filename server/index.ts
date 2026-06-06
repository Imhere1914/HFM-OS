import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { registerContacts } from './routes/contacts'

const app = new Hono()

// Brand config (white-label per business via BRAND env)
const BRANDS: Record<string, { id: string; name: string; shortName: string; accentColor: string }> = {
  sc: { id: 'sc', name: 'SC Intelligence', shortName: 'SC', accentColor: '#2f6df6' },
  hfm: { id: 'hfm', name: 'HFM Intelligence', shortName: 'HFM', accentColor: '#7c6f9b' },
  default: { id: 'default', name: 'AI OS', shortName: 'OS', accentColor: '#2f6df6' },
}

app.get('/api/brand', (c) => {
  const id = (process.env.BRAND ?? 'default').toLowerCase()
  return c.json(BRANDS[id] ?? BRANDS.default)
})

app.get('/api/health', (c) => c.json({ ok: true }))

// Module routes
registerContacts(app)

const port = Number(process.env.API_PORT ?? 8787)
serve({ fetch: app.fetch, port })
console.log(`[ai-os] API listening on http://localhost:${port}`)
