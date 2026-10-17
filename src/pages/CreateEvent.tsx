import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { LoadingButton } from '../components/ui'
import { IconAlert, IconCheck, IconShield } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { DEMO_MODE } from '../lib/config'
import { useToast } from '../lib/toast'
import { CITIES, EVENT_TYPES, HOUSES, SOCIETIES, type CampusEvent } from '../lib/types'

const today = new Date().toISOString().slice(0, 10)

interface FormState {
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  city: string
  capacity: number
  type: CampusEvent['type']
  house: string
  society: string
  collab_orgs: string[]
}

const INITIAL: FormState = {
  title: '',
  description: '',
  date: today,
  start_time: '10:00',
  end_time: '12:00',
  venue: '',
  city: CITIES[0].name,
  capacity: 20,
  type: 'meetup',
  house: HOUSES[0],
  society: '',
  collab_orgs: [],
}

export default function CreateEvent() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ id: string; title: string } | null>(null)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const orgs = useMemo(
    () => [
      ...HOUSES.filter((h) => h !== form.house).map((h) => ({
        group: 'Houses' as const,
        name: h,
      })),
      ...SOCIETIES.filter((s) => s !== form.society).map((s) => ({
        group: 'Societies' as const,
        name: s,
      })),
    ],
    [form.house, form.society],
  )

  const toggleCollab = (name: string) =>
    setForm((f) => ({
      ...f,
      collab_orgs: f.collab_orgs.includes(name)
        ? f.collab_orgs.filter((o) => o !== name)
        : [...f.collab_orgs, name],
    }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.title.trim().length < 6) e.title = 'Use at least 6 characters.'
    if (form.description.trim().length < 30)
      e.description = 'Give attendees at least 30 characters of detail.'
    if (!form.date) e.date = 'Pick a date.'
    else if (form.date < today) e.date = 'The date cannot be in the past.'
    if (form.end_time <= form.start_time) e.end_time = 'End time must be after start time.'
    if (form.venue.trim().length < 3) e.venue = 'Name a venue or meeting point.'
    if (form.capacity < 2 || form.capacity > 500) e.capacity = 'Capacity must be 2“500.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!user) return
    if (!validate()) {
      toast.error('Check the highlighted fields')
      return
    }
    setBusy(true)
    try {
      const coords = CITIES.find((c) => c.name === form.city) ?? CITIES[0]
      const created = await api.createEvent(user.id, {
        title: form.title,
        description: form.description,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        venue: form.venue.trim(),
        city: form.city,
        lat: coords.lat,
        lng: coords.lng,
        capacity: Number(form.capacity),
        type: form.type,
        house: form.house,
        society: form.society || undefined,
        collab_orgs: form.collab_orgs,
        points_value: 25,
      })
      setDone({ id: created.id, title: created.title })
      toast.success('Proposal submitted', 'An admin will review it shortly.')
    } catch (e) {
      toast.error('Could not submit', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <div className="card overflow-hidden text-center">
            <div className="sky-band px-6 py-10">
              <span className="mx-auto grid h-14 w-14 place-items-center border-2 border-ink bg-ink text-pixgreen shadow-[3px_3px_0_0_#FFFFFF]">
                <IconCheck className="h-7 w-7" />
              </span>
              <h1 className="display-md text-on-sky mt-5">Proposal submitted</h1>
            </div>
            <div className="px-6 py-7">
              <p className="text-px-base leading-relaxed text-mist">
                <strong className="text-cream">“{done.title}”</strong> is now awaiting admin
                approval. You will see it on your dashboard once it is published, and any house you
                invited will receive a co-host request.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/dashboard" className="btn-primary">
                  Go to dashboard
                </Link>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setDone(null)
                    setForm(INITIAL)
                  }}
                >
                  Propose another
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="sky-band">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
          <p className="label-xs text-ink">Host</p>
          <h1 className="display-lg text-on-sky mt-1.5">Create an event</h1>
          <p className="mt-2 max-w-2xl font-body text-px-base text-ink">
            Every proposal is reviewed before it appears publicly. Fill in the details other
            students need to decide.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <form onSubmit={submit} className="card space-y-6 p-6" noValidate>
            <section>
              <h2 className="text-base font-extrabold tracking-poster">The basics</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="field-label" htmlFor="title">
                    Event title
                  </label>
                  <input
                    id="title"
                    className="field"
                    placeholder="Chennai Bay Area Co-working Sprint"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    maxLength={120}
                  />
                  {errors.title && <p className="field-error">{errors.title}</p>}
                </div>

                <div>
                  <label className="field-label" htmlFor="desc">
                    Description
                  </label>
                  <textarea
                    id="desc"
                    className="field min-h-[140px]"
                    placeholder="What will happen, who should come, what to bring…"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    maxLength={1600}
                  />
                  <div className="mt-1 flex justify-between">
                    {errors.description ? (
                      <p className="field-error mt-0">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-px-xs font-semibold text-ink-mute">
                      {form.description.length}/1600
                    </span>
                  </div>
                </div>

                <div>
                  <span className="field-label">Format</span>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.value}
                        onClick={() => set('type', t.value)}
                        className={`chip ${form.type === t.value ? 'chip-active' : ''}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-line pt-6">
              <h2 className="text-base font-extrabold tracking-poster">When &amp; where</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="date">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    min={today}
                    className="field"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                  />
                  {errors.date && <p className="field-error">{errors.date}</p>}
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
                  <p className="mt-1.5 text-px-xs text-ink-mute">
                    Plots the pin at the city centroid — exact addresses stay in the description.
                  </p>
                </div>
                <div>
                  <label className="field-label" htmlFor="start">
                    Start time
                  </label>
                  <input
                    id="start"
                    type="time"
                    className="field"
                    value={form.start_time}
                    onChange={(e) => set('start_time', e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="end">
                    End time
                  </label>
                  <input
                    id="end"
                    type="time"
                    className="field"
                    value={form.end_time}
                    onChange={(e) => set('end_time', e.target.value)}
                  />
                  {errors.end_time && <p className="field-error">{errors.end_time}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="venue">
                    Venue / meeting point
                  </label>
                  <input
                    id="venue"
                    className="field"
                    placeholder="The Hive, Besant Nagar"
                    value={form.venue}
                    onChange={(e) => set('venue', e.target.value)}
                  />
                  {errors.venue && <p className="field-error">{errors.venue}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="cap">
                    Capacity
                  </label>
                  <input
                    id="cap"
                    type="number"
                    min={2}
                    max={500}
                    className="field"
                    value={form.capacity}
                    onChange={(e) => set('capacity', Number(e.target.value))}
                  />
                  {errors.capacity && <p className="field-error">{errors.capacity}</p>}
                </div>
              </div>
            </section>

            <section className="border-t border-line pt-6">
              <h2 className="text-base font-extrabold tracking-poster">Ownership</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  <label className="field-label" htmlFor="soc">
                    Society (optional)
                  </label>
                  <select
                    id="soc"
                    className="field"
                    value={form.society}
                    onChange={(e) => set('society', e.target.value)}
                  >
                    <option value="">None</option>
                    {SOCIETIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <span className="field-label">Request collaboration</span>
                <p className="mb-2.5 text-px-sm text-ink-mute">
                  Invite other houses or societies to co-host. They accept from their dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  {orgs.map((o) => (
                    <button
                      type="button"
                      key={o.name}
                      onClick={() => toggleCollab(o.name)}
                      className={`chip ${form.collab_orgs.includes(o.name) ? 'chip-active' : ''}`}
                    >
                      <span className="text-px-xs font-black uppercase tracking-label opacity-70">
                        {o.group}
                      </span>
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <p className="flex items-start gap-2 text-px-sm text-ink-mute">
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
                Your proposal is created with status <strong>pending</strong>.
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => navigate('/dashboard')}>
                  Cancel
                </button>
                <LoadingButton loading={busy} className="btn-primary" type="submit">
                  Submit for approval
                </LoadingButton>
              </div>
            </div>
          </form>

          {/* side */}
          <aside className="space-y-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-brand">
                <IconShield className="h-[18px] w-[18px]" />
                <p className="label-xs">What happens next</p>
              </div>
              <ol className="mt-4 space-y-3.5">
                {[
                  'An admin reviews your proposal.',
                  'On approval it is published to Explore and the map.',
                  'Students register and receive single-use passes.',
                  'You scan passes at the venue — points post automatically.',
                ].map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center bg-sky text-px-xs text-ink">
                      {i + 1}
                    </span>
                    <span className="text-px-sm leading-snug text-ink-soft">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card p-5">
              <p className="label-xs text-ink-mute">Signed in as</p>
              <p className="mt-1.5 text-px-base font-extrabold tracking-poster">
                {user?.full_name}
              </p>
              <p className="text-px-sm text-ink-soft">
                {user?.house} · {user?.city} · {user?.role}
              </p>
              {user?.role === 'student' && (
                <p className="mt-3 bg-sky-pale px-3 py-2.5 text-px-sm text-ink-soft">
                  Students may propose events; publishing always requires an admin approval step.
                </p>
              )}
              {DEMO_MODE && (
                <p className="mt-3 border border-flame/30 bg-flame-light px-3 py-2.5 text-px-sm text-flame-dark">
                  Demo mode: proposals are stored in this browser only.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
