/**
 * Minimal toast — a tiny event-bus + host. `toast('msg')` from anywhere;
 * <Toaster/> mounted once at the root renders them.
 */
import { useEffect, useState } from 'react'

type ToastItem = { id: number; message: string; type: 'info' | 'error' }
type Listener = (t: ToastItem) => void

let _id = 0
const listeners = new Set<Listener>()

export function toast(message: string, opts?: { type?: 'info' | 'error' }): void {
  const item: ToastItem = { id: ++_id, message, type: opts?.type ?? 'info' }
  listeners.forEach((l) => l(item))
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const l: Listener = (t) => {
      setItems((cur) => [...cur, t])
      setTimeout(() => {
        setItems((cur) => cur.filter((x) => x.id !== t.id))
      }, 3200)
    }
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === 'error' ? 'var(--theme-danger)' : 'var(--theme-text)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 6px 24px rgba(0,0,0,.18)',
            maxWidth: 420,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
