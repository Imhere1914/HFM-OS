import { createFileRoute } from '@tanstack/react-router'
import { FormsScreen } from '@/screens/forms/forms-screen'

export const Route = createFileRoute('/forms')({
  component: FormsScreen,
})
