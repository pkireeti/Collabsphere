import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { DEMO_MODE, MODE_LABEL } from '../lib/config'
import {
  IconCompass,
  IconHome,
  IconLogout,
  IconMenu,
  IconPlus,
  IconQr,
  IconShield,
  IconSpark,
  IconTrophy,
  IconUser,
  IconX,
  Logo,
} from './icons'
import { Avatar } from './ui'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/explore', label: 'Explore events', icon: IconCompass },
  { to: '/create', label: 'Create event', icon: IconPlus },
  { to: '/checkin', label: 'QR check-in', icon: IconQr },
  { to: '/leaderboard', label: 'Leaderboard', icon: IconTrophy },
  { to: '/profile', label: 'Profile', icon: IconUser },
]

export function ModeBadge({ compact = false }: { compact?: boolean }) {
  if (!DEMO_MODE) return null
  return (
    <span
      title="Data lives only in this browser. Nothing is authenticated or securely persisted."
      className={`inline-flex items-center gap-2 border-2 border-[#7a3a10] bg-flame-light px-2.5 py-1 font-sans text-[9px] uppercase tracking-label text-flame-dark ${
        compact ? 'hidden sm:inline-flex' : ''
      }`}
    >
      <span className="h-2 w-2 bg-flame animate-blink" />
      {MODE_LABEL}
    </span>
  )
}

/* --------------------------------------------------------------- navbar */

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => setOpen(false), [loc.pathname])

  const links = [
    { to: '/explore', label: 'Explore' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/dashboard', label: 'Dashboard' },
  ]

  const navLink = (isActive: boolean, tint: 'sky' | 'flame' = 'sky') =>
    `flex items-center gap-2 border-2 px-3 py-2 font-sans text-[10px] uppercase tracking-label transition-colors ${
      isActive
        ? tint === 'sky'
          ? 'border-ink bg-sky text-ink shadow-[2px_2px_0_0_#05070F]'
          : 'border-ink bg-flame text-ink shadow-[2px_2px_0_0_#05070F]'
        : 'border-transparent text-mist hover:border-line hover:bg-panel-light hover:text-cream'
    }`

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-panel-dark">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-[15px] tracking-poster text-cream sm:text-[17px]">
            Collab<span className="text-sky">Sphere</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => navLink(isActive)}>
              {l.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => navLink(isActive, 'flame')}>
              <IconShield className="h-4 w-4" /> Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ModeBadge compact />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="hidden items-center gap-2.5 border-2 border-line bg-panel py-1 pl-1 pr-3 hover:border-sky sm:flex"
              >
                <Avatar name={user.full_name} size="sm" />
                <span className="text-left leading-tight">
                  <span className="block font-sans text-[10px] text-cream">{user.full_name}</span>
                  <span className="block font-sans text-[9px] uppercase tracking-label text-sky">
                    {user.points} pts
                  </span>
                </span>
              </Link>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
                className="btn-quiet hidden md:inline-flex"
                title="Sign out"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Join free
              </Link>
            </div>
          )}

          <button
            className="btn-ghost btn-sm -mr-1 grid h-9 w-9 place-items-center p-0 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-4 border-ink bg-panel px-4 py-3 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="border-2 border-transparent px-3 py-2.5 font-sans text-[11px] uppercase tracking-label text-mist hover:border-line hover:bg-panel-light hover:text-cream"
              >
                {l.label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className="border-2 border-transparent px-3 py-2.5 font-sans text-[11px] uppercase tracking-label text-flame-dark hover:border-[#7a3a10] hover:bg-flame-light"
              >
                Admin dashboard
              </NavLink>
            )}
            {user ? (
              <>
                <NavLink
                  to="/profile"
                  className="border-2 border-transparent px-3 py-2.5 font-sans text-[11px] uppercase tracking-label text-mist hover:border-line hover:bg-panel-light hover:text-cream"
                >
                  Profile · {user.points} pts
                </NavLink>
                <button
                  onClick={async () => {
                    await signOut()
                    navigate('/')
                  }}
                  className="border-2 border-transparent px-3 py-2.5 text-left font-sans text-[11px] uppercase tracking-label text-mist hover:border-line hover:bg-panel-light hover:text-cream"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="btn-ghost flex-1">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary flex-1">
                  Join free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/* -------------------------------------------------------------- sidebar */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <p className="label-xs text-mist-dim">Player menu</p>
      </div>
      <nav className="flex-1 space-y-1.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 border-2 px-3 py-2.5 font-sans text-[11px] uppercase tracking-label transition-colors ${
                isActive
                  ? 'border-ink bg-sky text-ink shadow-[3px_3px_0_0_#05070F]'
                  : 'border-transparent text-mist hover:border-line hover:bg-panel-light hover:text-cream'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 border-2 px-3 py-2.5 font-sans text-[11px] uppercase tracking-label transition-colors ${
                isActive
                  ? 'border-ink bg-flame text-ink shadow-[3px_3px_0_0_#05070F]'
                  : 'border-transparent text-flame-dark hover:border-[#7a3a10] hover:bg-flame-light'
              }`
            }
          >
            <IconShield className="h-[18px] w-[18px]" />
            Admin dashboard
          </NavLink>
        )}
      </nav>

      <div className="m-3 border-[3px] border-[#1c4a6b] bg-[#0e2438] p-4">
        <div className="mb-2 flex items-center gap-2 text-sky">
          <IconSpark className="h-4 w-4" />
          <span className="label-xs">Points ledger</span>
        </div>
        <p className="font-body text-px-sm leading-snug text-mist">
          Points are written only after a verified server-side check-in. Client-submitted totals are
          ignored.
        </p>
      </div>

      {DEMO_MODE && (
        <div className="mx-3 mb-3 border-[3px] border-[#7a3a10] bg-flame-light p-4">
          <p className="label-xs text-flame-dark">Local demo mode</p>
          <p className="mt-2 font-body text-px-sm leading-snug text-mist">
            No Supabase keys found. Accounts and events are stored in this browser only — do not
            treat them as real.
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- shell */

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  useEffect(() => setDrawer(false), [loc.pathname])

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r-4 border-ink bg-panel-dark lg:block">
          <SidebarContent />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-ink/70 animate-fade-in"
              onClick={() => setDrawer(false)}
              aria-label="Close navigation"
            />
            <div className="absolute left-0 top-0 h-full w-72 border-r-4 border-ink bg-panel-dark shadow-lift animate-fade-up">
              <div className="flex justify-end border-b-4 border-ink p-2">
                <button
                  className="btn-quiet grid h-8 w-8 place-items-center p-0"
                  onClick={() => setDrawer(false)}
                  aria-label="Close navigation"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="border-b-4 border-ink bg-panel-dark px-4 py-2.5 lg:hidden">
            <button onClick={() => setDrawer(true)} className="btn-ghost btn-sm w-full">
              <IconMenu className="h-4 w-4" /> Menu
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

/** Full-bleed layout used by the landing page. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  )
}
