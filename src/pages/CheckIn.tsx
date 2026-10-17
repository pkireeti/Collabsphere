import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { AttendeeQr, CheckinResultCard, QrScanner, parsePayload } from '../components/Qr'
import { Avatar, EmptyState, ErrorState, LoadingButton, Pill, Skeleton } from '../components/ui'
import { IconCheck, IconQr, IconSearch, IconShield, IconTicket } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatShortDate, formatTimeRange } from '../lib/format'
import { useToast } from '../lib/toast'
import type { EventWithMeta, ManifestRow } from '../lib/types'

type Tab = 'scan' | 'manual'

export default function CheckIn() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()

  const [staffEvents, setStaffEvents] = useState<EventWithMeta[]>([])
  const [passes, setPasses] = useState<EventWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string>(id ?? '')
  const [manifest, setManifest] = useState<ManifestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>('scan')
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message: string
    already?: boolean
    name?: string
  } | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [all, mine] = await Promise.all([
        api.listEvents(undefined, user.id),
        api.listMyRegistrations(user.id),
      ])
      const staff = all.filter(
        (e) => user.role === 'admin' || e.host_id === user.id || e.cohost_ids.includes(user.id),
      )
      setStaffEvents(staff)
      setPasses(mine)
      if (id) setSelectedId(id)
      else if (!selectedId && staff.length) setSelectedId(staff[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the check-in console.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  useEffect(() => {
    void load()
  }, [load])

  const loadManifest = useCallback(async () => {
    if (!user || !selectedId) return
    try {
      setManifest(await api.attendeeManifest(selectedId, user.id))
    } catch (e) {
      toast.error('Manifest unavailable', e instanceof Error ? e.message : undefined)
    }
  }, [user, selectedId, toast])

  useEffect(() => {
    if (selectedId) void loadManifest()
  }, [selectedId, loadManifest])

  const runVerification = async (raw: string) => {
    if (!user) return
    setBusy(true)
    try {
      const parsed = parsePayload(raw)
      const payload = parsed ? parsed : { eventId: selectedId, token: raw.trim() }

      if (parsed && selectedId && parsed.eventId !== selectedId) {
        setResult({
          ok: false,
          message: 'That pass belongs to a different event. Switch events and scan again.',
        })
        return
      }

      const res = await api.verifyCheckin(payload.eventId || selectedId, payload.token, user.id)
      setResult({
        ok: res.ok,
        already: res.already,
        message: res.message,
        name: res.attendee?.full_name,
      })
      if (res.ok) toast.success('Attendee checked in', res.message)
      else toast.error('Check-in rejected', res.message)
      await loadManifest()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed.'
      setResult({ ok: false, message: msg })
      toast.error('Verification failed', msg)
    } finally {
      setBusy(false)
    }
  }

  const selected = useMemo(
    () => staffEvents.find((e) => e.id === selectedId) ?? null,
    [staffEvents, selectedId],
  )

  const visibleManifest = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return manifest
    return manifest.filter(
      (r) =>
        r.attendee?.full_name.toLowerCase().includes(q) ||
        r.attendee?.house.toLowerCase().includes(q) ||
        r.registration.token.toLowerCase().includes(q),
    )
  }, [manifest, query])

  const checkedCount = manifest.filter((r) => r.registration.checked_in_at).length

  return (
    <AppShell>
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <p className="label-xs text-ink">Organiser tools</p>
          <h1 className="display-lg text-on-sky mt-1.5">QR check-in</h1>
          <p className="mt-2 max-w-2xl font-body text-px-base text-ink">
            Scanning sends the token to the server for verification. Attendance is recorded only
            after it passes — duplicates are rejected automatically.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {error && <ErrorState body={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-full" />
            <div className="grid gap-5 lg:grid-cols-2">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          </div>
        ) : staffEvents.length === 0 ? (
          <EmptyState
            icon={<IconShield className="h-6 w-6" />}
            title="You do not host any events yet"
            body="Check-in is available to hosts, co-hosts and admins. Propose an event first, or open your own pass below."
            action={
              <Link to="/create" className="btn-primary">
                Create an event
              </Link>
            }
          />
        ) : (
          <>
            {/* event picker */}
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="label-xs text-ink-mute">Active event</span>
                <select
                  className="field max-w-full flex-1 sm:max-w-md"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  aria-label="Select event to check in for"
                >
                  {staffEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatShortDate(e.date)} · {e.title} ({e.city})
                    </option>
                  ))}
                </select>
                {selected && (
                  <div className="flex flex-wrap items-center gap-2 text-px-sm text-ink-soft">
                    <span>{formatTimeRange(selected.start_time, selected.end_time)}</span>
                    <span>·</span>
                    <span>
                      <strong className="text-cream">{checkedCount}</strong>/{manifest.length}{' '}
                      checked in
                    </span>
                    <Link to={`/events/${selected.id}`} className="btn-quiet btn-sm">
                      View event
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {/* scanner */}
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex gap-1 border-2 border-line bg-panel-dark p-1">
                    {(
                      [
                        ['scan', 'Camera scan'],
                        ['manual', 'Manual token'],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setTab(v)}
                        className={`px-3 py-1.5 text-px-sm ${
                          tab === v ? 'bg-sky text-ink' : 'text-mist hover:text-cream'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-px-xs font-black uppercase tracking-label text-pixgreen">
                    <span className="h-1.5 w-1.5 bg-pixgreen" />
                    Server verified
                  </span>
                </div>

                {tab === 'scan' ? (
                  <QrScanner
                    onResult={(text) => {
                      void runVerification(text)
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="field-label" htmlFor="token">
                        Attendee token
                      </label>
                      <input
                        id="token"
                        className="field font-mono uppercase tracking-wider"
                        placeholder="AB3KX9QM2TR7ZP41"
                        value={manual}
                        onChange={(e) => setManual(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manual.trim()) void runVerification(manual)
                        }}
                      />
                    </div>
                    <LoadingButton
                      loading={busy}
                      className="btn-primary w-full"
                      disabled={manual.trim().length < 6}
                      onClick={() => void runVerification(manual)}
                    >
                      <IconSearch className="h-4 w-4" /> Verify token
                    </LoadingButton>
                    <p className="text-px-sm text-ink-mute">
                      Useful when a camera is unavailable. The same server-side checks apply.
                    </p>
                  </div>
                )}

                {busy && !result && (
                  <p className="mt-4 text-px-sm font-semibold text-ink-soft">
                    Contacting the verification service…
                  </p>
                )}

                {result && (
                  <div className="mt-4">
                    <CheckinResultCard
                      ok={result.ok}
                      already={result.already}
                      message={result.message}
                      attendeeName={result.name}
                    />
                  </div>
                )}

                <div className="mt-5 flex items-start gap-2.5 bg-sky-pale px-4 py-3">
                  <IconQr className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <p className="text-px-sm leading-relaxed text-ink-soft">
                    Duplicate prevention: a second scan of the same pass returns{' '}
                    <strong>Duplicate blocked</strong> and writes no extra points.
                  </p>
                </div>
              </div>

              {/* manifest */}
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <p className="label-xs text-ink-mute">Attendee manifest</p>
                    <p className="mt-1 text-px-sm text-ink-soft">
                      {manifest.filter((r) => r.registration.status === 'registered').length}{' '}
                      registered · {checkedCount} checked in
                    </p>
                  </div>
                  <input
                    className="field max-w-[200px] py-2 text-px-sm"
                    placeholder="Search name / house"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search attendees"
                  />
                </div>

                <div className="max-h-[520px] overflow-y-auto">
                  {visibleManifest.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-ink-mute">
                      {manifest.length === 0
                        ? 'No registrations yet.'
                        : 'No attendee matches that search.'}
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {visibleManifest.map((row) => {
                        const checked = Boolean(row.registration.checked_in_at)
                        return (
                          <li
                            key={row.registration.id}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <Avatar name={row.attendee?.full_name ?? '?'} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-px-sm font-bold">
                                {row.attendee?.full_name}
                              </p>
                              <p className="truncate text-px-sm text-ink-soft">
                                {row.attendee?.house} · {row.attendee?.city} ·{' '}
                                <span className="font-mono">
                                  {row.registration.token.slice(0, 8)}…
                                </span>
                              </p>
                            </div>
                            {checked ? (
                              <Pill className="bg-pixgreen-light text-pixgreen-dark">
                                <IconCheck className="h-3 w-3" /> In
                              </Pill>
                            ) : (
                              <button
                                className="btn-ghost btn-sm"
                                disabled={busy}
                                onClick={() => void runVerification(row.registration.token)}
                              >
                                Check in
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* my passes */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <IconTicket className="h-[18px] w-[18px] text-brand" />
            <h2 className="text-lg font-extrabold tracking-poster">Your check-in passes</h2>
          </div>
          {passes.length === 0 ? (
            <EmptyState
              title="No active passes"
              body="Register for an event and your single-use check-in pass appears here."
              action={
                <Link to="/explore" className="btn-primary">
                  Explore events
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {passes.map((e) =>
                e.my_registration && !e.my_registration.checked_in_at ? (
                  <AttendeeQr
                    key={e.id}
                    eventId={e.id}
                    token={e.my_registration.token}
                    title={e.title}
                  />
                ) : (
                  <div key={e.id} className="card flex items-center gap-3 p-5">
                    <span className="grid h-9 w-9 place-items-center bg-pixgreen-light text-pixgreen-dark">
                      <IconCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-px-base font-extrabold tracking-poster">
                        {e.title}
                      </p>
                      <p className="text-px-sm text-ink-soft">
                        Checked in · {formatShortDate(e.date)}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
