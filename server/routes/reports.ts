/**
 * Reports API — pre-computed analytics for the Reports screen.
 * GET /api/reports?brand=xxx
 */
import type { Hono } from 'hono'
import { listContacts } from '../stores/contacts-store'
import { listAppointments } from '../stores/appointments-store'
import { listInvoices } from '../stores/invoices-store'
import { listCampaigns } from '../stores/campaigns-store'
import { listPosts } from '../stores/social-store'

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function last6Months(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function labelMonth(key: string): string {
  const [, m] = key.split('-')
  return MONTH_SHORT[parseInt(m) - 1]
}

export function registerReports(app: Hono): void {
  app.get('/api/reports', (c) => {
    const brand = new URL(c.req.url).searchParams.get('brand')
    const bf = (b?: string | null) => !brand || !b || b === brand || b === 'default'

    const contacts = listContacts({}).filter(ct => bf(ct.brand))
    const appts = listAppointments({}).filter(a => bf((a as { brand?: string }).brand))
    const invoices = listInvoices(brand ?? undefined)
    const campaigns = listCampaigns({}).filter(cp => bf((cp as { brand?: string }).brand))
    const posts = listPosts({}).filter(p => bf((p as { brand?: string }).brand))

    const months = last6Months()

    // ── Pipeline funnel ───────────────────────────────────────────────────────
    const pipeline = {
      lead:      contacts.filter(c => c.stage === 'lead').length,
      contacted: contacts.filter(c => c.stage === 'contacted').length,
      qualified: contacts.filter(c => c.stage === 'qualified').length,
      customer:  contacts.filter(c => c.stage === 'customer').length,
      lost:      contacts.filter(c => c.stage === 'lost').length,
    }
    const pipelineMax = Math.max(...Object.values(pipeline), 1)
    const pipelineFunnel = Object.entries(pipeline).map(([stage, count]) => ({
      stage, count, pct: Math.round((count / pipelineMax) * 100),
    }))

    // ── New contacts per month ────────────────────────────────────────────────
    const contactsByMonth = months.map(mk => ({
      month: labelMonth(mk),
      count: contacts.filter(c => c.created_at && monthKey(c.created_at) === mk).length,
    }))

    // ── Revenue by month ──────────────────────────────────────────────────────
    const paidInvoices = invoices.filter(i => i.status === 'paid' && i.paid_at)
    const revenueByMonth = months.map(mk => ({
      month: labelMonth(mk),
      amount: paidInvoices
        .filter(i => i.paid_at && monthKey(i.paid_at) === mk)
        .reduce((s, i) => s + i.total, 0),
    }))
    const revenueMax = Math.max(...revenueByMonth.map(r => r.amount), 1)

    // ── Appointments by month ──────────────────────────────────────────────────
    const apptsByMonth = months.map(mk => ({
      month: labelMonth(mk),
      count: appts.filter(a => a.starts_at && monthKey(a.starts_at) === mk && a.status !== 'cancelled').length,
    }))

    // ── Campaign summary ──────────────────────────────────────────────────────
    const sentCampaigns = campaigns.filter(c => c.status === 'sent').slice(0, 5)
    const campaignStats = sentCampaigns.map(cp => ({
      name: cp.name,
      recipients: cp.stats?.recipients ?? 0,
      sent: cp.stats?.sent ?? 0,
      opens: 0,
      rate: cp.stats?.recipients ? Math.round(((cp.stats?.sent ?? 0) / cp.stats.recipients) * 100) : 0,
    }))

    // ── Totals ────────────────────────────────────────────────────────────────
    const totals = {
      contacts: contacts.length,
      customers: pipeline.customer,
      revenue_paid: Math.round(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0) * 100) / 100,
      revenue_outstanding: Math.round(invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0) * 100) / 100,
      appointments_completed: appts.filter(a => a.status === 'completed').length,
      campaigns_sent: campaigns.filter(c => c.status === 'sent').length,
      posts_published: posts.filter(p => p.status === 'published').length,
      conversion_rate: contacts.length > 0 ? Math.round((pipeline.customer / contacts.length) * 100) : 0,
    }

    return c.json({
      totals,
      pipelineFunnel,
      contactsByMonth,
      revenueByMonth,
      revenueMax,
      apptsByMonth,
      campaignStats,
    })
  })
}
