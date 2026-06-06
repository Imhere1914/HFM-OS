import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/pages')({
  component: () => <ComingSoon title="upages" />,
})
