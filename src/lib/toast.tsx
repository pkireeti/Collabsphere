import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

interface ToastValue {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastValue | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++seq
      setToasts((prev) => [...prev.slice(-3), { ...t, id }])
      window.setTimeout(() => dismiss(id), t.kind === 'error' ? 6000 : 4200)
    },
    [dismiss],
  )

  const value = useMemo<ToastValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, body) => push({ kind: 'success', title, body }),
      error: (title, body) => push({ kind: 'error', title, body }),
      info: (title, body) => push({ kind: 'info', title, body }),
    }),
    [toasts, push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/* ---------------------------------------------------- pixel toast HUD */

const TONE: Record<ToastKind, { bar: string; label: string; text: string }> = {
  success: {
    bar: 'bg-pixgreen',
    label: 'text-pixgreen-dark',
    text: 'border-pixgreen',
  },
  error: { bar: 'bg-pixred', label: 'text-pixred-dark', text: 'border-pixred' },
  info: { bar: 'bg-sky', label: 'text-sky', text: 'border-sky' },
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  if (!toasts.length) return null
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[600] flex w-[min(92vw,340px)] flex-col gap-3"
    >
      {toasts.map((t) => {
        const tone = TONE[t.kind]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-stretch border-[3px] border-ink bg-panel shadow-lift animate-fade-up ${tone.text}`}
          >
            <span className={`w-2 shrink-0 ${tone.bar}`} />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className={`text-[10px] leading-relaxed tracking-poster ${tone.label}`}>
                {t.title}
              </p>
              {t.body && (
                <p className="mt-1 font-body text-px-sm leading-snug text-mist">{t.body}</p>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 border-l-[3px] border-ink px-2.5 font-sans text-[11px] text-mist hover:bg-panel-light hover:text-cream"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
