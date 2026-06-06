import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { RefreshIcon } from '@hugeicons/core-free-icons'
import type { Chat01Icon } from '@hugeicons/core-free-icons'

/** Standard page header + scroll container shared by module screens. */
export function ScreenShell({
  icon,
  title,
  count,
  subtitle,
  onRefresh,
  action,
  children,
}: {
  icon: typeof Chat01Icon
  title: string
  count?: number
  subtitle?: string
  onRefresh?: () => void
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--theme-bg)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col px-6 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={icon} size={20} className="text-[var(--theme-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--theme-text)]">{title}</h1>
            {typeof count === 'number' && (
              <span className="text-xs text-[var(--theme-muted)]">({count})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="rounded-lg p-1.5 text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-hover)]"
                title="Refresh"
              >
                <HugeiconsIcon icon={RefreshIcon} size={16} />
              </button>
            )}
            {action}
          </div>
        </header>
        {subtitle && (
          <p className="mb-4 -mt-2 text-xs text-[var(--theme-muted)]">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  )
}
