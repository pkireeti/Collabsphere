import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { EventMap } from '../components/EventMap'
import { AttendeeQr } from '../components/Qr'
import { Avatar, ErrorState, LoadingButton, Modal, Pill, Skeleton } from '../components/ui'
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconPin,
  IconQr,
  IconShield,
  IconSpark,
  IconUsers,
} from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDate, formatTimeRange, isPast, relativeDay } from '../lib/format'
import { useToast } from '../lib/toast'
import { statusMeta, typeMeta, type EventWithMeta } from '../lib/types'

export default function EventDetails() {
  const { id = '' } = useParams()
  const { user, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [event, setEvent] = useState<EventWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeNote, setDisputeNote] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .getEvent(id, user?.id)
      .then(setEvent)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, user?.id])

  useEffect(load, [load])

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-8 sm:px-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full" />
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !event) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <ErrorState
            title="Could not load this event"
            body={error ?? 'The event may have been removed.'}
            onRetry={load}
          />
          <Link to="/explore" className="btn-ghost mt-5">
            Back to explore
          </Link>
        </div>
      </AppShell>
    )
  }

  const meta = typeMeta(event.type)
  const status = statusMeta(event.status)
  const registered = Boolean(event.my_registration && event.my_registration.status === 'registered')
  const checkedIn = Boolean(event.my_registration?.checked_in_at)
  const past = isPast(event.date, event.end_time)
  const isStaff =
    Boolean(user) &&
    (user!.role === 'admin' || event.host_id === user!.id || event.cohost_ids.includes(user!.id))
  const isHost = Boolean(user) && event.host_id === user!.id
  const full = event.seats_left === 0

  const doRegister = async () => {
    if (!user) return navigate('/login', { state: { from: `/events/${event.id}` } })
    setBusy(true)
    try {
      await api.registerForEvent(event.id, user.id)
      toast.success('Registered', 'Your check-in pass is ready below.')
      await refresh()
      load()
    } catch (e) {
      toast.error('Registration failed', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const doCancel = async () => {
    if (!user) return
    setBusy(true)
    try {
      await api.cancelRegistration(event.id, user.id)
      toast.info('Registration cancelled', 'Your seat has been released.')
      setCancelOpen(false)
      load()
    } catch (e) {
      toast.error('Could not cancel', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitDispute = async () => {
    if (!user) return
    setBusy(true)
    try {
      await api.submitDispute(event.id, user.id, disputeNote)
      toast.success('Dispute submitted', 'An admin will review it.')
      setDisputeOpen(false)
      setDisputeNote('')
    } catch (e) {
      toast.error('Could not submit', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = async (next: 'cancelled' | 'completed' | 'approved') => {
    if (!user) return
    setBusy(true)
    try {
      await api.setEventStatus(event.id, user.id, next)
      toast.success(`Event marked ${next}`)
      load()
    } catch (e) {
      toast.error('Could not update', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      {/* hero */}
      <div className="sky-band">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-2 border-ink bg-ink px-3 py-1 text-px-xs uppercase tracking-label text-sky shadow-[2px_2px_0_0_#FFFFFF]">
              {meta.label}
            </span>
            <span className={`pill ${status.cls} bg-panel`}>{status.label}</span>
            <span className="text-px-xs uppercase tracking-label text-ink">
              {relativeDay(event.date)}
            </span>
          </div>
          <h1 className="display-md text-on-sky mt-3 max-w-[24ch]">{event.title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-px-sm text-ink">
            <span className="flex items-center gap-1.5">
              <IconCalendar className="h-4 w-4" /> {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock className="h-4 w-4" /> {formatTimeRange(event.start_time, event.end_time)}
            </span>
            <span className="flex items-center gap-1.5">
              <IconPin className="h-4 w-4" /> {event.venue}, {event.city}
            </span>
            <span className="flex items-center gap-1.5">
              <IconUsers className="h-4 w-4" /> {event.attendee_count}/{event.capacity} attending
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* main column */}
          <div className="space-y-6">
            <section className="card p-6">
              <h2 className="text-lg font-extrabold tracking-poster">About this event</h2>
              <p className="mt-3 whitespace-pre-line text-px-base leading-relaxed text-ink-soft">
                {event.description}
              </p>

              <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
                <Field label="Format" value={meta.label} />
                <Field label="Organising house" value={event.house} />
                <Field label="Society" value={event.society ?? '—'} />
                <Field label="Participation points" value={`${event.points_value} pts`} accent />
                <Field label="Capacity" value={`${event.capacity} seats`} />
                <Field label="Seats left" value={full ? 'Full' : String(event.seats_left)} />
              </div>

              {event.collab_orgs.length > 0 && (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="label-xs text-ink-mute">Collaborating houses &amp; societies</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.collab_orgs.map((o) => (
                      <span key={o} className="chip border-brand/30 bg-brand-light text-brand">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-line px-6 py-4">
                <h2 className="text-lg font-extrabold tracking-poster">Venue</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {event.venue}, {event.city} — shown at approximate region level.
                </p>
              </div>
              <div className="p-4">
                <EventMap events={[event]} height={300} />
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-lg font-extrabold tracking-poster">Schedule</h2>
              <ol className="mt-4 space-y-3">
                {[
                  {
                    t: event.start_time,
                    label: 'Doors open · check-in begins',
                  },
                  { t: event.start_time, label: 'Welcome & introductions' },
                  { t: event.end_time, label: 'Wrap-up · check-in closes' },
                ].map((row, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-16 shrink-0 font-mono text-px-sm font-bold text-brand">
                      {row.t}
                    </span>
                    <span className="text-px-base text-ink-soft">{row.label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-px-sm text-ink-mute">
                Organisers may adjust timings on site; registered attendees are notified.
              </p>
            </section>

            {registered && event.my_registration && !checkedIn && (
              <section>
                <AttendeeQr
                  eventId={event.id}
                  token={event.my_registration.token}
                  title={event.title}
                />
              </section>
            )}

            {checkedIn && (
              <section className="card border-pixgreen bg-pixgreen-light/60 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center bg-pixgreen text-ink">
                    <IconCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-px-base font-extrabold tracking-poster text-pixgreen-dark">
                      Attendance recorded
                    </p>
                    <p className="text-px-sm text-pixgreen-dark">
                      {event.points_value} participation points were added to your ledger.
                    </p>
                  </div>
                </div>
                <button className="btn-ghost btn-sm mt-4" onClick={() => setDisputeOpen(true)}>
                  Something wrong? Raise a dispute
                </button>
              </section>
            )}

            {!registered &&
              checkedIn === false &&
              event.my_registration?.status === 'cancelled' && (
                <p className="text-sm font-semibold text-ink-soft">
                  You cancelled your registration for this event.
                </p>
              )}
          </div>

          {/* side column */}
          <aside className="space-y-5">
            <div className="card p-5">
              {event.status !== 'approved' ? (
                <div className="text-center">
                  <Pill className={`${status.cls} mx-auto`}>{status.label}</Pill>
                  <p className="mt-3 text-sm text-ink-soft">
                    {event.status === 'pending'
                      ? 'This event is awaiting admin approval and is not open for registration.'
                      : event.status === 'rejected'
                        ? `Rejected: ${event.rejection_reason ?? 'no reason recorded'}`
                        : event.status === 'cancelled'
                          ? 'This event was cancelled by the organiser.'
                          : 'This event has concluded.'}
                  </p>
                </div>
              ) : !user ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink-soft">
                    Sign in to register and get your check-in pass.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: `/events/${event.id}` }}
                    className="btn-primary mt-4 w-full"
                  >
                    Sign in to register
                  </Link>
                </div>
              ) : registered ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pixgreen-dark">
                    <IconCheck className="h-5 w-5" />
                    <span className="text-sm font-extrabold">You are registered</span>
                  </div>
                  <div className=" bg-ink/[0.04] px-4 py-3 text-px-sm text-ink-soft">
                    {checkedIn ? (
                      <>Checked in — points awarded.</>
                    ) : (
                      <>
                        <strong className="text-cream">{event.seats_left}</strong> seats remain for
                        other students.
                      </>
                    )}
                  </div>
                  {!checkedIn && !past && (
                    <LoadingButton
                      loading={busy}
                      className="btn-ghost w-full"
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancel registration
                    </LoadingButton>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <LoadingButton
                    loading={busy}
                    className="btn-primary w-full py-3"
                    onClick={doRegister}
                    disabled={full || past}
                  >
                    {full ? 'Event full' : past ? 'Event has ended' : 'Register now'}
                  </LoadingButton>
                  <p className="text-center text-px-sm text-ink-mute">
                    {full
                      ? 'All seats are taken — try another event.'
                      : `You will receive a unique single-use check-in token.`}
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3 border-t border-line pt-4">
                <div className="flex items-center justify-between text-px-sm">
                  <span className="text-ink-mute">Attendees</span>
                  <span className="font-bold">
                    {event.attendee_count} / {event.capacity}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-ink/10">
                  <div
                    className={`h-full ${full ? 'bg-flame' : 'bg-brand'}`}
                    style={{
                      width: `${Math.min(100, (event.attendee_count / event.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {isStaff && event.status === 'approved' && (
                <div className="mt-5 space-y-2 border-t border-line pt-4">
                  <p className="label-xs flex items-center gap-1.5 text-flame-dark">
                    <IconShield className="h-3.5 w-3.5" /> Organiser tools
                  </p>
                  <Link to={`/events/${event.id}/checkin`} className="btn-flame w-full">
                    <IconQr className="h-4 w-4" /> Open check-in console
                  </Link>
                  {!past && isHost && (
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost btn-sm flex-1"
                        disabled={busy}
                        onClick={() => toggleStatus('cancelled')}
                      >
                        Cancel event
                      </button>
                      <button
                        className="btn-ghost btn-sm flex-1"
                        disabled={busy}
                        onClick={() => toggleStatus('completed')}
                      >
                        Mark completed
                      </button>
                    </div>
                  )}
                  {user?.role === 'admin' && event.status === 'approved' && (
                    <p className="text-px-sm text-ink-mute">
                      Admin: you can withdraw this listing from the admin dashboard.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* host */}
            <div className="card p-5">
              <p className="label-xs text-ink-mute">Hosted by</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={event.host?.full_name ?? 'Host'} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-px-base font-extrabold tracking-poster">
                    {event.host?.full_name ?? 'Unknown host'}
                  </p>
                  <p className="text-px-sm text-ink-soft">
                    {event.host?.house} · {event.host?.city}
                  </p>
                  <p className="text-px-sm font-bold uppercase tracking-label text-brand">
                    {event.host?.points ?? 0} pts
                  </p>
                </div>
              </div>

              {event.cohost_ids.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="label-xs text-ink-mute">Co-hosts</p>
                  <div className="mt-2 space-y-2">
                    {event.cohost_ids.map((cid) => (
                      <div key={cid} className="flex items-center gap-2">
                        <Avatar name={cid} size="sm" />
                        <span className="truncate text-px-sm font-semibold text-ink-soft">
                          {cid === event.host?.id ? '' : 'Collaborating organiser'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-start gap-2.5">
                <IconSpark className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
                <p className="text-px-sm leading-relaxed text-ink-soft">
                  Attending earns{' '}
                  <strong className="text-flame">{event.points_value} points</strong>, but only
                  after your organiser scans your pass. Self-reported attendance is never counted.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel registration?">
        <p className="text-sm leading-relaxed text-ink-soft">
          Your seat will be released to another student. You can register again while spots last.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setCancelOpen(false)}>
            Keep my spot
          </button>
          <LoadingButton loading={busy} className="btn-danger" onClick={doCancel}>
            Cancel registration
          </LoadingButton>
        </div>
      </Modal>

      {/* dispute modal */}
      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Attendance dispute">
        <label className="field-label" htmlFor="dispute">
          What happened?
        </label>
        <textarea
          id="dispute"
          className="field min-h-[110px]"
          placeholder="I attended but my pass failed to scan at the entrance…"
          value={disputeNote}
          onChange={(e) => setDisputeNote(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setDisputeOpen(false)}>
            Cancel
          </button>
          <LoadingButton
            loading={busy}
            className="btn-primary"
            onClick={submitDispute}
            disabled={disputeNote.trim().length < 10}
          >
            Submit dispute
          </LoadingButton>
        </div>
      </Modal>
    </AppShell>
  )
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="label-xs text-ink-mute">{label}</p>
      <p className={`mt-1 text-px-base font-bold ${accent ? 'text-flame' : 'text-cream'}`}>
        {value}
      </p>
    </div>
  )
}
