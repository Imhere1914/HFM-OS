import { HugeiconsIcon } from '@hugeicons/react'
import { AiMagicIcon } from '@hugeicons/core-free-icons'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--theme-bg)] text-center">
      <HugeiconsIcon icon={AiMagicIcon} size={36} className="mb-3 text-[var(--theme-accent)] opacity-60" />
      <h1 className="text-lg font-semibold text-[var(--theme-text)]">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-[var(--theme-muted)]">
        Being ported into the new app — coming online shortly.
      </p>
    </div>
  )
}
