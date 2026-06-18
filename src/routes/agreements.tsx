import { createFileRoute } from '@tanstack/react-router'
import { AgreementsScreen } from '@/screens/agreements/agreements-screen'

export const Route = createFileRoute('/agreements')({ component: AgreementsScreen })
