import { createFileRoute } from '@tanstack/react-router'
import { ContactsScreen } from '@/screens/contacts/contacts-screen'

export const Route = createFileRoute('/contacts')({ component: ContactsScreen })
