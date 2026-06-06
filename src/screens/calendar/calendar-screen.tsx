import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon, GridViewIcon, ListViewIcon } from '@hugeicons/core-free-icons'
import { ScreenShell } from '@/components/screen-shell'
import { fetchCalendar, type CalendarEvent } from '@/lib/calendar-api'
import { useBrand } from '@/contexts/BrandContext'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = isoDate(year, month, 1)
  const last = new Date(year, month + 1, 0).getDate()
  const to = isoDate(year, month, last)
  return { from, to }
}

const KIND_COLOR: Record<string, string> = {
  social: '#4f7ef8',
  campaign: '#f87b4f',
}
const KIND_EMOJI: Record<string, string> = { social: '📣', campaign: '✉️' }

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'rgba(79,126,248,0.12)', text: '#4f7ef8' },
  published: { bg: 'rgba(31,168,92,0.12)', text: '#1fa85c' },
  sent: { bg: 'rgba(31,168,92,0.12)', text: '#1fa85c' },
  draft: { bg: 'rgba(160,160,160,0.12)', text: '#888' },
  failed: { bg: 'rgba(212,68,68,0.12)', text: '#d44' },
}

function EventPill({ ev, compact = false }: { ev: CalendarEvent; compact?: boolean }) {
  const color = KIND_COLOR[ev.kind] ?? '#888'
  return (
    <div
      className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight"
      style={{ background: `${color}18`, color, borderLeft: `2px solid ${color}` }}
      title={`${ev.title}${ev.detail ? ' · ' + ev.detail : ''}`}
    >
      <span className="shrink-0">{KIND_EMOJI[ev.kind]}</span>
      {!compact && <span className="truncate">{ev.title}</span>}
    </div>
  )
}

// ── Month grid view ───────────────────────────────────────────────────────────

function MonthGrid({ year, month, eventsByDate }: {
  year: number
  month: number
  eventsByDate: Map<string, CalendarEvent[]>
}) {
  const brand = useBrand()
  const today = new Date()
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: string | null; day: number | null }> = []

  for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: isoDate(year, month, d), day: d })
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })

  return (
    <div>
      {/* Day-of-week header */}
      <div className="mb-1 grid grid-cols-7 gap-px text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-muted)]">
        {DAYS.map(d => <div key={d} className="py-1 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const evs = cell.date ? (eventsByDate.get(cell.date) ?? []) : []
          const isToday = cell.date === todayStr
          return (
            <div
              key={i}
              className="min-h-[80px] rounded-xl border p-1.5"
              style={{
                background: isToday ? `color-mix(in srgb, ${brand.accentColor} 6%, var(--theme-card))` : 'var(--theme-card)',
                borderColor: isToday ? brand.accentColor : 'var(--theme-border)',
                opacity: cell.day ? 1 : 0,
              }}
            >
              {cell.day && (
                <>
                  <div
                    className="mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={isToday
                      ? { background: brand.accentColor, color: 'white' }
                      : { color: 'var(--theme-muted)' }
                    }
                  >
                    {cell.day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {evs.slice(0, 2).map(ev => <EventPill key={ev.id} ev={ev} />)}
                    {evs.length > 2 && (
                      <span className="text-[9px] text-[var(--theme-muted)]">+{evs.length - 2} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Agenda list view ──────────────────────────────────────────────────────────

function AgendaList({ events }: { events: CalendarEvent[] }) {
  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const key = ev.date ?? 'Unscheduled'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'Unscheduled') return 1
      if (b === 'Unscheduled') return -1
      return a.localeCompare(b)
    })
  }, [events])

  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: 'var(--theme-border)' }}>
        <p className="text-[32px]">📅</p>
        <p className="mt-2 text-[14px] font-medium text-[var(--theme-text)]">Nothing scheduled</p>
        <p className="mt-1 text-[13px] text-[var(--theme-muted)]">Schedule a social post or campaign to see it here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([date, evs]) => (
        <div key={date}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--theme-muted)]">
              {date === 'Unscheduled' ? 'Unscheduled' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <div className="h-px flex-1" style={{ background: 'var(--theme-border)' }} />
          </div>
          <div className="flex flex-col gap-2">
            {evs.map(ev => {
              const badge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.draft
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)', backdropFilter: 'blur(10px)' }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px]"
                    style={{ background: `${KIND_COLOR[ev.kind] ?? '#888'}18` }}
                  >
                    {KIND_EMOJI[ev.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--theme-text)]">{ev.title}</p>
                    {ev.detail && <p className="truncate text-[11px] text-[var(--theme-muted)]">{ev.detail}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {ev.status}
                    </span>
                    {ev.scheduled_at && (
                      <span className="text-[10px] text-[var(--theme-muted)]">
                        {new Date(ev.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView] = useState<'month' | 'agenda'>('month')

  const { from, to } = monthRange(year, month)

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () => fetchCalendar(from, to),
  })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      if (ev.date) {
        if (!map.has(ev.date)) map.set(ev.date, [])
        map.get(ev.date)!.push(ev)
      }
    }
    return map
  }, [events])

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <ScreenShell
      icon={Calendar01Icon}
      title="Content Calendar"
      count={events.length}
      subtitle="Scheduled social posts and campaigns"
      action={
        <div className="flex items-center gap-1 rounded-xl border p-0.5" style={{ borderColor: 'var(--theme-border)' }}>
          {(['month', 'agenda'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={view === v
                ? { background: 'var(--theme-accent)', color: 'white' }
                : { color: 'var(--theme-muted)' }
              }
            >
              <HugeiconsIcon icon={v === 'month' ? GridViewIcon : ListViewIcon} size={13} />
              {v === 'month' ? 'Month' : 'Agenda'}
            </button>
          ))}
        </div>
      }
    >
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prev}
          className="rounded-xl border p-2 text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-hover)]"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
        </button>
        <h2 className="text-[14px] font-semibold text-[var(--theme-text)]">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={next}
          className="rounded-xl border p-2 text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-hover)]"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex gap-4">
        {Object.entries(KIND_COLOR).map(([kind, color]) => (
          <div key={kind} className="flex items-center gap-1.5 text-[11px] text-[var(--theme-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </div>
        ))}
      </div>

      {view === 'month'
        ? <MonthGrid year={year} month={month} eventsByDate={eventsByDate} />
        : <AgendaList events={events} />
      }
    </ScreenShell>
  )
}
