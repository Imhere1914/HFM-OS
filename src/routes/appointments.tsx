import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/appointments')({
  component: () => <ComingSoon title="uappointments" />,
})
