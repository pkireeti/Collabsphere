import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { EventWithMeta } from '../lib/types'
import { Link } from 'react-router-dom'
import { formatShortDate, formatTimeRange } from '../lib/format'

function pinIcon(label: string, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="cs-pin ${active ? 'cs-pin-active' : ''}"><span>${label}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 33],
    popupAnchor: [0, -30],
  })
}

function FitBounds({ events }: { events: EventWithMeta[] }) {
  const map = useMap()
  const key = events.map((e) => e.id).join(',')
  useEffect(() => {
    if (!events.length) return
    const pts = events.map((e) => [e.lat, e.lng] as [number, number])
    if (pts.length === 1) {
      map.setView(pts[0], 11, { animate: true })
    } else {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: true })
    }
  }, [key, events, map])
  return null
}

export function EventMap({
  events,
  selectedId,
  onSelect,
  height = 460,
}: {
  events: EventWithMeta[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  height?: number
}) {
  const center: [number, number] = events.length
    ? [events[0].lat, events[0].lng]
    : [20.5937, 78.9629]

  return (
    <div className="relative shadow-card" style={{ height }}>
      <MapContainer
        center={center}
        zoom={events.length === 1 ? 11 : 4}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds events={events} />
        {events.map((e, i) => (
          <Marker
            key={e.id}
            position={[e.lat, e.lng]}
            icon={pinIcon(String(i + 1), selectedId === e.id)}
            eventHandlers={{ click: () => onSelect?.(e.id) }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <p
                  style={{
                    fontSize: 9,
                    fontFamily: '"Press Start 2P", monospace',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#3EC8F2',
                    margin: '0 0 6px',
                    lineHeight: 1.6,
                  }}
                >
                  {formatShortDate(e.date)} · {e.city}
                </p>
                <Link
                  to={`/events/${e.id}`}
                  style={{
                    fontSize: 11,
                    fontFamily: '"Press Start 2P", monospace',
                    color: '#F4F1E4',
                    textDecoration: 'none',
                    lineHeight: 1.7,
                    display: 'block',
                  }}
                >
                  {e.title}
                </Link>
                <p
                  style={{
                    fontSize: 17,
                    color: '#A9B6D9',
                    margin: '6px 0 2px',
                    lineHeight: 1.2,
                  }}
                >
                  {formatTimeRange(e.start_time, e.end_time)}
                </p>
                <p
                  style={{
                    fontSize: 17,
                    color: '#A9B6D9',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {e.venue} · {e.attendee_count}/{e.capacity} going
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] border-[3px] border-ink bg-panel px-3 py-2 shadow-card">
        <p className="label-xs text-mist-dim">Approximate region only</p>
        <p className="mt-1 font-body text-px-sm leading-snug text-mist">
          Markers show event venues — never a student&apos;s live location.
        </p>
      </div>
    </div>
  )
}
