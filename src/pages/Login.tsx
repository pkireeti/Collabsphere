import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SiteShell } from '../components/Shell'
import { LoadingButton } from '../components/ui'
import { Logo } from '../components/icons'
import { useAuth } from '../lib/auth'
import { DEMO_MODE } from '../lib/config'
import { useToast } from '../lib/toast'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@collabsphere.in', password: 'admin123' },
  {
    label: 'Organizer',
    email: 'organizer@collabsphere.in',
    password: 'organizer123',
  },
  {
    label: 'Student',
    email: 'student@collabsphere.in',
    password: 'student123',
  },
]

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (loc.state as { from?: string } | null)?.from ?? '/dashboard'

  const submit = async (e: FormEvent, creds?: { email: string; password: string }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const p = await signIn(creds?.email ?? email, creds?.password ?? password)
      toast.success(`Welcome back, ${p.full_name.split(' ')[0]}`)
      navigate(p.role === 'admin' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiteShell>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        {/* poster panel */}
        <div className="sky-band relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="text-px-lg tracking-poster text-ink">CollabSphere</span>
          </Link>
          <div>
            <p className="label-xs text-ink">Sign in</p>
            <h1 className="display-lg mt-3 max-w-[12ch] text-on-sky">
              Welcome back to the circle.
            </h1>
            <p className="mt-5 max-w-md font-body text-px-base leading-snug text-ink">
              Your registrations, participation points and house ranking all live here.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['never too distant', 'always in circle', 'always verified'].map((t) => (
              <span
                key={t}
                className="border-2 border-ink bg-ink px-2 py-2 text-center font-sans text-[9px] uppercase tracking-label text-sky"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* form */}
        <div className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <h2 className="display-md text-cream">Sign in</h2>
            <p className="mt-2 font-body text-px-sm text-mist">
              Use your community account, or create one in under a minute.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <div>
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <p className="border-[3px] border-pixred bg-pixred-light px-3 py-2.5 font-body text-px-sm text-pixred-dark">
                  {error}
                </p>
              )}

              <LoadingButton loading={busy} className="btn-primary w-full py-3" type="submit">
                Sign in
              </LoadingButton>
            </form>

            {DEMO_MODE && (
              <div className="mt-6 border-[3px] border-[#7a3a10] bg-flame-light p-4">
                <p className="label-xs text-flame-dark">Local demo mode</p>
                <p className="mt-2 font-body text-px-sm leading-snug text-mist">
                  No Supabase keys are configured, so these accounts exist only in this browser.
                  They are <strong>not</strong> authenticated credentials.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      className="btn-ghost btn-sm"
                      disabled={busy}
                      onClick={(e) => submit(e, a)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 font-body text-px-sm text-mist">
              New here?{' '}
              <Link to="/register" className="text-sky hover:text-cream">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
