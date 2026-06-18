import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Calendar01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  Link01Icon,
  PencilEdit02Icon,
  Settings02Icon,
  Tick02Icon,
  TimeScheduleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'
import { useBrand } from '@/contexts/BrandContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DaySchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  enabled: boolean
  start_time: string
  end_time: string
}

interface CalendarDef {
  id: string
  brand: string
  name: string
  slug: string
  description: string
  color: string
  meeting_type: 'video' | 'phone' | 'in_person'
  meeting_location: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  max_per_day: number
  booking_window_days: number
  timezone: string
  days: DaySchedule[]
  blocked_dates: string[]
  require_phone: boolean
  phone_required: boolean
  allow_guests: boolean
  max_guests: number
  collect_notes: boolean
  confirmation_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiListCalendars(brand: string): Promise<CalendarDef[]> {
  const res = await fetch(`/api/calendars?brand=${encodeURIComponent(brand)}`)
  if (!res.ok) throw new Error('Failed to load calendars')
  return res.json()
}

async function apiCreateCalendar(body: Partial<CalendarDef>): Promise<CalendarDef> {
  const res = await fetch('/api/calendars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create calendar')
  return res.json()
}

async function apiUpdateCalendar(id: string, body: Partial<CalendarDef>): Promise<CalendarDef> {
  const res = await fetch(`/api/calendars/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to save calendar')
  return res.json()
}

async function apiDeleteCalendar(id: string): Promise<void> {
  const res = await fetch(`/api/calendars/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete calendar')
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30]
const MAX_PER_DAY_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1)
const WINDOW_OPTIONS = [7, 14, 21, 30, 60, 90]
const GUEST_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

const COLOR_SWATCHES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

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
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const TABS = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'availability', label: 'Availability', icon: TimeScheduleIcon },
  { id: 'overrides', label: 'Date Overrides', icon: Cancel01Icon },
  { id: 'fields', label: 'Form Fields', icon: UserGroupIcon },
  { id: 'share', label: 'Share', icon: Link01Icon },
] as const

type TabId = typeof TABS[number]['id']

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT_GRADIENT = 'linear-gradient(135deg, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 65%, #000))'
const ACCENT_GLOW = '0 2px 8px color-mix(in srgb, var(--theme-accent) 38%, transparent)'

const primaryBtnCls = 'flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0'
const primaryBtnStyle: React.CSSProperties = { background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }

const selectCls = 'w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-[12px] text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]'

const inputCls = 'w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2.5 py-1.5 text-[12px] text-[var(--theme-text)] placeholder-[var(--theme-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function defaultDays(): DaySchedule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day: day as DaySchedule['day'],
    enabled: day >= 1 && day <= 5,
    start_time: '09:00',
    end_time: '17:00',
  }))
}

function defaultCalendar(brand: string): Partial<CalendarDef> {
  return {
    brand,
    name: '',
    slug: '',
    description: '',
    color: '#22c55e',
    meeting_type: 'video',
    meeting_location: '',
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    max_per_day: 8,
    booking_window_days: 30,
    timezone: 'America/New_York',
    days: defaultDays(),
    blocked_dates: [],
    require_phone: false,
    phone_required: false,
    allow_guests: false,
    max_guests: 5,
    collect_notes: false,
    confirmation_message: 'Your appointment has been confirmed! You will receive a confirmation email shortly.',
    is_active: true,
  }
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function SectionCard({ icon, label, children }: {
  icon: typeof Calendar01Icon
  label: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
        >
          <HugeiconsIcon icon={icon} size={13} className="text-white" />
        </span>
        <h2 className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted)]">{label}</h2>
      </div>
      {children}
    </section>
  )
}

function ToggleSwitch({ checked, onChange, label, disabled }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5', disabled && 'pointer-events-none opacity-50')} title={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-all duration-150"
        style={{
          background: checked
            ? 'var(--theme-accent)'
            : 'color-mix(in srgb, var(--theme-muted) 30%, var(--theme-card))',
          boxShadow: checked ? ACCENT_GLOW : undefined,
        }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-150"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
    </label>
  )
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-[var(--theme-muted)]">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--theme-muted)]">{hint}</p>}
    </div>
  )
}

// ─── Month Calendar for Date Overrides ───────────────────────────────────────

function MonthCalendar({
  blockedDates,
  onToggle,
}: {
  blockedDates: string[]
  onToggle: (date: string) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function dateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-text)] text-[12px]"
        >
          ‹
        </button>
        <span className="text-[12px] font-semibold text-[var(--theme-text)]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-text)] text-[12px]"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const ds = dateStr(day)
          const isBlocked = blockedDates.includes(ds)
          return (
            <button
              key={ds}
              onClick={() => onToggle(ds)}
              className={cn(
                'flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-medium transition-colors duration-100',
                isBlocked
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'text-[var(--theme-text)] hover:bg-[var(--theme-hover)]',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function GeneralTab({ draft, update }: { draft: CalendarDef; update: <K extends keyof CalendarDef>(k: K, v: CalendarDef[K]) => void }) {
  const brand = useBrand()

  const locationLabel =
    draft.meeting_type === 'video' ? 'Zoom / Meet link' :
    draft.meeting_type === 'phone' ? 'Your phone number' : 'Address'

  return (
    <div className="flex flex-col gap-4">
      <SectionCard icon={Settings02Icon} label="Calendar Details">
        <div className="flex flex-col gap-3">
          <FieldRow label="Calendar Name">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => {
                update('name', e.target.value)
                update('slug', slugify(e.target.value))
              }}
              placeholder="e.g. 30-Min Discovery Call"
              className={inputCls}
            />
          </FieldRow>

          <FieldRow label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              placeholder="Brief description shown on the booking page"
              className={cn(inputCls, 'resize-none')}
            />
          </FieldRow>

          <FieldRow label="Color">
            <div className="flex items-center gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => update('color', c)}
                  className="h-6 w-6 rounded-full transition-all duration-100 hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: draft.color === c ? `2px solid ${c}` : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </FieldRow>

          <FieldRow
            label="Slug"
            hint={`/book/${brand.id}/${draft.slug || 'your-slug'}`}
          >
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="discovery-call"
              className={cn(inputCls, 'font-mono')}
            />
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard icon={Calendar01Icon} label="Meeting Details">
        <div className="flex flex-col gap-3">
          <FieldRow label="Meeting Type">
            <div className="flex items-center gap-4">
              {([['video', 'Video Call'], ['phone', 'Phone Call'], ['in_person', 'In Person']] as const).map(([val, lbl]) => (
                <label key={val} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="meeting_type"
                    value={val}
                    checked={draft.meeting_type === val}
                    onChange={() => update('meeting_type', val)}
                    className="accent-[var(--theme-accent)]"
                  />
                  <span className="text-[12px] text-[var(--theme-text)]">{lbl}</span>
                </label>
              ))}
            </div>
          </FieldRow>

          <FieldRow label={locationLabel}>
            <input
              type="text"
              value={draft.meeting_location}
              onChange={(e) => update('meeting_location', e.target.value)}
              placeholder={
                draft.meeting_type === 'video' ? 'https://zoom.us/j/…' :
                draft.meeting_type === 'phone' ? '+1 (555) 000-0000' : '123 Main St, City, State'
              }
              className={inputCls}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Duration">
              <select value={draft.duration_minutes} onChange={(e) => update('duration_minutes', Number(e.target.value))} className={selectCls}>
                {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Timezone">
              <select value={draft.timezone} onChange={(e) => update('timezone', e.target.value)} className={selectCls}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Buffer Before">
              <select value={draft.buffer_before_minutes} onChange={(e) => update('buffer_before_minutes', Number(e.target.value))} className={selectCls}>
                {BUFFER_OPTIONS.map((b) => <option key={b} value={b}>{b === 0 ? 'None' : `${b} min`}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Buffer After">
              <select value={draft.buffer_after_minutes} onChange={(e) => update('buffer_after_minutes', Number(e.target.value))} className={selectCls}>
                {BUFFER_OPTIONS.map((b) => <option key={b} value={b}>{b === 0 ? 'None' : `${b} min`}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Max Bookings / Day">
              <select value={draft.max_per_day} onChange={(e) => update('max_per_day', Number(e.target.value))} className={selectCls}>
                {MAX_PER_DAY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Booking Window">
              <select value={draft.booking_window_days} onChange={(e) => update('booking_window_days', Number(e.target.value))} className={selectCls}>
                {WINDOW_OPTIONS.map((d) => <option key={d} value={d}>{d} days out</option>)}
              </select>
            </FieldRow>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function AvailabilityTab({ draft, update }: { draft: CalendarDef; update: <K extends keyof CalendarDef>(k: K, v: CalendarDef[K]) => void }) {
  const updateDay = (dayIdx: number, patch: Partial<DaySchedule>) => {
    const days = draft.days.map((d) => d.day === dayIdx ? { ...d, ...patch } : d)
    update('days', days)
  }

  return (
    <SectionCard icon={TimeScheduleIcon} label="Working Hours">
      <div className="overflow-hidden rounded-xl border border-[var(--theme-border)]">
        {draft.days.map((day, idx) => (
          <div
            key={day.day}
            className={cn(
              'grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-[var(--theme-hover)] sm:grid-cols-[130px_1fr]',
              idx > 0 && 'border-t border-[var(--theme-border)]',
            )}
            style={day.enabled ? undefined : { opacity: 0.65 }}
          >
            <div className="flex items-center gap-2.5">
              <ToggleSwitch
                checked={day.enabled}
                onChange={(checked) => updateDay(day.day, { enabled: checked })}
                label={`Toggle ${DAY_NAMES[day.day]}`}
              />
              <span className={cn('text-[12px] font-semibold', day.enabled ? 'text-[var(--theme-text)]' : 'text-[var(--theme-muted)]')}>
                {DAY_NAMES[day.day]}
              </span>
            </div>
            {day.enabled ? (
              <div className="flex items-center justify-end gap-2 sm:justify-start">
                <select
                  value={day.start_time}
                  onChange={(e) => updateDay(day.day, { start_time: e.target.value })}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1 text-[12px] tabular-nums text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--theme-muted)]">to</span>
                <select
                  value={day.end_time}
                  onChange={(e) => updateDay(day.day, { end_time: e.target.value })}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1 text-[12px] tabular-nums text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            ) : (
              <span className="text-right text-[11px] italic text-[var(--theme-muted)] sm:text-left">Unavailable</span>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function DateOverridesTab({ draft, update }: { draft: CalendarDef; update: <K extends keyof CalendarDef>(k: K, v: CalendarDef[K]) => void }) {
  const toggleDate = (ds: string) => {
    const next = draft.blocked_dates.includes(ds)
      ? draft.blocked_dates.filter((d) => d !== ds)
      : [...draft.blocked_dates, ds].sort()
    update('blocked_dates', next)
  }

  return (
    <SectionCard icon={Cancel01Icon} label="Date Overrides">
      <p className="mb-3 text-[11px] text-[var(--theme-muted)]">
        Click dates to block them from receiving bookings. Blocked dates appear in red.
      </p>
      <MonthCalendar blockedDates={draft.blocked_dates} onToggle={toggleDate} />

      {draft.blocked_dates.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-[var(--theme-muted)] uppercase tracking-wide">Blocked Dates</p>
          <div className="flex flex-wrap gap-2">
            {draft.blocked_dates.map((ds) => (
              <div
                key={ds}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1 text-[12px] font-medium text-red-500"
              >
                <span>{ds}</span>
                <button
                  onClick={() => toggleDate(ds)}
                  className="ml-0.5 rounded-full hover:text-red-700"
                  aria-label={`Remove ${ds}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function FormFieldsTab({ draft, update }: { draft: CalendarDef; update: <K extends keyof CalendarDef>(k: K, v: CalendarDef[K]) => void }) {
  return (
    <SectionCard icon={UserGroupIcon} label="Form Fields">
      <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-[var(--theme-border)]">
        {/* Name — locked on */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-3 py-3">
          <div>
            <p className="text-[12px] font-medium text-[var(--theme-text)]">Collect Name</p>
            <p className="text-[10px] text-[var(--theme-muted)]">Always required</p>
          </div>
          <ToggleSwitch checked={true} onChange={() => {}} label="Collect Name" disabled />
        </div>

        {/* Email — locked on */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-3 py-3">
          <div>
            <p className="text-[12px] font-medium text-[var(--theme-text)]">Collect Email</p>
            <p className="text-[10px] text-[var(--theme-muted)]">Always required</p>
          </div>
          <ToggleSwitch checked={true} onChange={() => {}} label="Collect Email" disabled />
        </div>

        {/* Phone */}
        <div className={cn('border-b border-[var(--theme-border)] px-3 py-3', draft.require_phone && 'pb-2')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--theme-text)]">Collect Phone</p>
              <p className="text-[10px] text-[var(--theme-muted)]">Ask for a phone number</p>
            </div>
            <ToggleSwitch checked={draft.require_phone} onChange={(v) => update('require_phone', v)} label="Collect Phone" />
          </div>
          {draft.require_phone && (
            <div className="mt-2.5 flex items-center gap-4 pl-1">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  checked={draft.phone_required}
                  onChange={() => update('phone_required', true)}
                  className="accent-[var(--theme-accent)]"
                />
                <span className="text-[12px] text-[var(--theme-text)]">Required</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  checked={!draft.phone_required}
                  onChange={() => update('phone_required', false)}
                  className="accent-[var(--theme-accent)]"
                />
                <span className="text-[12px] text-[var(--theme-text)]">Optional</span>
              </label>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-3 py-3">
          <div>
            <p className="text-[12px] font-medium text-[var(--theme-text)]">Collect Notes</p>
            <p className="text-[10px] text-[var(--theme-muted)]">Free-text notes field</p>
          </div>
          <ToggleSwitch checked={draft.collect_notes} onChange={(v) => update('collect_notes', v)} label="Collect Notes" />
        </div>

        {/* Guests */}
        <div className={cn('border-b border-[var(--theme-border)] px-3 py-3', draft.allow_guests && 'pb-2')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--theme-text)]">Allow Guests</p>
              <p className="text-[10px] text-[var(--theme-muted)]">Let bookers add additional guests</p>
            </div>
            <ToggleSwitch checked={draft.allow_guests} onChange={(v) => update('allow_guests', v)} label="Allow Guests" />
          </div>
          {draft.allow_guests && (
            <div className="mt-2.5 flex items-center gap-2 pl-1">
              <span className="text-[11px] text-[var(--theme-muted)]">Max guests</span>
              <select
                value={draft.max_guests}
                onChange={(e) => update('max_guests', Number(e.target.value))}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input)] px-2 py-1 text-[12px] text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
              >
                {GUEST_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Confirmation message */}
        <div className="px-3 py-3">
          <p className="mb-1.5 text-[12px] font-medium text-[var(--theme-text)]">Confirmation Message</p>
          <textarea
            value={draft.confirmation_message}
            onChange={(e) => update('confirmation_message', e.target.value)}
            rows={3}
            className={cn(inputCls, 'resize-none')}
            placeholder="Shown to the client after they book an appointment"
          />
        </div>
      </div>
    </SectionCard>
  )
}

function ShareTab({ draft, brand }: { draft: CalendarDef; brand: { id: string } }) {
  const [copied, setCopied] = useState(false)

  const bookingLink = `${location.origin}/book/${brand.id}/${draft.slug}`

  const copyLink = () => {
    void navigator.clipboard.writeText(bookingLink)
    setCopied(true)
    toast('Booking link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const embedCode = `<script src="${location.origin}/widget.js" data-brand="${brand.id}" data-calendar="${draft.slug}" async></script>`

  return (
    <div className="flex flex-col gap-4">
      {/* Booking link */}
      <section
        className="rounded-2xl border p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--theme-accent) 25%, var(--theme-border))',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 8%, var(--theme-card)), color-mix(in srgb, #000 5%, var(--theme-card)))',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
          >
            <HugeiconsIcon icon={Link01Icon} size={13} className="text-white" />
          </span>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Public Booking Link
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="min-w-0 flex-1 truncate rounded-xl border px-3 py-2 font-mono text-xs text-[var(--theme-text)]"
            style={{
              borderColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-border))',
              background: 'color-mix(in srgb, var(--theme-card) 70%, transparent)',
            }}
          >
            {bookingLink}
          </div>
          <button onClick={copyLink} className={primaryBtnCls} style={primaryBtnStyle}>
            <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-[var(--theme-muted)]">
          Share this link so clients can book time directly.
        </p>
      </section>

      {/* Embed widget */}
      <SectionCard icon={Settings02Icon} label="Embed Widget">
        <p className="mb-3 text-[11px] text-[var(--theme-muted)]">
          Paste this snippet into any website to embed the booking widget.
        </p>
        <pre
          className="overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-input)] p-3 font-mono text-[10px] text-[var(--theme-muted)] whitespace-pre-wrap break-all"
        >
          {embedCode}
        </pre>
      </SectionCard>

      {/* QR Code */}
      <SectionCard icon={Calendar01Icon} label="QR Code">
        <p className="mb-3 text-[11px] text-[var(--theme-muted)]">
          Print or display this QR code to let people scan and book.
        </p>
        <div
          className="flex h-40 w-40 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-input)] text-[11px] font-medium text-[var(--theme-muted)]"
        >
          QR Code
        </div>
      </SectionCard>
    </div>
  )
}

// ─── New Calendar modal ───────────────────────────────────────────────────────

function NewCalendarModal({ brand, onClose, onCreated }: {
  brand: string
  onClose: () => void
  onCreated: (cal: CalendarDef) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const createMutation = useMutation({
    mutationFn: () => apiCreateCalendar({ ...defaultCalendar(brand), name, slug: slugify(name) }),
    onSuccess: (cal) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', brand] })
      toast(`Calendar "${cal.name}" created`)
      onCreated(cal)
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to create', { type: 'error' }),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[340px] rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-xl">
        <h3 className="mb-4 text-[14px] font-bold text-[var(--theme-text)]">New Calendar</h3>
        <div className="flex flex-col gap-3">
          <FieldRow label="Calendar Name">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) createMutation.mutate() }}
              placeholder="e.g. 30-Min Discovery Call"
              className={inputCls}
            />
          </FieldRow>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-[12px] font-medium text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
              className={primaryBtnCls}
              style={primaryBtnStyle}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Calendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function SchedulingScreen() {
  const brand = useBrand()
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [draft, setDraft] = useState<CalendarDef | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const calendarsQuery = useQuery({
    queryKey: ['calendars', brand.id],
    queryFn: () => apiListCalendars(brand.id),
  })

  const calendars = calendarsQuery.data ?? []

  // Auto-select first calendar when list loads
  useEffect(() => {
    if (!selectedId && calendars.length > 0) {
      setSelectedId(calendars[0].id)
    }
  }, [calendars, selectedId])

  // Sync draft when selectedId changes
  useEffect(() => {
    const cal = calendars.find((c) => c.id === selectedId) ?? null
    setDraft(cal ? { ...cal } : null)
    setIsDirty(false)
  }, [selectedId, calendarsQuery.data])

  const update = <K extends keyof CalendarDef>(key: K, value: CalendarDef[K]) => {
    setDraft((d) => d ? { ...d, [key]: value } : d)
    setIsDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => apiUpdateCalendar(draft!.id, draft!),
    onSuccess: (saved) => {
      queryClient.setQueryData<CalendarDef[]>(['calendars', brand.id], (prev) =>
        prev ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved],
      )
      setDraft({ ...saved })
      setIsDirty(false)
      toast('Calendar saved')
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save', { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteCalendar(selectedId!),
    onSuccess: () => {
      queryClient.setQueryData<CalendarDef[]>(['calendars', brand.id], (prev) =>
        prev ? prev.filter((c) => c.id !== selectedId) : [],
      )
      setSelectedId(null)
      setDraft(null)
      toast('Calendar deleted')
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to delete', { type: 'error' }),
  })

  const handleDelete = () => {
    if (!selectedId) return
    const cal = calendars.find((c) => c.id === selectedId)
    if (!window.confirm(`Delete "${cal?.name ?? 'this calendar'}"? This cannot be undone.`)) return
    deleteMutation.mutate()
  }

  const handleCreated = (cal: CalendarDef) => {
    setShowNewModal(false)
    setSelectedId(cal.id)
    setActiveTab('general')
  }

  if (calendarsQuery.isLoading) {
    return (
      <div className="min-h-full overflow-y-auto bg-surface text-ink">
        <div className="mx-auto flex w-full max-w-[1100px] gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-[260px] shrink-0 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] opacity-60" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] opacity-60" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      {/* Page header */}
      <div className="sticky top-0 z-10 border-b border-[var(--theme-border)] bg-[var(--theme-bg,var(--theme-card))] px-4 py-3 sm:px-6 lg:px-8" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
            >
              <HugeiconsIcon icon={TimeScheduleIcon} size={16} className="text-white" />
            </span>
            <div>
              <h1 className="text-[18px] font-bold leading-tight text-[var(--theme-text)]">Scheduling</h1>
              <p className="text-[11px] text-[var(--theme-muted)]">Manage calendars, availability & booking pages</p>
            </div>
          </div>
          {draft && isDirty && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className={primaryBtnCls}
              style={primaryBtnStyle}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto flex w-full max-w-[1100px] gap-5 px-4 py-5 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        {/* ── Left sidebar ── */}
        <div className="w-[260px] shrink-0">
          {/* New Calendar button */}
          <button
            onClick={() => setShowNewModal(true)}
            className={cn(primaryBtnCls, 'mb-3 w-full justify-center')}
            style={primaryBtnStyle}
          >
            <HugeiconsIcon icon={Add01Icon} size={13} />
            New Calendar
          </button>

          {/* Calendar list */}
          {calendars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-center">
              <div
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
              >
                <HugeiconsIcon icon={Calendar01Icon} size={18} className="text-white" />
              </div>
              <p className="text-[12px] font-semibold text-[var(--theme-text)]">No calendars yet</p>
              <p className="mt-1 text-[11px] text-[var(--theme-muted)]">Create your first calendar to start accepting bookings.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {calendars.map((cal) => {
                const isActive = cal.id === selectedId
                return (
                  <button
                    key={cal.id}
                    onClick={() => {
                      if (isDirty && selectedId !== cal.id) {
                        if (!window.confirm('You have unsaved changes. Discard them?')) return
                      }
                      setSelectedId(cal.id)
                      setActiveTab('general')
                    }}
                    className={cn(
                      'w-full rounded-2xl border p-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-md',
                      isActive
                        ? 'border-[var(--theme-accent)] shadow-sm'
                        : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40',
                    )}
                    style={isActive ? {
                      background: 'color-mix(in srgb, var(--theme-accent) 7%, var(--theme-card))',
                    } : { background: 'var(--theme-card)' }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: cal.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[var(--theme-text)]">{cal.name || 'Untitled'}</p>
                        <p className="truncate text-[10px] text-[var(--theme-muted)]">/{cal.slug || '—'}</p>
                        <p className="mt-0.5 truncate text-[10px] text-[var(--theme-muted)]">
                          {`/book/${brand.id}/${cal.slug}`}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {draft ? (
          <div className="min-w-0 flex-1">
            {/* Calendar header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: draft.color }} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="truncate text-[16px] font-bold text-[var(--theme-text)]">
                    {draft.name || 'Untitled Calendar'}
                  </h2>
                  <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="text-[var(--theme-muted)] shrink-0" />
                </div>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                <HugeiconsIcon icon={Delete01Icon} size={12} />
                Delete
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                    activeTab === tab.id
                      ? 'text-white shadow-sm'
                      : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-hover)]',
                  )}
                  style={activeTab === tab.id ? { background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW } : undefined}
                >
                  <HugeiconsIcon icon={tab.icon} size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'general' && <GeneralTab draft={draft} update={update} />}
            {activeTab === 'availability' && <AvailabilityTab draft={draft} update={update} />}
            {activeTab === 'overrides' && <DateOverridesTab draft={draft} update={update} />}
            {activeTab === 'fields' && <FormFieldsTab draft={draft} update={update} />}
            {activeTab === 'share' && <ShareTab draft={draft} brand={brand} />}

            {/* Floating save bar when dirty */}
            {isDirty && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 shadow-lg" style={{ backdropFilter: 'blur(10px)' }}>
                <p className="text-[12px] text-[var(--theme-muted)]">You have unsaved changes</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const cal = calendars.find((c) => c.id === selectedId)
                      if (cal) { setDraft({ ...cal }); setIsDirty(false) }
                    }}
                    className="rounded-xl px-3.5 py-2 text-[12px] font-medium text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className={primaryBtnCls}
                    style={primaryBtnStyle}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] p-12">
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
              >
                <HugeiconsIcon icon={Calendar01Icon} size={22} className="text-white" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--theme-text)]">Select a calendar</p>
              <p className="mt-1 text-[12px] text-[var(--theme-muted)]">
                {calendars.length === 0
                  ? 'Create your first calendar to get started.'
                  : 'Choose a calendar from the left to view and edit its settings.'}
              </p>
              {calendars.length === 0 && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className={cn(primaryBtnCls, 'mx-auto mt-4')}
                  style={primaryBtnStyle}
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} />
                  Create Calendar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewCalendarModal
          brand={brand.id}
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
