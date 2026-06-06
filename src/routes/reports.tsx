import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BarChartIcon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'

export const Route = createFileRoute('/reports')({ component: ReportsScreen })

// ── Data fetching ─────────────────────────────────────────────────────────────

type ReportsData = {
  totals: {
    contacts: number
    customers: number
    revenue_paid: number
    revenue_outstanding: number
    appointments_completed: number
    campaigns_sent: number
    posts_published: number
    conversion_rate: number
  }
  pipelineFunnel: { stage: string; count: number; pct: number }[]
  contactsByMonth: { month: string; count: number }[]
  revenueByMonth: { month: string; amount: number }[]
  revenueMax: number
  apptsByMonth: { month: string; count: number }[]
  campaignStats: { name: string; recipients: number; sent: number; opens: number; rate: number }[]
}

async function fetchReports(brand?: string): Promise<ReportsData> {
  const url = new URL('/api/reports', location.origin)
  if (brand) url.searchParams.set('brand', brand)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load reports')
  return res.json()
}

// ── Chart components ──────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  lead: '#94a3b8', contacted: '#3b82f6', qualified: '#f59e0b', customer: '#22c55e', lost: '#ef4444',
}

function BarChart({ data, valueKey, labelKey, color, formatVal }: {
  data: Record<string, number | string>[]
  valueKey: string
  labelKey: string
  color?: string
  formatVal?: (v: number) => string
}) {
  const values = data.map(d => Number(d[valueKey]))
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-36 items-end gap-1.5">
      {data.map((d, i) => {
        const v = values[i]
        const pct = Math.round((v / max) * 100)
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--theme-muted)] opacity-0 transition-opacity group-hover:opacity-100">
              {formatVal ? formatVal(v) : v}
            </span>
            <div
              className="w-full min-h-[4px] rounded-t-md transition-all duration-500"
              style={{ height: `${Math.max(pct, 4)}%`, background: color ?? 'var(--theme-accent)' }}
            />
            <span className="text-[9px] text-[var(--theme-muted)]">{String(d[labelKey])}</span>
          </div>
        )
      })}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--theme-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: color ?? 'var(--theme-text)' }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--theme-muted)]">{sub}</p>}
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

function ReportsScreen() {
  const brand = useBrand()
  const reportsQuery = useQuery({
    queryKey: ['reports', brand.id],
    queryFn: () => fetchReports(brand.id !== 'default' ? brand.id : undefined),
    refetchInterval: 120_000,
  })

  const data = reportsQuery.data

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-primary-200 bg-primary-50/85 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={BarChartIcon} size={18} className="text-[var(--theme-accent)]" />
            <h1 className="text-base font-semibold text-[var(--theme-text)]">Reports</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--theme-muted)]">Business performance at a glance.</p>
        </header>

        {reportsQuery.isLoading && (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--theme-muted)]">Loading reports…</div>
        )}

        {data && (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Total contacts" value={data.totals.contacts} sub={`${data.totals.customers} customers`} />
              <KpiCard label="Conversion rate" value={`${data.totals.conversion_rate}%`} sub="lead → customer" color="var(--theme-accent)" />
              <KpiCard label="Revenue collected" value={`$${data.totals.revenue_paid.toLocaleString()}`} sub={`$${data.totals.revenue_outstanding.toLocaleString()} outstanding`} color="#22c55e" />
              <KpiCard label="Appts completed" value={data.totals.appointments_completed} sub={`${data.totals.campaigns_sent} campaigns sent`} />
            </div>

            {/* Pipeline funnel */}
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">Pipeline Funnel</h2>
              <div className="space-y-2.5">
                {data.pipelineFunnel.map(row => (
                  <div key={row.stage} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-right text-[11px] font-medium capitalize text-[var(--theme-muted)]">
                      {row.stage}
                    </span>
                    <div className="h-7 flex-1 overflow-hidden rounded-lg bg-[var(--theme-hover)]">
                      <div
                        className="flex h-full items-center px-2 rounded-lg transition-all duration-700"
                        style={{ width: `${Math.max(row.pct, row.count > 0 ? 8 : 0)}%`, background: STAGE_COLORS[row.stage] ?? 'var(--theme-accent)' }}
                      >
                        <span className="text-[11px] font-bold text-white">{row.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* New contacts by month */}
              <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">New Contacts</h2>
                <BarChart data={data.contactsByMonth} valueKey="count" labelKey="month" />
              </div>

              {/* Revenue by month */}
              <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">Revenue Collected</h2>
                <BarChart
                  data={data.revenueByMonth}
                  valueKey="amount"
                  labelKey="month"
                  color="#22c55e"
                  formatVal={v => `$${v.toFixed(0)}`}
                />
              </div>

              {/* Appointments by month */}
              <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">Appointments</h2>
                <BarChart data={data.apptsByMonth} valueKey="count" labelKey="month" color="#f59e0b" />
              </div>
            </div>

            {/* Campaign stats */}
            {data.campaignStats.length > 0 && (
              <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">Recent Campaigns</h2>
                <div className="space-y-2">
                  {data.campaignStats.map((cp, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[var(--theme-text)]">{cp.name}</p>
                        <p className="text-[10px] text-[var(--theme-muted)]">{cp.recipients} recipients</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold" style={{ color: cp.rate >= 80 ? '#22c55e' : 'var(--theme-text)' }}>{cp.rate}%</p>
                        <p className="text-[10px] text-[var(--theme-muted)]">delivery</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
