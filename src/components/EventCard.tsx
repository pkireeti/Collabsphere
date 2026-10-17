import { Link } from 'react-router-dom'
import { dayBlock, formatTimeRange, relativeDay } from '../lib/format'
import { typeMeta, type EventWithMeta } from '../lib/types'
import { IconPin, IconUsers } from './icons'

function CapacityBar({ pct, full }: { pct: number; full: boolean }) {
  return (
    <div className="h-3 w-full border-2 border-ink bg-panel-dark">
      <div
        className={`h-full transition-all ${full ? 'bg-flame' : 'bg-sky'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function EventCard({
  event,
  layout = 'grid',
}: {
  event: EventWithMeta
  layout?: 'grid' | 'row'
}) {
  const d = dayBlock(event.date)
  const meta = typeMeta(event.type)
  const pct = Math.min(100, Math.round((event.attendee_count / Math.max(1, event.capacity)) * 100))
  const full = event.seats_left === 0

  if (layout === 'row') {
    return (
      <Link
        to={`/events/${event.id}`}
        className="card card-hover group flex items-stretch gap-0 overflow-hidden"
      >
        <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r-[3px] border-ink bg-brand-light py-4">
          <span className="font-sans text-[9px] uppercase tracking-label text-sky">{d.month}</span>
          <span className="font-sans text-2xl leading-none tracking-poster text-sky text-chunky">
            {d.day}
          </span>
          <span className="font-body text-px-sm leading-none text-mist-dim">{d.weekday}</span>
        </div>
        <div className="min-w-0 flex-1 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${meta.tint}`}>{meta.label}</span>
            <span className="font-body text-px-sm text-mist-dim">{relativeDay(event.date)}</span>
          </div>
          <h3 className="mt-2 truncate text-[13px] leading-relaxed tracking-poster text-cream group-hover:text-sky">
            {event.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-px-sm text-mist">
            <span>{formatTimeRange(event.start_time, event.end_time)}</span>
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </div>
        </div>
        <div className="hidden w-48 shrink-0 flex-col justify-center gap-2 border-l-[3px] border-line bg-panel-dark px-4 py-4 sm:flex">
          <span className="flex items-center gap-2 font-body text-px-sm text-mist">
            <IconUsers className="h-4 w-4 text-sky" />
            {event.attendee_count}/{event.capacity}
          </span>
          <CapacityBar pct={pct} full={full} />
          <span
            className={`font-sans text-[9px] uppercase tracking-label ${
              full ? 'text-flame' : 'text-mist-dim'
            }`}
          >
            {full ? 'Full' : `${event.seats_left} seats left`}
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      <div className="flex items-stretch gap-4 border-b-[3px] border-ink bg-panel-light px-5 pb-4 pt-5 grid-dither">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center border-[3px] border-ink bg-sky text-ink shadow-[3px_3px_0_0_#05070F]">
          <span className="font-sans text-[8px] uppercase tracking-label">{d.month}</span>
          <span className="font-sans text-xl leading-none tracking-poster">{d.day}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${meta.tint}`}>{meta.label}</span>
            <span className="font-sans text-[9px] uppercase tracking-label text-mist-dim">
              {relativeDay(event.date)}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[13px] leading-relaxed tracking-poster text-cream group-hover:text-sky">
            {event.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="space-y-2 font-body text-px-sm text-mist">
          <p className="text-cream">{formatTimeRange(event.start_time, event.end_time)}</p>
          <p className="flex items-start gap-2">
            <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-sky" />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <IconUsers className="h-4 w-4 shrink-0 text-sky" />
            <span className="truncate">
              Hosted by {event.host?.full_name ?? 'a student'} · {event.house}
              {event.society ? ` · ${event.society}` : ''}
            </span>
          </p>
        </div>

        <div className="mt-auto space-y-2 pt-1">
          <div className="flex items-center justify-between font-sans text-[9px] uppercase tracking-label">
            <span className="text-mist-dim">
              {event.attendee_count}/{event.capacity} attending
            </span>
            <span className={full ? 'text-flame' : 'text-sky'}>
              {full ? 'Full' : `${event.seats_left} left`}
            </span>
          </div>
          <CapacityBar pct={pct} full={full} />
        </div>
      </div>
    </Link>
  )
}
