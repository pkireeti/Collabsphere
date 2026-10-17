import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { EventCard } from '../components/EventCard'
import { EventMap } from '../components/EventMap'
import { EmptyState, ErrorState, EventCardSkeleton } from '../components/ui'
import { IconPlus, IconSearch } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  CITIES,
  EVENT_TYPES,
  HOUSES,
  SOCIETIES,
  type EventFilters,
  type EventWithMeta,
} from '../lib/types'

const EMPTY: EventFilters = { q: '', city: '', type: '', org: '', when: 'all' }

const WHENS: { value: EventFilters['when']; label: string }[] = [
  { value: 'all', label: 'Any date' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
]

export default function Explore() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<EventFilters>(EMPTY)
  const [events, setEvents] = useState<EventWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'split' | 'map'>('split')

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .listEvents(filters, user?.id)
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = window.setTimeout(load, 220)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, user?.id])

  const set = <K extends keyof EventFilters>(k: K, v: EventFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }))

  const orgs = useMemo(() => [...HOUSES, ...SOCIETIES], [])

  const mapped = useMemo(() => events.filter((e) => e.status === 'approved'), [events])

  return (
    <AppShell>
      {/* header band */}
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <p className="label-xs text-ink">Discover</p>
          <h1 className="display-lg text-on-sky mt-1.5">Explore events</h1>
          <p className="mt-2 max-w-2xl font-body text-px-base text-ink">
            Search by city, date, format or house. Map markers show the event venue at region
            granularity — student locations are never shared.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* ---------------------------------------------------- filters */}
        <div className="card p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
              <input
                className="field pl-9"
                placeholder="Search title, venue or description…"
                value={filters.q}
                onChange={(e) => set('q', e.target.value)}
                aria-label="Search events"
              />
            </div>
            <select
              className="field"
              value={filters.city}
              onChange={(e) => set('city', e.target.value)}
              aria-label="Filter by city"
            >
              <option value="">All cities</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={filters.type}
              onChange={(e) => set('type', e.target.value)}
              aria-label="Filter by event type"
            >
              <option value="">All formats</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={filters.org}
              onChange={(e) => set('org', e.target.value)}
              aria-label="Filter by house or society"
            >
              <option value="">All houses &amp; societies</option>
              {orgs.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {WHENS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => set('when', w.value)}
                  className={`chip ${filters.when === w.value ? 'chip-active' : ''}`}
                >
                  {w.label}
                </button>
              ))}
              <button
                className="chip"
                onClick={() => setFilters(EMPTY)}
                disabled={
                  filters.q === '' &&
                  filters.city === '' &&
                  filters.type === '' &&
                  filters.org === '' &&
                  filters.when === 'all'
                }
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-px-sm font-bold text-ink-mute">
                {loading ? 'Searching…' : `${events.length} event${events.length === 1 ? '' : 's'}`}
              </span>
              <div className="flex overflow-hidden border-2 border-line">
                {(['split', 'map'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`border-2 border-line px-3 py-1.5 text-px-sm capitalize ${
                      view === v
                        ? 'border-ink bg-sky text-ink'
                        : 'bg-panel text-mist hover:text-cream'
                    }`}
                  >
                    {v === 'split' ? 'List + map' : 'Map only'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- body */}
        {error && (
          <div className="mt-5">
            <ErrorState body={error} onRetry={load} />
          </div>
        )}

        <div
          className={`mt-5 grid gap-5 ${view === 'split' ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : ''}`}
        >
          <div className={view === 'map' ? 'hidden' : ''}>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? null : mapped.length === 0 ? (
              <EmptyState
                title="No events match those filters"
                body="Try widening the date range or clearing the city filter. New proposals are reviewed daily."
                action={
                  <button className="btn-ghost" onClick={() => setFilters(EMPTY)}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {mapped.map((e) => (
                  <div key={e.id} onMouseEnter={() => setSelected(e.id)} className="relative">
                    <EventCard event={e} />
                    <span className="pointer-events-none absolute -left-2 top-3 z-10 hidden h-6 w-6 place-items-center bg-sky text-px-xs font-black text-ink shadow-card lg:grid">
                      {mapped.findIndex((x) => x.id === e.id) + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={view === 'map' ? '' : 'lg:sticky lg:top-20 lg:self-start'}>
            {loading ? (
              <div className="skeleton h-[460px] w-full " />
            ) : mapped.length > 0 ? (
              <EventMap
                events={mapped}
                selectedId={selected}
                onSelect={setSelected}
                height={view === 'map' ? 620 : 460}
              />
            ) : null}
            {view === 'map' && !loading && mapped.length === 0 && (
              <div className="card mt-4 px-5 py-8 text-center text-sm text-ink-soft">
                Nothing to plot with the current filters.
              </div>
            )}
          </div>
        </div>

        {!loading && !error && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-brand/20 bg-brand-light/60 px-5 py-4">
            <p className="text-sm font-semibold text-cream">
              Cannot find your city? Propose an event and an admin will review it.
            </p>
            <Link to="/create" className="btn-primary btn-sm">
              <IconPlus className="h-4 w-4" /> Create event
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}
