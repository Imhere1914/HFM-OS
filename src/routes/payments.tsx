import { createFileRoute } from '@tanstack/react-router'
import { PaymentsScreen } from '@/screens/payments/payments-screen'

export const Route = createFileRoute('/payments')({
  component: PaymentsScreen,
})
