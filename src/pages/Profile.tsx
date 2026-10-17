import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { Avatar, EmptyState, ErrorState, LoadingButton, Skeleton } from '../components/ui'
import { IconCheck, IconLogout, IconSpark } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { BADGES, formatShortDate, formatTimeRange } from '../lib/format'
import { useToast } from '../lib/toast'
import { CITIES, HOUSES, SOCIETIES, type EventWithMeta, type PointsEntry } from '../lib/types'

export default function Profile() {
  const { user, signOut, refresh } = useAuth()
  const toast = useToast()

  const [ledger, setLedger] = useState<PointsEntry[]>([])
  const [attended, setAttended] = useState<EventWithMeta[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    house: user?.house ?? HOUSES[0],
    city: user?.city ?? CITIES[0].name,
    society: user?.society ?? '',
    bio: user?.bio ?? '',
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [l, a, lb] = await Promise.all([
        api.pointsHistory(user.id),
        api.attendanceHistory(user.id),
        api.leaderboard(),
      ])
      setLedger(l)
      setAttended(a)
      const idx = lb.overall.findIndex((p) => p.id === user.id)
      setRank(idx >= 0 ? idx + 1 : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(
    () => ({
      points: user?.points ?? 0,
      attended: attended.length,
      hosted: attended.filter((e) => e.host_id === user?.id).length,
    }),
    [attended, user],
  )

  const badges = BADGES.map((b) => ({ ...b, earned: b.test(stats) }))

  if (!user) return null

  const save = async () => {
    if (form.full_name.trim().length < 2) {
      toast.error('Name is too short')
      return
    }
    setBusy(true)
    try {
      await api.updateProfile(user.id, {
        full_name: form.full_name.trim(),
        house: form.house,
        city: form.city,
        society: form.society || undefined,
        bio: form.bio.trim() || undefined,
      })
      await refresh()
      toast.success('Profile updated')
      setEdit(false)
    } catch (e) {
      toast.error('Could not save', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      {/* header */}
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={user.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="label-xs text-ink">
                {user.role} · {user.cohort ?? 'IITM BS'}
              </p>
              <h1 className="display-md text-on-sky mt-1">{user.full_name}</h1>
              <p className="mt-1 text-px-sm text-ink">
                {user.house} house · {user.city}
                {user.society ? ` · ${user.society}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn border-2 border-ink bg-panel px-4 py-2 text-sky shadow-press hover:bg-ink"
                onClick={() => setEdit((v) => !v)}
              >
                {edit ? 'Close editor' : 'Edit profile'}
              </button>
              <Link
                to="/dashboard"
                className="btn border-2 border-ink px-4 py-2 text-ink shadow-press hover:bg-ink hover:text-sky"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-6 border-t-2 border-ink/40 pt-6 sm:grid-cols-4">
            {[
              { v: stats.points, l: 'points' },
              { v: stats.attended, l: 'events attended' },
              { v: stats.hosted, l: 'events hosted' },
              { v: rank ? `#${rank}` : '—', l: 'overall rank' },
            ].map((s, i) => (
              <div key={s.l} className="border-l-[3px] border-ink pl-4">
                <div className="text-px-xl tracking-poster tabular-nums text-on-sky">{s.v}</div>
                <div className="label-xs mt-1 text-ink">{s.l}</div>
                {i === 0 && (
                  <div className="mt-1 text-px-xs uppercase tracking-label text-ink/70">
                    server-verified
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {error && <ErrorState body={error} onRetry={load} />}

        {edit && (
          <div className="card mb-6 p-6 animate-fade-up">
            <h2 className="text-base font-extrabold tracking-poster">Edit profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="pname">
                  Full name
                </label>
                <input
                  id="pname"
                  className="field"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="phouse">
                  House
                </label>
                <select
                  id="phouse"
                  className="field"
                  value={form.house}
                  onChange={(e) => setForm((f) => ({ ...f, house: e.target.value }))}
                >
                  {HOUSES.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="pcity">
                  City
                </label>
                <select
                  id="pcity"
                  className="field"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                >
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="psoc">
                  Society
                </label>
                <select
                  id="psoc"
                  className="field"
                  value={form.society}
                  onChange={(e) => setForm((f) => ({ ...f, society: e.target.value }))}
                >
                  <option value="">None</option>
                  {SOCIETIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="pbio">
                  Bio
                </label>
                <textarea
                  id="pbio"
                  className="field min-h-[90px]"
                  placeholder="A line about what you are working on…"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  maxLength={240}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(false)}>
                Cancel
              </button>
              <LoadingButton loading={busy} className="btn-primary" onClick={save}>
                Save changes
              </LoadingButton>
            </div>
            <p className="mt-3 text-px-sm text-ink-mute">
              Role and points cannot be edited here — both are enforced server-side.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {/* badges */}
            <div className="card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-extrabold tracking-poster">Achievements</h2>
                <span className="text-px-sm font-bold text-ink-mute">
                  {badges.filter((b) => b.earned).length}/{badges.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {badges.map((b) => (
                  <div
                    key={b.key}
                    className={`flex items-start gap-3 border px-4 py-3 ${
                      b.earned
                        ? 'border-brand/30 bg-brand-light'
                        : 'border-line bg-ink/[0.03] opacity-70'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center text-sm font-black ${
                        b.earned ? 'border-2 border-ink bg-sky text-ink' : 'bg-panel text-mist-dim'
                      }`}
                    >
                      {b.earned ? '★' : '·'}
                    </span>
                    <div>
                      <p className="text-px-sm font-extrabold">{b.name}</p>
                      <p className="text-px-sm leading-snug text-ink-soft">{b.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* points ledger */}
            <div className="card overflow-hidden">
              <div className="border-b border-line px-6 py-4">
                <p className="label-xs text-brand">Ledger</p>
                <h2 className="mt-1 text-lg font-extrabold tracking-poster">
                  Participation points
                </h2>
              </div>
              {ledger.length === 0 ? (
                <EmptyState
                  title="No points yet"
                  body="Points are written only after an organiser verifies your check-in."
                  action={
                    <Link to="/explore" className="btn-primary">
                      Explore events
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {ledger.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center bg-flame-light text-px-sm font-black text-flame-dark">
                        +{p.points}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-px-sm font-bold">{p.reason}</p>
                        <p className="text-px-sm text-ink-mute">
                          {formatShortDate(p.created_at.slice(0, 10))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* attendance history */}
            <div className="card overflow-hidden lg:col-span-2">
              <div className="border-b border-line px-6 py-4">
                <p className="label-xs text-brand">History</p>
                <h2 className="mt-1 text-lg font-extrabold tracking-poster">Verified attendance</h2>
              </div>
              {attended.length === 0 ? (
                <EmptyState
                  icon={<IconCheck className="h-6 w-6" />}
                  title="No attendance recorded yet"
                  body="Register for an event, then have your pass scanned at the venue."
                  action={
                    <Link to="/explore" className="btn-ghost">
                      Find an event
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-line">
                  {attended.map((e) => (
                    <Link
                      key={e.id}
                      to={`/events/${e.id}`}
                      className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-ink/[0.02]"
                    >
                      <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center bg-pixgreen-light text-pixgreen-dark">
                        <span className="text-px-xs font-black uppercase tracking-label">
                          {formatShortDate(e.date).split(' ')[1]}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {formatShortDate(e.date).split(' ')[0]}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-px-base font-extrabold tracking-poster">
                          {e.title}
                        </p>
                        <p className="text-px-sm text-ink-soft">
                          {e.city} · {formatTimeRange(e.start_time, e.end_time)}
                          {e.host_id === user.id ? ' · you hosted' : ''}
                        </p>
                      </div>
                      <span className=" bg-brand-light px-2.5 py-1 text-px-xs font-black uppercase tracking-label text-brand">
                        +{e.points_value} pts
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* account */}
            <div className="card p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <IconSpark className="mt-0.5 h-4 w-4 text-flame" />
                  <div>
                    <p className="text-px-base font-bold">Account</p>
                    <p className="text-px-sm text-ink-soft">{user.email}</p>
                    {user.bio && <p className="mt-1 text-px-sm text-ink-soft">{user.bio}</p>}
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    await signOut()
                    window.location.href = '/'
                  }}
                >
                  <IconLogout className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
