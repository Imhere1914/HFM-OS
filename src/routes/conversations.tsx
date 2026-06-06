import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/conversations')({
  component: () => <ComingSoon title="uconversations" />,
})
