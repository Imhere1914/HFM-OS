import { createFileRoute } from '@tanstack/react-router'
import { StrategyScreen } from '@/screens/strategy/strategy-screen'

export const Route = createFileRoute('/strategy')({
  component: StrategyScreen,
})
