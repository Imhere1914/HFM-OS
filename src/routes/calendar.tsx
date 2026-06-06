import { createFileRoute } from '@tanstack/react-router'
import { CalendarScreen } from '@/screens/calendar/calendar-screen'

export const Route = createFileRoute('/calendar')({
  component: CalendarScreen,
})
