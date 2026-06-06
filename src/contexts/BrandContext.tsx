import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Brand config — the standalone AI OS is white-labeled per business.
 * The active brand is resolved from /api/brand (server reads BRAND env),
 * falling back to the data-brand attribute on <html>.
 */

export type BrandConfig = {
  id: string // 'sc' | 'hfm' | 'default'
  name: string
  shortName: string
  accentColor: string
}

const DEFAULTS: Record<string, BrandConfig> = {
  sc: {
    id: 'sc',
    name: 'SC Intelligence',
    shortName: 'SC',
    accentColor: '#2f6df6',
  },
  hfm: {
    id: 'hfm',
    name: 'HFM Intelligence',
    shortName: 'HFM',
    accentColor: '#7c6f9b',
  },
  default: {
    id: 'default',
    name: 'AI OS',
    shortName: 'OS',
    accentColor: '#2f6df6',
  },
}

function initialBrand(): BrandConfig {
  if (typeof document !== 'undefined') {
    const b = document.documentElement.getAttribute('data-brand') || 'default'
    return DEFAULTS[b] ?? DEFAULTS.default
  }
  return DEFAULTS.default
}

const BrandContext = createContext<BrandConfig>(DEFAULTS.default)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(initialBrand)

  useEffect(() => {
    fetch('/api/brand')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: BrandConfig | null) => {
        if (!cfg?.id) return
        setBrand(cfg)
        document.documentElement.setAttribute('data-brand', cfg.id)
        document.title = cfg.name
      })
      .catch(() => undefined)
  }, [])

  return <BrandContext value={brand}>{children}</BrandContext>
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext)
}
