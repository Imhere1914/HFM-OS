/**
 * Onboarding checklist — shown on dashboard until all steps are complete.
 * Dismissable per session via localStorage.
 */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar01Icon,
  CheckmarkCircle01Icon,
  FlowSquareIcon,
  RadioButtonIcon,
  TaskEdit01Icon,
  UserGroupIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { fetchContacts } from '@/lib/contacts-api'
import { fetchInvoices } from '@/lib/invoices-api'
import { fetchAvailability } from '@/lib/scheduling-api'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'aios-onboarding-dismissed'

type Step = {
  id: string
  label: string
  detail: string
  to: string
  icon: typeof UserGroupIcon
  done: boolean
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' }
    catch { return false }
  })

  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => fetchContacts(), staleTime: 60_000 })
  const invoicesQuery = useQuery({ queryKey: ['platform', 'invoices'], queryFn: () => fetchInvoices(), staleTime: 60_000 })
  const availQuery = useQuery({ queryKey: ['availability'], queryFn: () => fetchAvailability(), staleTime: 60_000 })

  if (dismissed) return null

  const hasContacts = (contactsQuery.data?.length ?? 0) > 0
  const hasInvoice = (invoicesQuery.data?.length ?? 0) > 0
  const hasScheduling = availQuery.isSuccess

  const steps: Step[] = [
    { id: 'contacts', label: 'Add your first contact', detail: 'Build your CRM from scratch or import a CSV', to: '/contacts', icon: UserGroupIcon, done: hasContacts },
    { id: 'scheduling', label: 'Set up your booking page', detail: 'Configure availability and share your public link', to: '/scheduling', icon: Calendar01Icon, done: hasScheduling },
    { id: 'forms', label: 'Create a lead capture form', detail: 'Embed on your website to capture leads automatically', to: '/forms', icon: TaskEdit01Icon, done: false },
    { id: 'automations', label: 'Build your first automation', detail: 'Auto-respond to new contacts or form submissions', to: '/automations', icon: FlowSquareIcon, done: false },
    { id: 'invoice', label: 'Send your first invoice', detail: 'Get paid faster with professional branded invoices', to: '/payments', icon: Calendar01Icon, done: hasInvoice },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length
  const pct = Math.round((completedCount / steps.length) * 100)

  if (allDone) {
    return null // No need to show once everything is done
  }

  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--theme-text)]">Get started</h2>
          <p className="mt-0.5 text-xs text-[var(--theme-muted)]">{completedCount} of {steps.length} steps complete</p>
        </div>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem(STORAGE_KEY, 'true') }}
          className="rounded-lg p-1 hover:bg-[var(--theme-hover)]"
          title="Dismiss"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-[var(--theme-muted)]" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--theme-hover)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'var(--theme-accent)' }}
        />
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <Link
            key={step.id}
            to={step.to}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-[var(--theme-hover)]',
              step.done ? 'border-[var(--theme-border)] opacity-60' : 'border-[var(--theme-border)]',
            )}
          >
            <HugeiconsIcon
              icon={step.done ? CheckmarkCircle01Icon : RadioButtonIcon}
              size={16}
              style={{ color: step.done ? 'var(--theme-success)' : 'var(--theme-muted)', flexShrink: 0 }}
            />
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs font-medium', step.done ? 'line-through text-[var(--theme-muted)]' : 'text-[var(--theme-text)]')}>
                {step.label}
              </p>
              {!step.done && <p className="text-[10px] text-[var(--theme-muted)]">{step.detail}</p>}
            </div>
            {!step.done && (
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold text-white" style={{ background: 'var(--theme-accent)' }}>
                Start →
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
