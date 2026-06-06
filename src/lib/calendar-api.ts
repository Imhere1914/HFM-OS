export interface CalendarEvent {
  id: string
  kind: 'social' | 'campaign'
  title: string
  detail: string
  status: string
  platform?: string
  scheduled_at: string | null
  date: string | null
}

export async function fetchCalendar(from?: string, to?: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const res = await fetch(`/api/calendar?${params}`)
  if (!res.ok) throw new Error('Failed to load calendar')
  return (await res.json()).events
}
