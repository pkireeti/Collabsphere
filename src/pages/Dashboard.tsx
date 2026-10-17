import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { EventCard } from '../components/EventCard'
import { EmptyState, ErrorState, EventCardSkeleton, SectionHead, Stat } from '../components/ui'
import {
  IconArrow,
  IconCalendar,
  IconPlus,
  IconQr,
  IconSearch,
  IconShield,
  IconSpark,
} from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import { BADGES } from '../lib/format'
import type { EventWithMeta } from '../lib/types'

export default function Dashboard() {
  const { user } = useAuth()
  const [mine, setMine] = useState<EventWithMeta[]>([])
  const [recommended, setRecommended] = useState<EventWithMeta[]>([])
  const [attended, setAttended] = useState<EventWithMeta[]>([])
  const [hosts, setHosts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [m, all, a] = await Promise.all([
        api.listMyRegistrations(user.id),
        api.listEvents({ city: user.city }, user.id),
        api.attendanceHistory(user.id),
      ])
      setMine(m)
      setRecommended(
        all.filter(
          (e) => e.status === 'approved' && !m.some((x) => x.id === e.id) && e.host_id !== user.id,
        ),
      )
      setAttended(a)
      setHosts(a.filter((e) => e.host_id === user.id).length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user) return null

  const stats = {
    points: user.points,
    attended: attended.length,
    hosted: hosts,
  }
  const badges = BADGES.map((b) => ({ ...b, earned: b.test(stats) }))

  const upcoming = mine.filter((e) => e.status !== 'completed')

  return (
    <AppShell>
      {/* welcome */}
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label-xs text-ink">
                {user.cohort ?? 'IITM BS'} · {user.house} house · {user.city}
              </p>
              <h1 className="display-lg text-on-sky mt-2">Hey, {user.full_name.split(' ')[0]}.</h1>
              <p className="mt-2 max-w-xl font-body text-px-base text-ink">
                {upcoming.length > 0
                  ? `You have ${upcoming.length} upcoming registration${upcoming.length === 1 ? '' : 's'}.`
                  : 'Your calendar is clear — find a meetup near you or propose one.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/create" className="btn-flame">
                <IconPlus className="h-4 w-4" /> Create event
              </Link>
              <Link to="/explore" className="btn-ghost">
                <IconSearch className="h-4 w-4" /> Discover
              </Link>
            </div>
          </div>

          {/* dark HUD stat strip */}
          <div className="mt-8 border-4 border-ink bg-ink px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { v: stats.points, l: 'participation points' },
                { v: stats.attended, l: 'events attended' },
                { v: upcoming.length, l: 'upcoming registrations' },
                { v: badges.filter((b) => b.earned).length, l: 'badges earned' },
              ].map((s, i) => (
                <div key={s.l} className="border-l-[3px] border-sky/40 pl-4">
                  <div className="text-px-xl tracking-poster tabular-nums text-sky text-chunky">
                    {s.v}
                  </div>
                  <div className="label-xs mt-1.5 text-mist">{s.l}</div>
                  {i === 0 && (
                    <div className="mt-1 font-sans text-[9px] uppercase tracking-label text-pixgreen">
                      server-verified
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {error && <ErrorState body={error} onRetry={load} />}

        {/* quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/create"
            icon={IconPlus}
            title="Propose an event"
            body="Pitch a meetup for your city."
          />
          <QuickAction
            to="/explore"
            icon={IconSearch}
            title="Discover nearby"
            body="Filter by city, format, house."
          />
          <QuickAction
            to="/checkin"
            icon={IconQr}
            title="QR check-in"
            body="Organiser console & passes."
          />
          <QuickAction
            to={user.role === 'admin' ? '/admin' : '/leaderboard'}
            icon={user.role === 'admin' ? IconShield : IconSpark}
            title={user.role === 'admin' ? 'Review proposals' : 'See the leaderboard'}
            body={
              user.role === 'admin'
                ? 'Approve, reject, resolve disputes.'
                : 'Your house ranking & badges.'
            }
          />
        </div>

        {/* upcoming registrations */}
        <section className="mt-10">
          <SectionHead
            eyebrow="Your calendar"
            title="Upcoming registrations"
            action={
              <Link to="/profile" className="btn-quiet btn-sm">
                Full history <IconArrow className="h-4 w-4" />
              </Link>
            }
          />
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<IconCalendar className="h-6 w-6" />}
              title="Nothing booked yet"
              body="You are not registered for any upcoming event. Explore what is happening in your city."
              action={
                <Link to="/explore" className="btn-primary">
                  Explore events
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        {/* recommended */}
        <section className="mt-10">
          <SectionHead
            eyebrow={`Recommended for ${user.city}`}
            title="Meetups near you"
            action={
              <Link to="/explore" className="btn-ghost btn-sm">
                See all
              </Link>
            }
          />
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <EmptyState
              title="No new recommendations"
              body="Either everything nearby is already on your calendar, or nothing new has been published for your city."
              action={
                <Link to="/explore" className="btn-ghost">
                  Widen the search
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.slice(0, 6).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        {/* points & badges */}
        <section className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="card overflow-hidden">
            <div className="border-b-[3px] border-line bg-panel-light px-6 py-4">
              <p className="label-xs text-sky">Recognition</p>
              <h2 className="mt-2 text-px-lg tracking-poster text-cream">Points &amp; badges</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 px-6 py-5">
              <Stat value={stats.points} label="points" accent />
              <Stat value={stats.attended} label="attended" />
              <Stat value={stats.hosted} label="hosted" />
            </div>
            <div className="border-t-[3px] border-line px-6 py-4">
              <Link to="/leaderboard" className="btn-ghost btn-sm w-full">
                View house rankings
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-px-lg tracking-poster text-cream">Achievements</h2>
              <span className="font-body text-px-sm text-mist-dim">
                {badges.filter((b) => b.earned).length}/{badges.length} earned
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {badges.map((b) => (
                <div
                  key={b.key}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    b.earned
                      ? 'border-[3px] border-sky bg-brand-light'
                      : 'border-[3px] border-line bg-panel-dark opacity-70'
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center text-sm ${
                      b.earned
                        ? 'border-2 border-ink bg-sky text-ink'
                        : 'border-2 border-line bg-panel-dark text-mist-dim'
                    }`}
                  >
                    {b.earned ? '★' : '·'}
                  </span>
                  <div>
                    <p className="text-px-sm tracking-poster text-cream">{b.name}</p>
                    <p className="font-body text-px-sm leading-snug text-mist">{b.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function QuickAction({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string
  icon: (p: { className?: string }) => JSX.Element
  title: string
  body: string
}) {
  return (
    <Link to={to} className="card card-hover group flex items-start gap-3 p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-ink bg-sky text-ink shadow-[3px_3px_0_0_#05070F]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span>
        <span className="block text-px-sm tracking-poster text-cream group-hover:text-sky">
          {title}
        </span>
        <span className="mt-1 block font-body text-px-sm text-mist">{body}</span>
      </span>
    </Link>
  )
}
