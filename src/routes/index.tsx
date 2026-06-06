import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AiMagicIcon,
  Briefcase01Icon,
  Calendar01Icon,
  Chat01Icon,
  Copy01Icon,
  ImageAdd01Icon,
  Layout01Icon,
  Mail01Icon,
  PlugSocketIcon,
  Share04Icon,
  StarIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { fetchContacts } from '@/lib/contacts-api'
import { fetchHighlights } from '@/lib/highlights-api'

export const Route = createFileRoute('/')({ component: Dashboard })

const TILES = [
  { to: '/conversations', label: 'Conversations', icon: Chat01Icon,     desc: 'Unified inbox' },
  { to: '/contacts',      label: 'Contacts',      icon: UserGroupIcon,  desc: 'Your CRM' },
  { to: '/appointments',  label: 'Appointments',  icon: Calendar01Icon, desc: 'Bookings' },
  { to: '/social',        label: 'Social',        icon: Share04Icon,    desc: 'Plan & publish' },
  { to: '/campaigns',     label: 'Campaigns',     icon: Mail01Icon,     desc: 'Email marketing' },
  { to: '/pages',         label: 'Pages',         icon: Layout01Icon,   desc: 'Landing pages' },
  { to: '/templates',     label: 'Templates',     icon: Copy01Icon,     desc: 'Reusable content' },
  { to: '/projects',      label: 'Projects',      icon: Briefcase01Icon,desc: 'Client work' },
  { to: '/avatars',       label: 'Avatars',       icon: UserCircleIcon, desc: 'Voice + chat identity' },
  { to: '/media',         label: 'Media Studio',  icon: ImageAdd01Icon, desc: 'Image & video gen' },
  { to: '/plugins',       label: 'Plugins',       icon: PlugSocketIcon, desc: 'Integrations' },
  { to: '/highlights',    label: 'Highlights',    icon: StarIcon,       desc: 'What\'s going on' },
]

function Dashboard() {
  const brand = useBrand()
  const contactsQuery = useQuery({ queryKey: ['dash', 'contacts'], queryFn: () => fetchContacts() })
  const highlightsQuery = useQuery({ queryKey: ['dash', 'highlights'], queryFn: () => fetchHighlights(brand.id) })

  const contactCount = contactsQuery.data?.length ?? 0
  const attentionCount = highlightsQuery.data?.attention ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1060px] px-6 py-8">

        {/* ── Hero ────────────────────────────────────────────── */}
        <div
          className="relative mb-7 overflow-hidden rounded-2xl p-7"
          style={{
            background: `
              radial-gradient(ellipse 65% 80% at 0% 50%, color-mix(in srgb, ${brand.accentColor} 28%, transparent) 0%, transparent 70%),
              radial-gradient(ellipse 45% 60% at 100% 0%, color-mix(in srgb, ${brand.accentColor} 18%, #a855f7 60%) 0%, transparent 65%),
              linear-gradient(140deg, color-mix(in srgb, ${brand.accentColor} 88%, #000) 0%, color-mix(in srgb, ${brand.accentColor} 55%, #1e0a30) 100%)
            `,
          }}
        >
          {/* Subtle dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)`,
              backgroundSize: '22px 22px',
            }}
          />
          <div className="relative z-10">
            <p className="text-[13px] font-medium text-white/70">{greeting}</p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-white">
              {brand.name}
            </h1>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/75">
              Your AI-native operating system — contacts, conversations,
              campaigns, and content, with an AI assistant woven through it all.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/chat"
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/28 hover:shadow-lg"
              >
                <HugeiconsIcon icon={AiMagicIcon} size={15} />
                Open Assistant
              </Link>
              {attentionCount > 0 && (
                <Link
                  to="/highlights"
                  className="flex items-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-[13px] font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <span className="h-2 w-2 rounded-full bg-white/90" />
                  {attentionCount} need attention
                </Link>
              )}
              <Link
                to="/contacts"
                className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[13px] font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/18"
              >
                {contactCount} contacts
              </Link>
            </div>
          </div>
        </div>

        {/* ── Module tiles ─────────────────────────────────────── */}
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--theme-muted)] opacity-75">
          Workspace
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group relative overflow-hidden rounded-xl border border-[var(--theme-border)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
              style={{ background: 'var(--theme-card)', backdropFilter: 'blur(12px)' }}
            >
              {/* Hover accent wash */}
              <div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: 'var(--theme-hover)' }}
              />
              <div className="relative z-10">
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: 'var(--theme-accent-soft)',
                    color: 'var(--theme-accent)',
                  }}
                >
                  <HugeiconsIcon icon={t.icon} size={16} strokeWidth={1.8} />
                </div>
                <div className="text-[13px] font-semibold leading-tight text-[var(--theme-text)]">
                  {t.label}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--theme-muted)]">{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
