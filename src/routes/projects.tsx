import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/projects')({
  component: () => <ComingSoon title="uprojects" />,
})
