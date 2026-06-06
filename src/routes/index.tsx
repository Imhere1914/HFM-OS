import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Briefcase01Icon,
  Calendar01Icon,
  Chat01Icon,
  Copy01Icon,
  Layout01Icon,
  Mail01Icon,
  PlugSocketIcon,
  Share04Icon,
  UserCircleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { fetchContacts } from '@/lib/contacts-api'

export const Route = createFileRoute('/')({ component: Dashboard })

const TILES = [
  { to: '/conversations', label: 'Conversations', icon: Chat01Icon, desc: 'Unified inbox' },
  { to: '/contacts', label: 'Contacts', icon: UserGroupIcon, desc: 'Your CRM' },
  { to: '/appointments', label: 'Appointments', icon: Calendar01Icon, desc: 'Bookings' },
  { to: '/social', label: 'Social', icon: Share04Icon, desc: 'Plan & publish' },
  { to: '/campaigns', label: 'Campaigns', icon: Mail01Icon, desc: 'Email marketing' },
  { to: '/pages', label: 'Pages', icon: Layout01Icon, desc: 'Landing pages' },
  { to: '/templates', label: 'Templates', icon: Copy01Icon, desc: 'Reusable content' },
  { to: '/projects', label: 'Projects', icon: Briefcase01Icon, desc: 'Client work' },
  { to: '/avatars', label: 'Avatars', icon: UserCircleIcon, desc: 'Voice + chat identity' },
  { to: '/plugins', label: 'Plugins', icon: PlugSocketIcon, desc: 'Integrations' },
]

function Dashboard() {
  const brand = useBrand()
  const contactsQuery = useQuery({
    queryKey: ['dash', 'contacts'],
    queryFn: () => fetchContacts(),
  })
  const contactCount = contactsQuery.data?.length ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
        {/* Hero */}
        <div
          className="mb-6 overflow-hidden rounded-2xl p-7 text-white"
          style={{
            background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 65%, #000))`,
          }}
        >
          <p className="text-sm opacity-80">{greeting}</p>
          <h1 className="mt-1 text-2xl font-bold">{brand.name}</h1>
          <p className="mt-2 max-w-lg text-sm opacity-90">
            Your AI operating system — contacts, conversations, content, and
            campaigns, with an AI assistant woven through it all.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              to="/chat"
              className="rounded-lg bg-white/20 px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/30"
            >
              Open Assistant
            </Link>
            <Link
              to="/contacts"
              className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/20"
            >
              {contactCount} contacts
            </Link>
          </div>
        </div>

        {/* Module tiles */}
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--theme-muted)]">
          Workspace
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${brand.accentColor} 14%, transparent)`,
                  color: brand.accentColor,
                }}
              >
                <HugeiconsIcon icon={t.icon} size={18} />
              </div>
              <div className="text-sm font-semibold text-[var(--theme-text)]">
                {t.label}
              </div>
              <div className="text-xs text-[var(--theme-muted)]">{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
