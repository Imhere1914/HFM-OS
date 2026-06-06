import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar01Icon,
  Copy01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import {
  DAY_NAMES,
  fetchAvailability,
  saveAvailability,
} from '@/lib/scheduling-api'
import type { BookingSettings, DayRule } from '@/lib/scheduling-api'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'
import { useBrand } from '@/contexts/BrandContext'

const QUERY_KEY = ['platform', 'availability'] as const

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30]
const MAX_PER_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20]
const WINDOW_OPTIONS = [7, 14, 21, 30, 60, 90]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

// Generate time options in 15-min increments
function timeOptions(): string[] {
  const opts: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
}

const TIME_OPTIONS = timeOptions()

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function SchedulingScreen() {
  const queryClient = useQueryClient()
  const brand = useBrand()
  const [dirty, setDirty] = useState(false)
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [copied, setCopied] = useState(false)

  const availQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAvailability(brand.id !== 'hermes' ? brand.id : undefined),
  })

  useEffect(() => {
    if (availQuery.data && !dirty) {
      setSettings(availQuery.data)
    }
  }, [availQuery.data, dirty])

  const saveMutation = useMutation({
    mutationFn: (s: BookingSettings) => saveAvailability({ ...s, brand: brand.id !== 'hermes' ? brand.id : undefined }),
    onSuccess: (saved) => {
      queryClient.setQueryData(QUERY_KEY, saved)
      setSettings(saved)
      setDirty(false)
      toast('Availability saved')
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save', { type: 'error' }),
  })

  const update = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) => {
    setSettings((s) => s ? { ...s, [key]: value } : s)
    setDirty(true)
  }

  const updateDay = (dayIdx: number, patch: Partial<DayRule>) => {
    setSettings((s) => {
      if (!s) return s
      const days = s.days.map((d) => d.day === dayIdx ? { ...d, ...patch } : d)
      return { ...s, days }
    })
    setDirty(true)
  }

  const bookingLink = `${location.origin}/book/${brand.id}`

  const copyLink = () => {
    void navigator.clipboard.writeText(bookingLink)
    setCopied(true)
    toast('Booking link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (availQuery.isLoading || !settings) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-[var(--theme-muted)]">
        Loading availability settings…
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-2xl border border-primary-200 bg-primary-50/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Calendar01Icon} size={18} className="text-[var(--theme-accent)]" />
              <h1 className="text-base font-semibold text-[var(--theme-text)]">Scheduling</h1>
            </div>
            <button
              onClick={() => settings && saveMutation.mutate(settings)}
              disabled={!dirty || saveMutation.isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--theme-accent)' }}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--theme-muted)]">
            Set your working hours, booking rules, and public availability link.
          </p>
        </header>

        {/* Booking link */}
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Public Booking Link
          </h2>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 font-mono text-xs text-[var(--theme-muted)] truncate">
              {bookingLink}
            </div>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--theme-hover)]"
            >
              {copied
                ? <HugeiconsIcon icon={Tick02Icon} size={13} className="text-green-500" />
                : <HugeiconsIcon icon={Copy01Icon} size={13} className="text-[var(--theme-accent)]" />
              }
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Booking settings */}
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Booking Rules
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Session duration
              </label>
              <select
                value={settings.duration_minutes}
                onChange={(e) => update('duration_minutes', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Buffer before
              </label>
              <select
                value={settings.buffer_before_minutes}
                onChange={(e) => update('buffer_before_minutes', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === 0 ? 'None' : `${b} min`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Buffer after
              </label>
              <select
                value={settings.buffer_after_minutes}
                onChange={(e) => update('buffer_after_minutes', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === 0 ? 'None' : `${b} min`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Max bookings / day
              </label>
              <select
                value={settings.max_per_day}
                onChange={(e) => update('max_per_day', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {MAX_PER_DAY_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Booking window
              </label>
              <select
                value={settings.booking_window_days}
                onChange={(e) => update('booking_window_days', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {WINDOW_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} days out</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--theme-muted)]">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => update('timezone', e.target.value)}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-xs text-[var(--theme-text)]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Working hours */}
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Working Hours
          </h2>
          <div className="space-y-2">
            {settings.days.map((day) => (
              <div key={day.day} className="flex items-center gap-3">
                <label className="flex w-28 shrink-0 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(day.day, { enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className={cn('font-medium', day.enabled ? 'text-[var(--theme-text)]' : 'text-[var(--theme-muted)] line-through')}>
                    {DAY_NAMES[day.day]}
                  </span>
                </label>
                {day.enabled ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={day.start_time}
                      onChange={(e) => updateDay(day.day, { start_time: e.target.value })}
                      className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1 text-xs text-[var(--theme-text)]"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{formatTime(t)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-[var(--theme-muted)]">to</span>
                    <select
                      value={day.end_time}
                      onChange={(e) => updateDay(day.day, { end_time: e.target.value })}
                      className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1 text-xs text-[var(--theme-text)]"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{formatTime(t)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--theme-muted)]">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Confirmation message */}
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Confirmation Message
          </h2>
          <textarea
            value={settings.confirmation_message}
            onChange={(e) => update('confirmation_message', e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 py-2 text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
          />
          <p className="mt-1.5 text-[10px] text-[var(--theme-muted)]">
            Shown to the client after they book an appointment.
          </p>
        </section>
      </div>
    </div>
  )
}
