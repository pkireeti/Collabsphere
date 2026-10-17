import { load, token, uid, write } from './store'
import type {
  AttendanceDispute,
  CampusEvent,
  CheckinResult,
  CollabRequest,
  EventFilters,
  EventWithMeta,
  ManifestRow,
  PointsEntry,
  Profile,
  Registration,
} from '../types'

export class ApiError extends Error {
  code: string
  constructor(message: string, code = 'error') {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))

function requireUser(userId: string | undefined): Profile {
  const db = load()
  const u = db.profiles.find((p) => p.id === userId)
  if (!u) throw new ApiError('You are not signed in.', 'unauthenticated')
  return u
}

function requireEvent(id: string): CampusEvent {
  const db = load()
  const e = db.events.find((x) => x.id === id)
  if (!e) throw new ApiError('Event not found.', 'not_found')
  return e
}

function enrich(e: CampusEvent, userId?: string): EventWithMeta {
  const db = load()
  const all = db.registrations.filter((r) => r.event_id === e.id)
  const regs = all.filter((r) => r.status === 'registered')
  const me = userId ? (all.find((r) => r.user_id === userId) ?? null) : null
  return {
    ...e,
    host: db.profiles.find((p) => p.id === e.host_id),
    attendee_count: regs.length,
    seats_left: Math.max(0, e.capacity - regs.length),
    my_registration: me,
  }
}

/* ------------------------------------------------------------------ auth */

export async function signIn(email: string, password: string) {
  await delay()
  const db = load()
  const key = email.trim().toLowerCase()
  const expected = db.credentials[key]
  if (!expected) throw new ApiError('No demo account with that email.', 'no_user')
  if (expected !== password) throw new ApiError('Incorrect password.', 'bad_password')
  const profile = db.profiles.find((p) => p.email.toLowerCase() === key)
  if (!profile) throw new ApiError('Account not found.', 'no_user')
  write((d) => {
    d.session = profile.id
  })
  return profile
}

export async function signUp(input: {
  full_name: string
  email: string
  password: string
  house: string
  city: string
  role: Profile['role']
}) {
  await delay()
  const email = input.email.trim().toLowerCase()
  if (input.password.length < 8)
    throw new ApiError('Password must be at least 8 characters.', 'weak_password')
  const db = load()
  if (db.credentials[email])
    throw new ApiError('An account with that email already exists.', 'exists')
  const profile: Profile = {
    id: uid(),
    full_name: input.full_name.trim(),
    email,
    house: input.house,
    city: input.city,
    role: input.role === 'student' ? 'student' : input.role,
    points: 0,
    cohort: 'BS Programme · 2026',
    created_at: new Date().toISOString(),
  }
  write((d) => {
    d.profiles.push(profile)
    d.credentials[email] = input.password
    d.session = profile.id
  })
  return profile
}

export async function signOut() {
  await delay(80)
  write((d) => {
    d.session = null
  })
}

export async function currentSession(): Promise<Profile | null> {
  const db = load()
  if (!db.session) return null
  return db.profiles.find((p) => p.id === db.session) ?? null
}

/** Demo mode is single-tab localStorage; there is nothing to subscribe to. */
export function subscribeAuth(_cb: (event: 'signed_in' | 'signed_out') => void): () => void {
  return () => {}
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'house' | 'city' | 'bio' | 'society'>>,
): Promise<Profile> {
  await delay()
  requireUser(userId)
  return write((d) => {
    const p = d.profiles.find((x) => x.id === userId)!
    Object.assign(p, patch)
    return { ...p }
  })
}

/* ---------------------------------------------------------------- events */

export async function listEvents(
  filters?: Partial<EventFilters>,
  userId?: string,
): Promise<EventWithMeta[]> {
  await delay(180)
  const db = load()
  const f = {
    q: '',
    city: '',
    type: '',
    org: '',
    when: 'all' as const,
    ...filters,
  }
  const now = Date.now()
  const inAWeek = now + 7 * 864e5
  const inAMonth = now + 30 * 864e5

  return db.events
    .filter((e) => e.status === 'approved' || e.host_id === userId)
    .filter((e) => {
      if (f.city && e.city !== f.city) return false
      if (f.type && e.type !== f.type) return false
      if (f.org && !(e.house === f.org || e.society === f.org || e.collab_orgs.includes(f.org)))
        return false
      if (f.when !== 'all') {
        const t = new Date(`${e.date}T${e.start_time}`).getTime()
        if (f.when === 'week' && (t < now || t > inAWeek)) return false
        if (f.when === 'month' && (t < now || t > inAMonth)) return false
      }
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase()
        const hay =
          `${e.title} ${e.description} ${e.venue} ${e.city} ${e.house} ${e.society ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.start_time}`).getTime() -
        new Date(`${b.date}T${b.start_time}`).getTime(),
    )
    .map((e) => enrich(e, userId))
}

export async function getEvent(id: string, userId?: string): Promise<EventWithMeta> {
  await delay(140)
  return enrich(requireEvent(id), userId)
}

export async function createEvent(
  userId: string,
  input: Omit<
    CampusEvent,
    'id' | 'created_at' | 'host_id' | 'status' | 'rejection_reason' | 'cohost_ids'
  >,
): Promise<CampusEvent> {
  await delay()
  const user = requireUser(userId)
  if (!input.title.trim()) throw new ApiError('Title is required.', 'validation')
  if (input.title.trim().length < 6)
    throw new ApiError('Title must be at least 6 characters.', 'validation')
  if (!input.description.trim() || input.description.trim().length < 30)
    throw new ApiError('Description must be at least 30 characters.', 'validation')
  if (!input.date) throw new ApiError('Pick a date.', 'validation')
  if (input.end_time <= input.start_time)
    throw new ApiError('End time must be after start time.', 'validation')
  if (input.capacity < 2 || input.capacity > 500)
    throw new ApiError('Capacity must be between 2 and 500.', 'validation')

  const allowed = user.role === 'admin' || user.role === 'organizer'
  const event: CampusEvent = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    id: uid(),
    host_id: user.id,
    status: 'pending',
    cohost_ids: [],
    created_at: new Date().toISOString(),
  }
  write((d) => {
    d.events.push(event)
    for (const org of input.collab_orgs) {
      if (org === input.house || org === input.society) continue
      d.collabs.push({
        id: uid(),
        event_id: event.id,
        requested_by: user.id,
        target_org: org,
        message: `${user.full_name} requested ${org} to co-host “${event.title}”.`,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    }
  })
  if (!allowed) {
    // students are allowed to propose; it simply stays pending
  }
  return event
}

export async function approveEvent(eventId: string, adminId: string) {
  await delay()
  const admin = requireUser(adminId)
  if (admin.role !== 'admin') throw new ApiError('Only admins can approve events.', 'forbidden')
  const ev = requireEvent(eventId)
  if (ev.status !== 'pending') throw new ApiError('This proposal is no longer pending.', 'state')
  write((d) => {
    const e = d.events.find((x) => x.id === eventId)!
    e.status = 'approved'
    e.rejection_reason = undefined
  })
}

export async function rejectEvent(eventId: string, adminId: string, reason: string) {
  await delay()
  const admin = requireUser(adminId)
  if (admin.role !== 'admin') throw new ApiError('Only admins can reject events.', 'forbidden')
  if (!reason.trim()) throw new ApiError('A rejection reason is required.', 'validation')
  const ev = requireEvent(eventId)
  if (ev.status !== 'pending') throw new ApiError('This proposal is no longer pending.', 'state')
  write((d) => {
    const e = d.events.find((x) => x.id === eventId)!
    e.status = 'rejected'
    e.rejection_reason = reason.trim()
  })
}

export async function setEventStatus(
  eventId: string,
  userId: string,
  status: CampusEvent['status'],
) {
  await delay()
  const user = requireUser(userId)
  const ev = requireEvent(eventId)
  const isHost = ev.host_id === user.id
  if (user.role !== 'admin' && !isHost)
    throw new ApiError('Only the host or an admin can change this event.', 'forbidden')
  if (user.role === 'student' && !isHost)
    throw new ApiError('Only the host or an admin can change this event.', 'forbidden')
  if (!['cancelled', 'completed', 'approved'].includes(status))
    throw new ApiError('Unsupported status change.', 'validation')
  write((d) => {
    const e = d.events.find((x) => x.id === eventId)!
    e.status = status
  })
}

/* ---------------------------------------------------------- registration */

export async function registerForEvent(eventId: string, userId: string) {
  await delay()
  requireUser(userId)
  const ev = requireEvent(eventId)
  if (ev.status !== 'approved')
    throw new ApiError('This event is not open for registration.', 'state')
  if (new Date(`${ev.date}T${ev.end_time}`).getTime() < Date.now())
    throw new ApiError('This event has already ended.', 'past')

  return write<Registration>((d) => {
    const existing = d.registrations.find((r) => r.event_id === eventId && r.user_id === userId)
    if (existing && existing.status === 'registered')
      throw new ApiError('You are already registered for this event.', 'duplicate')
    const seats = d.registrations.filter(
      (r) => r.event_id === eventId && r.status === 'registered',
    ).length
    if (seats >= ev.capacity) throw new ApiError('This event is at full capacity.', 'capacity')

    if (existing) {
      existing.status = 'registered'
      existing.checked_in_at = null
      existing.token = token()
      return { ...existing }
    }
    const reg: Registration = {
      id: uid(),
      event_id: eventId,
      user_id: userId,
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: new Date().toISOString(),
    }
    d.registrations.push(reg)
    return { ...reg }
  })
}

export async function cancelRegistration(eventId: string, userId: string) {
  await delay()
  requireUser(userId)
  const ev = requireEvent(eventId)
  if (ev.status === 'completed') throw new ApiError('This event is already completed.', 'state')
  write((d) => {
    const r = d.registrations.find((x) => x.event_id === eventId && x.user_id === userId)
    if (!r) throw new ApiError('You are not registered for this event.', 'not_found')
    if (r.checked_in_at)
      throw new ApiError('Attendance was already recorded — contact an admin.', 'locked')
    r.status = 'cancelled'
  })
}

export async function listMyRegistrations(userId: string): Promise<EventWithMeta[]> {
  await delay(140)
  const db = load()
  requireUser(userId)
  const ids = db.registrations
    .filter((r) => r.user_id === userId && r.status === 'registered')
    .map((r) => r.event_id)
  return ids
    .map((id) => db.events.find((e) => e.id === id))
    .filter((e): e is CampusEvent => Boolean(e))
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.start_time}`).getTime() -
        new Date(`${b.date}T${b.start_time}`).getTime(),
    )
    .map((e) => enrich(e, userId))
}

/* ------------------------------------------------------------- check-in */

/**
 * Simulated server-side verification. In demo mode this runs in the browser,
 * so it is NOT a security boundary — see README. The Supabase build performs
 * the same checks inside a Postgres function.
 */
export async function verifyCheckin(
  eventId: string,
  scanToken: string,
  scannerId: string,
): Promise<CheckinResult> {
  await delay(360)
  const scanner = requireUser(scannerId)
  const ev = requireEvent(eventId)
  const db = load()

  const isHost = ev.host_id === scanner.id
  const isCohost = ev.cohost_ids.includes(scanner.id)
  if (scanner.role !== 'admin' && !isHost && !isCohost)
    return { ok: false, message: 'You are not authorised to check in attendees.' }

  const clean = (scanToken || '').trim().toUpperCase()
  const reg = db.registrations.find(
    (r) => r.event_id === eventId && r.token.toUpperCase() === clean,
  )
  if (!reg) return { ok: false, message: 'QR token is not valid for this event.' }
  if (reg.status !== 'registered') return { ok: false, message: 'This registration was cancelled.' }

  const attendee = db.profiles.find((p) => p.id === reg.user_id)
  if (!attendee) return { ok: false, message: 'Attendee record missing.' }

  if (reg.checked_in_at) {
    const by = db.profiles.find((p) => p.id === reg.checkin_by)
    return {
      ok: false,
      already: true,
      attendee,
      message: `Already checked in at ${new Date(reg.checked_in_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}${by ? ` by ${by.full_name}` : ''}.`,
    }
  }

  write((d) => {
    const r = d.registrations.find((x) => x.id === reg.id)!
    r.checked_in_at = new Date().toISOString()
    r.checkin_by = scanner.id

    const exists = d.points.find((p) => p.event_id === eventId && p.user_id === r.user_id)
    if (!exists) {
      d.points.push({
        id: uid(),
        user_id: r.user_id,
        event_id: eventId,
        points: ev.points_value,
        reason: `Verified check-in · ${ev.title}`,
        created_at: new Date().toISOString(),
      })
      const prof = d.profiles.find((p) => p.id === r.user_id)
      if (prof) prof.points += ev.points_value
    }
    if (isHost || scanner.role === 'admin') {
      const hostExists = d.points.find(
        (p) => p.event_id === eventId && p.user_id === ev.host_id && p.reason.startsWith('Hosted'),
      )
      if (!hostExists) {
        d.points.push({
          id: uid(),
          user_id: ev.host_id,
          event_id: eventId,
          points: ev.points_value,
          reason: `Hosted verified event · ${ev.title}`,
          created_at: new Date().toISOString(),
        })
        const hp = d.profiles.find((p) => p.id === ev.host_id)
        if (hp) hp.points += ev.points_value
      }
    }
  })

  return {
    ok: true,
    attendee,
    message: `Checked in — ${ev.points_value} points awarded to ${attendee.full_name}.`,
  }
}

export async function attendeeManifest(eventId: string, userId: string): Promise<ManifestRow[]> {
  await delay(160)
  const ev = requireEvent(eventId)
  const scanner = requireUser(userId)
  if (scanner.role !== 'admin' && ev.host_id !== scanner.id && !ev.cohost_ids.includes(scanner.id))
    throw new ApiError('Only the host, co-hosts or an admin can open the manifest.', 'forbidden')
  const db = load()
  return db.registrations
    .filter((r) => r.event_id === eventId && r.status === 'registered')
    .map((r) => ({
      registration: r,
      attendee: db.profiles.find((p) => p.id === r.user_id),
    }))
    .filter((x) => x.attendee)
}

/* ------------------------------------------------------------- collabs */

export async function listCollabRequests(userId: string): Promise<CollabRequest[]> {
  await delay(140)
  const user = requireUser(userId)
  const db = load()
  return db.collabs.filter((c) => {
    const ev = db.events.find((e) => e.id === c.event_id)
    if (!ev) return false
    if (user.role === 'admin') return c.status === 'pending'
    return c.target_org === user.house || c.target_org === user.society
  })
}

export async function respondCollab(
  collabId: string,
  userId: string,
  status: 'accepted' | 'declined',
) {
  await delay()
  const user = requireUser(userId)
  write((d) => {
    const c = d.collabs.find((x) => x.id === collabId)
    if (!c) throw new ApiError('Request not found.', 'not_found')
    const ev = d.events.find((e) => e.id === c.event_id)
    if (!ev) throw new ApiError('Event not found.', 'not_found')
    const mine =
      c.target_org === user.house || c.target_org === user.society || user.role === 'admin'
    if (!mine) throw new ApiError('This request is not for your organisation.', 'forbidden')
    if (c.status !== 'pending') throw new ApiError('Already responded.', 'state')
    c.status = status
    if (status === 'accepted') {
      if (!ev.collab_orgs.includes(c.target_org)) ev.collab_orgs.push(c.target_org)
      if (!ev.cohost_ids.includes(user.id)) ev.cohost_ids.push(user.id)
    }
  })
}

/* --------------------------------------------------------- leaderboards */

export async function leaderboard(): Promise<{
  overall: Profile[]
  houses: { house: string; points: number; members: number }[]
}> {
  await delay(180)
  const db = load()
  const overall = [...db.profiles].sort((a, b) => b.points - a.points)
  const map = new Map<string, { points: number; members: number }>()
  for (const p of db.profiles) {
    const cur = map.get(p.house) ?? { points: 0, members: 0 }
    cur.points += p.points
    cur.members += 1
    map.set(p.house, cur)
  }
  const houses = [...map.entries()]
    .map(([house, v]) => ({ house, ...v }))
    .sort((a, b) => b.points - a.points)
  return { overall, houses }
}

export async function pointsHistory(userId: string): Promise<PointsEntry[]> {
  await delay(120)
  requireUser(userId)
  const db = load()
  return db.points
    .filter((p) => p.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function attendanceHistory(userId: string): Promise<EventWithMeta[]> {
  await delay(140)
  const db = load()
  requireUser(userId)
  const ids = db.registrations
    .filter((r) => r.user_id === userId && r.checked_in_at)
    .map((r) => r.event_id)
  return ids
    .map((id) => db.events.find((e) => e.id === id))
    .filter((e): e is CampusEvent => Boolean(e))
    .map((e) => enrich(e, userId))
}

/* -------------------------------------------------------------- admin */

export async function listProposals(adminId: string): Promise<EventWithMeta[]> {
  await delay(160)
  const admin = requireUser(adminId)
  if (admin.role !== 'admin') throw new ApiError('Admin access required.', 'forbidden')
  const db = load()
  return db.events
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => enrich(e))
}

export async function listDisputes(adminId: string): Promise<AttendanceDispute[]> {
  await delay(140)
  const admin = requireUser(adminId)
  if (admin.role !== 'admin') throw new ApiError('Admin access required.', 'forbidden')
  return [...load().disputes].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function resolveDispute(disputeId: string, adminId: string, resolution: string) {
  await delay()
  const admin = requireUser(adminId)
  if (admin.role !== 'admin') throw new ApiError('Admin access required.', 'forbidden')
  write((d) => {
    const disp = d.disputes.find((x) => x.id === disputeId)
    if (!disp) throw new ApiError('Dispute not found.', 'not_found')
    disp.status = 'resolved'
    disp.resolution = resolution
    const ev = d.events.find((e) => e.id === disp.event_id)
    if (ev && resolution === 'grant') {
      const already = d.points.find(
        (p) => p.event_id === disp.event_id && p.user_id === disp.user_id,
      )
      if (!already) {
        d.points.push({
          id: uid(),
          user_id: disp.user_id,
          event_id: disp.event_id,
          points: ev.points_value,
          reason: `Manual admin grant · ${ev.title}`,
          created_at: new Date().toISOString(),
        })
        const p = d.profiles.find((x) => x.id === disp.user_id)
        if (p) p.points += ev.points_value
      }
    }
  })
}

export async function submitDispute(eventId: string, userId: string, note: string) {
  await delay()
  requireUser(userId)
  if (!note.trim()) throw new ApiError('Describe the problem first.', 'validation')
  write((d) => {
    d.disputes.push({
      id: uid(),
      event_id: eventId,
      user_id: userId,
      note: note.trim(),
      status: 'open',
      created_at: new Date().toISOString(),
    })
  })
}

export async function profileById(id: string): Promise<Profile> {
  await delay(100)
  const p = load().profiles.find((x) => x.id === id)
  if (!p) throw new ApiError('Profile not found.', 'not_found')
  return p
}
