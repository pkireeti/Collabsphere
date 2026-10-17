import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteShell } from '../components/Shell'
import { EventCard } from '../components/EventCard'
import { ErrorState, EventCardSkeleton, SectionHead } from '../components/ui'
import {
  IconArrow,
  IconCheck,
  IconPlus,
  IconQr,
  IconSearch,
  IconShield,
  IconUsers,
} from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import type { EventWithMeta } from '../lib/types'

const STEPS = [
  {
    n: '01',
    icon: IconPlus,
    title: 'Propose an event',
    body: 'Any student can propose a meetup, co-working block or study circle with a venue, capacity and collaborating houses.',
  },
  {
    n: '02',
    icon: IconShield,
    title: 'Admin review',
    body: 'An authorised admin approves or rejects with a reason. Nothing reaches the public calendar before review.',
  },
  {
    n: '03',
    icon: IconUsers,
    title: 'Students register',
    body: 'Seats are tracked server-side. Duplicate registrations and overbooking are impossible by construction.',
  },
  {
    n: '04',
    icon: IconQr,
    title: 'Scan, verify, earn',
    body: 'Organisers scan a signed pass. Only after server-side verification are participation points written.',
  },
]

export default function Landing() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .listEvents({ when: 'all' })
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const upcoming = events.filter((e) => e.status === 'approved').slice(0, 6)

  return (
    <SiteShell>
      {/* ---------------------------------------------------- hero band */}
      <section className="sky-band relative overflow-hidden" style={{ background: '#98D6EF' }}>
        <div className="mx-auto max-w-[1400px] px-4 pb-0 pt-10 sm:px-6 sm:pt-14">
          <div className="flex flex-wrap items-center gap-3">
            <span className="border-2 border-ink bg-ink px-3 py-1 font-sans text-[9px] uppercase tracking-label text-sky shadow-[2px_2px_0_0_#FFFFFF]">
              IIT Madras BS · Student community
            </span>
            <span className="font-sans text-[9px] uppercase tracking-label text-ink">
              Cross-house &amp; regional meetup engine
            </span>
          </div>

          <h1 className="display-xl text-on-sky mt-5 max-w-[15ch]">
            Collab<span className="text-sky-deep">Sphere</span>
          </h1>

          <div className="mt-4 flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-xl font-body text-px-base leading-relaxed font-normal text-ink sm:text-px-lg">
              Find the IITM BS students who live around you, organise regional meetups and
              co-working sessions, collaborate across houses and societies — and earn verified
              recognition for showing up.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={user ? '/explore' : '/register'} className="btn-flame">
                {user ? 'Explore events' : 'Create your account'} <IconArrow className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn-ghost">
                How it works
              </a>
            </div>
          </div>

        </div>

        {/* full-bleed pixel city scene (trimmed AI art) */}
        <img
          src={`${import.meta.env.BASE_URL}hero-scene.png`}
          alt="Pixel-art Indian city skyline with a brick MEET HERE venue, a small house, food carts, an auto-rickshaw and students gathering."
          width={1626}
          height={656}
          draggable={false}
          className="block w-full select-none"
        />

        {/* three-column caption strip (reference motif) */}
        <div className="border-t-4 border-ink bg-panel-dark">
          <div className="mx-auto grid max-w-[1400px] grid-cols-3 gap-3 px-4 py-4 text-center sm:px-6">
            {['never too distant', 'always in circle', 'always verified'].map((t) => (
              <span
                key={t}
                className="font-sans text-[9px] uppercase tracking-label text-sky sm:text-px-xs"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- poster intro */}
      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="label-xs text-flame">The problem</p>
            <p className="display-lg mt-3 text-sky">
              meet.
              <br />
              build.
              <br />
              go further.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-6">
            <p className="text-px-base font-semibold leading-relaxed text-cream sm:text-px-lg">
              IIT Madras BS students spread across dozens of cities and timezones. CollabSphere
              turns that dispersion into a network: a shared calendar of regional meetups,
              cross-house collaboration requests, and a participation ledger that only moves when an
              organiser confirms you were actually there.
            </p>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <Stat2 value="6" label="cities seeded" />
              <Stat2 value="100%" label="server-verified points" accent />
              <Stat2 value="0" label="live locations shared" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section id="how" className="border-y border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <SectionHead eyebrow="How CollabSphere works" title="Proposal to podium in four steps" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative overflow-hidden p-6">
                <span className="absolute right-4 top-3 text-px-2xl leading-none tracking-poster text-sky/15">
                  {s.n}
                </span>
                <div className="grid h-10 w-10 place-items-center border-[3px] border-ink bg-sky text-ink shadow-[3px_3px_0_0_#05070F]">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-px-lg tracking-poster text-cream">{s.title}</h3>
                <p className="mt-2 font-body text-px-sm leading-snug text-mist">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- featured events */}
      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
        <SectionHead
          eyebrow="Featured & upcoming"
          title="Meetups happening next"
          action={
            <Link to="/explore" className="btn-ghost btn-sm">
              <IconSearch className="h-4 w-4" /> View all events
            </Link>
          }
        />

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && <ErrorState body={error} onRetry={load} />}

        {!loading && !error && upcoming.length === 0 && (
          <div className="card px-6 py-12 text-center">
            <p className="text-px-lg tracking-poster text-cream">No published events yet</p>
            <p className="mt-2 font-body text-px-sm text-mist">
              Be the first — propose one and an admin will review it.
            </p>
            <Link to="/create" className="btn-primary mt-5">
              <IconPlus className="h-4 w-4" /> Propose an event
            </Link>
          </div>
        )}

        {!loading && !error && upcoming.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- values */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 sm:py-20">
          {[
            {
              icon: IconShield,
              t: 'Permissions that hold',
              b: 'Row Level Security plus Postgres triggers: students cannot self-assign roles, points or approval states.',
            },
            {
              icon: IconCheck,
              t: 'Attendance you can trust',
              b: 'Every point traces back to a check-in token validated in the database, once, with duplicate protection.',
            },
            {
              icon: IconUsers,
              t: 'Privacy by default',
              b: 'The map shows event venues at region granularity. A student’s live location is never collected or shown.',
            },
          ].map((v) => (
            <div key={v.t}>
              <div className="grid h-11 w-11 place-items-center bg-flame-light text-flame">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-px-lg font-extrabold tracking-poster">{v.t}</h3>
              <p className="mt-2 font-body text-px-base leading-snug text-mist">{v.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="sky-band">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="label-xs text-ink">Join the circle</p>
            <h2 className="display-lg text-on-sky mt-2 max-w-[18ch]">
              Your city already has a study group waiting.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={user ? '/dashboard' : '/register'} className="btn-flame">
              {user ? 'Open dashboard' : 'Get started free'} <IconArrow className="h-4 w-4" />
            </Link>
            <Link to="/explore" className="btn-ghost">
              Browse the map
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-body text-px-sm text-mist">
            CollabSphere — Cross-House &amp; Regional Meetup Engine · Built for the IITM BS
            community.
          </p>
          <div className="flex flex-wrap gap-5 font-body text-px-sm text-mist">
            <Link to="/explore" className="hover:text-sky">
              Explore
            </Link>
            <Link to="/leaderboard" className="hover:text-sky">
              Leaderboard
            </Link>
            <Link to="/create" className="hover:text-sky">
              Host an event
            </Link>
          </div>
        </div>
      </footer>
    </SiteShell>
  )
}

function Stat2({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="border-l-[3px] border-line pl-4">
      <div
        className={`text-px-2xl font-black tracking-poster tabular-nums ${
          accent ? 'text-flame' : 'text-sky'
        }`}
      >
        {value}
      </div>
      <div className="label-xs mt-1.5 text-mist-dim">{label}</div>
    </div>
  )
}
