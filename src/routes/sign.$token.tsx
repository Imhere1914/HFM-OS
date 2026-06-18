import { createFileRoute } from '@tanstack/react-router'
import { AgreementSignScreen } from '@/screens/agreements/agreement-sign-screen'

function RouteComponent() {
  const { token } = Route.useParams()
  return <AgreementSignScreen token={token} />
}

export const Route = createFileRoute('/sign/$token')({ component: RouteComponent })
