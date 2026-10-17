import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingButton,
  Modal,
  Pill,
  Skeleton,
} from '../components/ui'
import { IconAlert, IconCheck, IconShield, IconUsers, IconX } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatShortDate, formatTimeRange } from '../lib/format'
import { useToast } from '../lib/toast'
import {
  statusMeta,
  typeMeta,
  type AttendanceDispute,
  type CollabRequest,
  type EventWithMeta,
} from '../lib/types'

type Tab = 'proposals' | 'collabs' | 'disputes' | 'events'

export default function Admin() {
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('proposals')
  const [proposals, setProposals] = useState<EventWithMeta[]>([])
  const [collabs, setCollabs] = useState<CollabRequest[]>([])
  const [disputes, setDisputes] = useState<AttendanceDispute[]>([])
  const [events, setEvents] = useState<EventWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<EventWithMeta | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [p, c, d, e] = await Promise.all([
        api.listProposals(user.id),
        api.listCollabRequests(user.id),
        api.listDisputes(user.id),
        api.listEvents(undefined, user.id),
      ])
      setProposals(p)
      setCollabs(c.filter((x) => x.status === 'pending'))
      setDisputes(d.filter((x) => x.status === 'open'))
      setEvents(e.sort((a, b) => b.created_at.localeCompare(a.created_at)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  if (!user) return null

  const approve = async (ev: EventWithMeta) => {
    setBusy(true)
    try {
      await api.approveEvent(ev.id, user.id)
      toast.success('Event published', `“${ev.title}” is now live on Explore.`)
      await load()
    } catch (e) {
      toast.error('Approval failed', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    if (!rejectTarget) return
    setBusy(true)
    try {
      await api.rejectEvent(rejectTarget.id, user.id, rejectReason)
      toast.info('Proposal rejected', 'The organiser will see your reason.')
      setRejectTarget(null)
      setRejectReason('')
      await load()
    } catch (e) {
      toast.error('Rejection failed', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    setBusy(true)
    try {
      await api.respondCollab(id, user.id, status)
      toast.success(status === 'accepted' ? 'Co-host request accepted' : 'Request declined')
      await load()
    } catch (e) {
      toast.error('Could not update', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const resolve = async (id: string, resolution: string) => {
    setBusy(true)
    try {
      await api.resolveDispute(id, user.id, resolution)
      toast.success(
        'Dispute resolved',
        resolution === 'grant' ? 'Points granted.' : 'No points granted.',
      )
      await load()
    } catch (e) {
      toast.error('Could not resolve', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (ev: EventWithMeta, status: EventWithMeta['status']) => {
    setBusy(true)
    try {
      await api.setEventStatus(ev.id, user.id, status)
      toast.success(`Marked ${status}`)
      await load()
    } catch (e) {
      toast.error('Could not update', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'proposals', label: 'Proposals', count: proposals.length },
    { key: 'collabs', label: 'Co-host requests', count: collabs.length },
    { key: 'disputes', label: 'Attendance disputes', count: disputes.length },
    { key: 'events', label: 'All events', count: events.length },
  ]

  return (
    <AppShell>
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="border-2 border-ink bg-ink px-3 py-1 font-sans text-[9px] uppercase tracking-label text-flame-dark shadow-[2px_2px_0_0_#FFFFFF]">
              Administrator
            </span>
            <span className="font-sans text-[9px] uppercase tracking-label text-ink">
              {user.full_name} · {user.house}
            </span>
          </div>
          <h1 className="display-lg text-on-sky mt-3">Admin dashboard</h1>
          <p className="mt-2 max-w-2xl font-body text-px-base text-ink">
            Review proposals, manage co-hosting and settle attendance disputes. Approval rights are
            enforced by the database, not the client.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2 border-b border-line pb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-2 px-4 py-2 text-px-sm transition-colors ${
                tab === t.key
                  ? 'border-ink bg-sky text-ink shadow-press'
                  : 'border-line bg-panel text-mist hover:border-sky hover:text-cream'
              }`}
            >
              {t.label}
              <span
                className={`px-1.5 py-0.5 text-px-xs ${
                  tab === t.key ? 'bg-ink text-sky' : 'bg-ink/40 text-mist-dim'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-5">
            <ErrorState body={error} onRetry={load} />
          </div>
        )}

        {loading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            {/* ------------------------------------------------ proposals */}
            {tab === 'proposals' &&
              (proposals.length === 0 ? (
                <EmptyState
                  icon={<IconShield className="h-6 w-6" />}
                  title="No pending proposals"
                  body="Every proposal submitted by students has been reviewed. New ones will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {proposals.map((ev) => (
                    <div key={ev.id} className="card overflow-hidden">
                      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill className={typeMeta(ev.type).tint}>
                              {typeMeta(ev.type).label}
                            </Pill>
                            <Pill className="bg-pixamber-light text-pixamber-dark">
                              Pending review
                            </Pill>
                            <span className="text-px-xs font-bold text-ink-mute">
                              submitted {formatShortDate(ev.created_at.slice(0, 10))}
                            </span>
                          </div>
                          <h3 className="mt-2 text-px-lg font-extrabold tracking-poster">
                            {ev.title}
                          </h3>
                          <p className="mt-2 line-clamp-3 text-px-sm leading-relaxed text-ink-soft">
                            {ev.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-px-sm text-ink-soft">
                            <span>
                              {formatShortDate(ev.date)} ·{' '}
                              {formatTimeRange(ev.start_time, ev.end_time)}
                            </span>
                            <span>
                              {ev.venue}, {ev.city}
                            </span>
                            <span>Capacity {ev.capacity}</span>
                            <span className="font-bold text-flame">{ev.points_value} pts</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="chip">{ev.house}</span>
                            {ev.society && <span className="chip">{ev.society}</span>}
                            {ev.collab_orgs.map((o) => (
                              <span
                                key={o}
                                className="chip border-brand/30 bg-brand-light text-brand"
                              >
                                collab: {o}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-4 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                          <div className="flex items-center gap-3">
                            <Avatar name={ev.host?.full_name ?? '?'} />
                            <div>
                              <p className="text-px-base font-extrabold">{ev.host?.full_name}</p>
                              <p className="text-px-sm text-ink-soft">
                                {ev.host?.role} · {ev.host?.points ?? 0} pts
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <LoadingButton
                              loading={busy}
                              className="btn-primary w-full"
                              onClick={() => approve(ev)}
                            >
                              <IconCheck className="h-4 w-4" /> Approve &amp; publish
                            </LoadingButton>
                            <button
                              className="btn-danger w-full"
                              onClick={() => {
                                setRejectTarget(ev)
                                setRejectReason('')
                              }}
                            >
                              <IconX className="h-4 w-4" /> Reject
                            </button>
                            <Link to={`/events/${ev.id}`} className="btn-ghost w-full">
                              Preview
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {/* -------------------------------------------------- collabs */}
            {tab === 'collabs' &&
              (collabs.length === 0 ? (
                <EmptyState
                  icon={<IconUsers className="h-6 w-6" />}
                  title="No co-host requests waiting"
                  body="Cross-house collaboration requests from organisers will show up here for your organisations."
                />
              ) : (
                <div className="space-y-3">
                  {collabs.map((c) => (
                    <div key={c.id} className="card flex flex-wrap items-center gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-px-base font-extrabold tracking-poster">
                          {c.target_org}
                        </p>
                        <p className="mt-1 text-px-sm text-ink-soft">{c.message}</p>
                        <p className="mt-1 text-px-sm text-ink-mute">
                          Event:{' '}
                          <Link
                            to={`/events/${c.event_id}`}
                            className="font-bold text-brand hover:underline"
                          >
                            {events.find((e) => e.id === c.event_id)?.title ?? 'view event'}
                          </Link>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <LoadingButton
                          loading={busy}
                          className="btn-primary btn-sm"
                          onClick={() => respond(c.id, 'accepted')}
                        >
                          Accept
                        </LoadingButton>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => respond(c.id, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {/* ------------------------------------------------ disputes */}
            {tab === 'disputes' &&
              (disputes.length === 0 ? (
                <EmptyState
                  icon={<IconAlert className="h-6 w-6" />}
                  title="No open disputes"
                  body="When an attendee reports a failed scan, the case lands here for review."
                />
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => {
                    const ev = events.find((e) => e.id === d.event_id)
                    return (
                      <div key={d.id} className="card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="label-xs text-flame">Open dispute</p>
                            <p className="mt-1.5 text-px-base font-bold">
                              {ev?.title ?? 'Unknown event'}
                            </p>
                            <p className="mt-2 bg-ink/[0.04] px-3.5 py-2.5 text-px-sm text-ink-soft">
                              “{d.note}”
                            </p>
                            <p className="mt-1.5 text-px-sm text-ink-mute">
                              Raised {formatShortDate(d.created_at.slice(0, 10))}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <LoadingButton
                              loading={busy}
                              className="btn-primary btn-sm"
                              onClick={() => resolve(d.id, 'grant')}
                            >
                              Grant {ev?.points_value ?? ''} points
                            </LoadingButton>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => resolve(d.id, 'deny')}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

            {/* --------------------------------------------------- events */}
            {tab === 'events' &&
              (events.length === 0 ? (
                <EmptyState
                  title="No events yet"
                  body="Approved, rejected and completed events will be listed here."
                />
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div key={ev.id} className="card flex flex-wrap items-center gap-4 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className={statusMeta(ev.status).cls}>
                            {statusMeta(ev.status).label}
                          </Pill>
                          <span className="text-px-xs font-bold text-ink-mute">
                            {formatShortDate(ev.date)} · {ev.city}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-px-base font-extrabold tracking-poster">
                          {ev.title}
                        </p>
                        <p className="text-px-sm text-ink-soft">
                          {ev.attendee_count}/{ev.capacity} registered · host {ev.host?.full_name}
                        </p>
                        {ev.status === 'rejected' && ev.rejection_reason && (
                          <p className="mt-1 text-px-sm text-pixred-dark">
                            Reason: {ev.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/events/${ev.id}`} className="btn-ghost btn-sm">
                          Open
                        </Link>
                        {ev.status === 'approved' && (
                          <>
                            <button
                              className="btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() => setStatus(ev, 'completed')}
                            >
                              Mark completed
                            </button>
                            <button
                              className="btn-danger btn-sm"
                              disabled={busy}
                              onClick={() => setStatus(ev, 'cancelled')}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {ev.status === 'rejected' && (
                          <button
                            className="btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => setStatus(ev, 'approved')}
                          >
                            Re-publish
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* reject modal */}
      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject proposal"
      >
        <p className="text-sm text-ink-soft">
          The organiser sees this reason verbatim, so make it actionable.
        </p>
        <label className="field-label mt-4" htmlFor="reason">
          Reason for rejection
        </label>
        <textarea
          id="reason"
          className="field min-h-[110px]"
          placeholder="Venue capacity is below the minimum for a cross-house session…"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setRejectTarget(null)}>
            Keep reviewing
          </button>
          <LoadingButton
            loading={busy}
            className="btn-danger"
            disabled={rejectReason.trim().length < 10}
            onClick={reject}
          >
            Reject proposal
          </LoadingButton>
        </div>
      </Modal>
    </AppShell>
  )
}
