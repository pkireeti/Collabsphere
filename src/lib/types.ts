export type Role = 'student' | 'organizer' | 'admin'

export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'

export type EventType = 'meetup' | 'coworking' | 'study-group' | 'workshop' | 'social' | 'hackathon'

export type RegistrationStatus = 'registered' | 'cancelled'

export type CollabStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  full_name: string
  email: string
  house: string
  society?: string
  city: string
  role: Role
  points: number
  bio?: string
  cohort?: string
  created_at: string
}

export interface CampusEvent {
  id: string
  title: string
  description: string
  type: EventType
  status: EventStatus
  /** YYYY-MM-DD */
  date: string
  start_time: string
  end_time: string
  venue: string
  city: string
  /** approximate region centroid — never a student's live location */
  lat: number
  lng: number
  capacity: number
  host_id: string
  house: string
  society?: string
  collab_orgs: string[]
  cohost_ids: string[]
  points_value: number
  rejection_reason?: string
  created_at: string
}

export interface Registration {
  id: string
  event_id: string
  user_id: string
  status: RegistrationStatus
  /** secret attendee token encoded in the QR payload */
  token: string
  checked_in_at?: string | null
  checkin_by?: string | null
  created_at: string
}

export interface CollabRequest {
  id: string
  event_id: string
  requested_by: string
  target_org: string
  message: string
  status: CollabStatus
  created_at: string
}

export interface PointsEntry {
  id: string
  user_id: string
  event_id: string
  points: number
  reason: string
  created_at: string
}

export interface AttendanceDispute {
  id: string
  event_id: string
  user_id: string
  note: string
  status: 'open' | 'resolved'
  resolution?: string
  created_at: string
}

export interface EventWithMeta extends CampusEvent {
  host?: Profile
  attendee_count: number
  seats_left: number
  my_registration?: Registration | null
}

export type EventFilters = {
  q: string
  city: string
  type: string
  org: string
  when: 'all' | 'week' | 'month'
}

export const EVENT_TYPES: { value: EventType; label: string; tint: string }[] = [
  {
    value: 'meetup',
    label: 'Regional Meetup',
    tint: 'bg-brand-light text-sky',
  },
  {
    value: 'coworking',
    label: 'Co-working',
    tint: 'bg-pixgreen-light text-pixgreen-dark',
  },
  {
    value: 'study-group',
    label: 'Study Group',
    tint: 'bg-[#1E1B3E] text-[#C4B9FF]',
  },
  {
    value: 'workshop',
    label: 'Workshop',
    tint: 'bg-flame-light text-flame-dark',
  },
  {
    value: 'social',
    label: 'Social',
    tint: 'bg-pixamber-light text-pixamber-dark',
  },
  {
    value: 'hackathon',
    label: 'Hackathon',
    tint: 'bg-pixred-light text-pixred-dark',
  },
]

export const HOUSES = ['Ganga', 'Yamuna', 'Godavari', 'Krishna', 'Kaveri', 'Narmada'] as const

export const SOCIETIES = [
  'DevSoc',
  'Aavesam',
  'Nexus Design',
  'E-Cell IITM',
  'Robotics Club',
] as const

export const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
]

export function typeMeta(t: EventType) {
  return EVENT_TYPES.find((x) => x.value === t) ?? EVENT_TYPES[0]
}

export function statusMeta(s: EventStatus) {
  switch (s) {
    case 'pending':
      return {
        label: 'Awaiting approval',
        cls: 'bg-pixamber-light text-pixamber-dark',
      }
    case 'approved':
      return {
        label: 'Published',
        cls: 'bg-pixgreen-light text-pixgreen-dark',
      }
    case 'rejected':
      return { label: 'Rejected', cls: 'bg-pixred-light text-pixred-dark' }
    case 'cancelled':
      return { label: 'Cancelled', cls: 'bg-panel-dark text-mist-dim' }
    case 'completed':
      return { label: 'Completed', cls: 'bg-[#16324A] text-sky' }
  }
}

export interface CheckinResult {
  ok: boolean
  message: string
  already?: boolean
  attendee?: {
    id?: string
    full_name: string
    house: string
    city: string
    email?: string
  }
}

export interface ManifestRow {
  registration: Registration
  attendee?: Profile
}
