import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteShell } from '../components/Shell'
import { LoadingButton } from '../components/ui'
import { Logo } from '../components/icons'
import { useAuth } from '../lib/auth'
import { DEMO_MODE } from '../lib/config'
import { useToast } from '../lib/toast'
import { CITIES, HOUSES, type Profile } from '../lib/types'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    house: HOUSES[0] as string,
    city: CITIES[0].name,
    role: 'student' as Profile['role'],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.full_name.trim().length < 2) return setError('Enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')

    setBusy(true)
    try {
      const p = await signUp({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
      })
      toast.success('Account created', `Welcome to CollabSphere, ${p.full_name.split(' ')[0]}.`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiteShell>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <div className="sky-band relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="text-px-lg tracking-poster text-ink">CollabSphere</span>
          </Link>
          <div>
            <p className="label-xs text-ink">Create account</p>
            <h1 className="display-lg text-on-sky mt-3 max-w-[11ch]">
              Join your city&apos;s circle.
            </h1>
            <p className="mt-5 max-w-md font-body text-px-base leading-snug text-ink">
              Pick a house, pick a city. CollabSphere shows you the students already organising near
              you.
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

        <div className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <h2 className="display-md text-cream">Create account</h2>
            <p className="mt-2 font-body text-px-sm text-mist">
              One minute now, a verified participation ledger later.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <div>
                <label className="field-label" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  className="field"
                  placeholder="Meera Krishnan"
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label" htmlFor="remail">
                  Email
                </label>
                <input
                  id="remail"
                  type="email"
                  autoComplete="email"
                  className="field"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label" htmlFor="rpass">
                  Password
                </label>
                <input
                  id="rpass"
                  type="password"
                  autoComplete="new-password"
                  className="field"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="house">
                    House
                  </label>
                  <select
                    id="house"
                    className="field"
                    value={form.house}
                    onChange={(e) => set('house', e.target.value)}
                  >
                    {HOUSES.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="city">
                    City
                  </label>
                  <select
                    id="city"
                    className="field"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                  >
                    {CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {DEMO_MODE && (
                <div>
                  <span className="field-label">Demo role</span>
                  <div className="flex gap-2">
                    {(['student', 'organizer', 'admin'] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => set('role', r)}
                        className={`chip capitalize ${form.role === r ? 'chip-active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 font-body text-px-sm text-flame-dark">
                    Demo only — in Supabase mode every signup starts as a student and roles are
                    promoted server-side.
                  </p>
                </div>
              )}

              {error && (
                <p className="border-[3px] border-pixred bg-pixred-light px-3 py-2.5 font-body text-px-sm text-pixred-dark">
                  {error}
                </p>
              )}

              <LoadingButton loading={busy} className="btn-primary w-full py-3" type="submit">
                Create account
              </LoadingButton>
            </form>

            <p className="mt-6 font-body text-px-sm text-mist">
              Already registered?{' '}
              <Link to="/login" className="text-sky hover:text-cream">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
