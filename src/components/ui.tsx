import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconAlert, IconSearch, IconX } from './icons'

/* ------------------------------------------------------------- spinner */

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ animation: 'pixel-spin 700ms steps(4, end) infinite' }}
    >
      <rect x="5" y="0" width="2" height="3" />
      <rect x="9" y="5" width="3" height="2" />
      <rect x="5" y="9" width="2" height="3" />
      <rect x="0" y="5" width="3" height="2" />
      <rect x="9" y="1" width="2" height="2" opacity="0.55" />
      <rect x="1" y="9" width="2" height="2" opacity="0.55" />
    </svg>
  )
}

export function LoadingButton({
  loading,
  children,
  className = 'btn-primary',
  ...rest
}: {
  loading?: boolean
  children: ReactNode
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={className} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------- states */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="card grid-dither flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center border-[3px] border-ink bg-panel-light text-sky shadow-[3px_3px_0_0_#05070F]">
        {icon ?? <IconSearch className="h-6 w-6" />}
      </div>
      <h3 className="text-[13px] leading-relaxed tracking-poster text-cream">{title}</h3>
      <p className="mt-2 max-w-sm font-body text-px-sm leading-snug text-mist">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string
  body: string
  onRetry?: () => void
}) {
  return (
    <div className="card flex flex-col items-start gap-3 border-pixred bg-pixred-light px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-pixred text-ink">
          <IconAlert className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] leading-relaxed tracking-poster text-pixred-dark">{title}</p>
          <p className="mt-1 font-body text-px-sm leading-snug text-mist">{body}</p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-danger btn-sm ml-9">
          Try again
        </button>
      )}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-36 border-0 border-b-[3px] border-ink" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- badges */

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`pill ${className}`}>{children}</span>
}

const HAIR = ['#2B1B12', '#070B18', '#E8D6A0', '#B94A2C', '#5B6478', '#7A3E12']
const SKIN = ['#F2C79B', '#D89A64', '#A5673F', '#7A4A2B', '#F7DCC0']
const SHIRT = ['#3EC8F2', '#F2761A', '#4CD07A', '#F5C542', '#F0506A', '#A9B6D9']

/** Deterministic 8x8 pixel face built from the person's name. */
function pixelFace(name: string) {
  const h = name.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7)
  const hair = HAIR[h % HAIR.length]
  const skin = SKIN[(h >> 3) % SKIN.length]
  const shirt = SHIRT[(h >> 6) % SHIRT.length]
  const eye = '#070B18'
  const longHair = h % 3 !== 0
  const brow = h % 2 === 0

  const rows: string[] = [
    '.HHHHHH.',
    'HHHHHHHH',
    longHair ? 'HSSSSSSH' : 'HSSSSSSH',
    'HSESSESH',
    'HSSMMSSH',
    'HSSSSSSH',
    longHair ? '.SSSSSS.' : '.SSSSSS.',
    'CCCCCCCC',
  ]
  if (brow) rows[3] = 'HBSBBBSH'
  if (longHair) {
    rows[2] = 'HSSSSSSH'
    rows[5] = 'HSSSSSSH'
  }

  const palette: Record<string, string> = {
    H: hair,
    S: skin,
    C: shirt,
    E: eye,
    M: '#B4553F',
    B: eye,
  }
  return { rows, palette }
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10'
  const { rows, palette } = pixelFace(name || '?')
  return (
    <div
      className={`${dim} shrink-0 border-2 border-ink bg-panel-light shadow-[2px_2px_0_0_#05070F]`}
      aria-hidden
    >
      <svg viewBox="0 0 8 8" className="h-full w-full pixel-img" shapeRendering="crispEdges">
        {rows.map((row, y) =>
          row
            .split('')
            .map((ch, x) =>
              ch === '.' || !palette[ch] ? null : (
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} />
              ),
            ),
        )}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        className="absolute inset-0 bg-ink/70 animate-fade-in"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${width} animate-scale-in border-4 border-ink bg-panel shadow-lift`}
      >
        <div className="flex items-center justify-between gap-4 border-b-4 border-ink bg-sky px-4 py-3">
          <h3 className="text-[11px] leading-relaxed tracking-poster text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="btn-quiet grid h-7 w-7 shrink-0 place-items-center p-0 text-ink hover:bg-ink/20 hover:text-ink"
            aria-label="Close"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- section */

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label-xs text-sky">{eyebrow}</p>
        <h2 className="display-md mt-2">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function PageNum({ n }: { n: number | string }) {
  return <span className="font-sans text-[11px] tabular-nums text-sky">{n}</span>
}

export function NotFoundLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 font-sans text-[10px] uppercase tracking-label text-sky hover:text-cream"
    >
      {label} <span aria-hidden>▸</span>
    </Link>
  )
}

/* ------------------------------------------------------ stat poster */

export function Stat({
  value,
  label,
  accent = false,
}: {
  value: ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <div className="border-l-[3px] border-line pl-4">
      <div
        className={`font-sans text-2xl tabular-nums tracking-poster text-chunky ${
          accent ? 'text-flame' : 'text-sky'
        }`}
      >
        {value}
      </div>
      <div className="label-xs mt-1.5 text-mist-dim">{label}</div>
    </div>
  )
}
