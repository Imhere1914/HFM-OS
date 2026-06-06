import { createFileRoute } from '@tanstack/react-router'
import { SchedulingScreen } from '@/screens/scheduling/scheduling-screen'

export const Route = createFileRoute('/scheduling')({
  component: SchedulingScreen,
})
