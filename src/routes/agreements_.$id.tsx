import { createFileRoute } from '@tanstack/react-router'
import { AgreementEditorScreen } from '@/screens/agreements/agreement-editor-screen'

function RouteComponent() {
  const { id } = Route.useParams()
  return <AgreementEditorScreen id={id} />
}

export const Route = createFileRoute('/agreements_/$id')({ component: RouteComponent })
