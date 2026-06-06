export interface DayRule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  enabled: boolean
  start_time: string
  end_time: string
}

export interface BookingSettings {
  brand?: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  max_per_day: number
  booking_window_days: number
  confirmation_message: string
  timezone: string
  days: DayRule[]
  updated_at: string
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export async function fetchAvailability(brand?: string): Promise<BookingSettings> {
  const url = new URL('/api/availability', location.origin)
  if (brand) url.searchParams.set('brand', brand)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load availability settings')
  return res.json()
}

export async function saveAvailability(settings: Partial<BookingSettings>): Promise<BookingSettings> {
  const res = await fetch('/api/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error('Failed to save availability settings')
  return res.json()
}
