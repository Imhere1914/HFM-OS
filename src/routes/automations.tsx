import { createFileRoute } from '@tanstack/react-router'
import { AutomationsScreen } from '@/screens/automations/automations-screen'

export const Route = createFileRoute('/automations')({
  component: AutomationsScreen,
})
