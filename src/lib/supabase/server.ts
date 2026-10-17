import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config'
import type {
  AttendanceDispute,
  CampusEvent,
  CollabRequest,
  CheckinResult,
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

let _client: SupabaseClient | null = null

/** Lazily constructed so importing this module never throws in demo mode. */
function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return _client
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === 'function'
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value
  },
})

const fail = (e: { message: string; code?: string } | null, fallback: string): never => {
  throw new ApiError(e?.message || fallback, e?.code || 'error')
}

type EventRow = Omit<CampusEvent, 'id'> & { id: string }

/* ---------------------------------------------------------- profile helpers */

/**
 * Columns clients may read off public.profiles. `email` is intentionally
 * absent — the schema never grants that column; the signed-in user's own
 * email comes from the auth session instead.
 */
const PROFILE_COLS =
  'id, full_name, house, society, city, role, points, bio, cohort, created_at'

type ProfileRow = Omit<Profile, 'email'> & { email?: string }

async function sessionUser(): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
    ? { id: data.session.user.id, email: data.session.user.email ?? '' }
    : null
}

async function decorate(rows: ProfileRow[]): Promise<Profile[]> {
  const me = await sessionUser()
  return rows.map((r) => ({ ...r, email: r.id === me?.id ? (me?.email ?? '') : '' }))
}

async function decorateOne(row: ProfileRow): Promise<Profile> {
  return (await decorate([row]))[0]
}

async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return []
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).in('id', unique)
  if (error) fail(error, 'Could not load profiles')
  return decorate((data ?? []) as ProfileRow[])
}

async function hydrate(events: EventRow[], userId?: string): Promise<EventWithMeta[]> {
  if (!events.length) return []
  const ids = events.map((e) => e.id)
  const [{ data: seatRows, error: seatErr }, { data: regs, error: regErr }, profiles] =
    await Promise.all([
      supabase.from('event_seats').select('event_id, attendee_count').in('event_id', ids),
      supabase.from('registrations').select('*').in('event_id', ids),
      fetchProfiles(events.map((e) => e.host_id)),
    ])
  if (seatErr) fail(seatErr, 'Could not load attendance counts')
  if (regErr) fail(regErr, 'Could not load registrations')
  const seats = new Map<string, number>(
    ((seatRows ?? []) as { event_id: string; attendee_count: number }[]).map((s) => [
      s.event_id,
      Number(s.attendee_count),
    ]),
  )
  const rows = (regs ?? []) as Registration[]
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return events.map((e) => {
    const mine = rows.find((r) => r.event_id === e.id && r.user_id === userId) ?? null
    const count = seats.get(e.id) ?? 0
    return {
      ...e,
      host: byId.get(e.host_id),
      attendee_count: count,
      seats_left: Math.max(0, e.capacity - count),
      my_registration: mine ?? null,
    }
  })
}

const sortEv = (a: { date: string; start_time: string }, b: { date: string; start_time: string }) =>
  new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime()

/** Translates Postgres guard-trigger messages into the demo's ApiErrors. */
function mapRegError(e: { message: string; code?: string }): ApiError {
  const m = e.message || ''
  if (/full capacity/i.test(m)) return new ApiError('This event is at full capacity.', 'capacity')
  if (/not open for registration/i.test(m))
    return new ApiError('This event is not open for registration.', 'state')
  if (/already passed|already ended/i.test(m))
    return new ApiError('This event has already ended.', 'past')
  if (/already registered/i.test(m))
    return new ApiError('You are already registered for this event.', 'duplicate')
  if (/already completed/i.test(m))
    return new ApiError('This event is already completed.', 'state')
  if (/Attendance already recorded/i.test(m))
    return new ApiError('Attendance was already recorded — contact an admin.', 'locked')
  if (/not found/i.test(m)) return new ApiError(m, 'not_found')
  return new ApiError(m || 'Could not register', e.code || 'error')
}

/* ------------------------------------------------------------------ auth */

export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) fail(error, 'Could not sign in')
  if (!data.user) throw new ApiError('Sign-in returned no user.', 'no_user')
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', data.user.id)
    .maybeSingle()
  if (pErr) fail(pErr, 'Could not load your profile')
  if (!profile) throw new ApiError('Profile not found.', 'not_found')
  return { ...(profile as ProfileRow), email: data.user.email ?? '' }
}

export async function signUp(input: {
  full_name: string
  email: string
  password: string
  house: string
  city: string
  role: Profile['role']
}): Promise<Profile> {
  if (input.password.length < 8)
    throw new ApiError('Password must be at least 8 characters.', 'weak_password')
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.full_name, house: input.house, city: input.city },
    },
  })
  if (error) fail(error, 'Could not create account')
  if (!data.session) {
    // email confirmation is enabled: the user exists but is not signed in.
    // Returning a profile here would fake a session and every later request
    // would run as anon (RLS would then reject writes).
    throw new ApiError(
      'Account created. Confirm your email address, then sign in.',
      'confirm_email',
    )
  }
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', data.session.user.id)
    .maybeSingle()
  if (pErr) fail(pErr, 'Could not load your profile')
  if (!profile) throw new ApiError('Profile not found.', 'not_found')
  return { ...(profile as ProfileRow), email: data.session.user.email ?? '' }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) fail(error, 'Could not sign out')
}

export async function currentSession(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', data.session.user.id)
    .maybeSingle()
  if (!profile) return null
  return { ...(profile as ProfileRow), email: data.session.user.email ?? '' }
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'house' | 'city' | 'bio' | 'society'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_COLS)
    .single()
  if (error) fail(error, 'Could not update profile')
  return decorateOne(data as ProfileRow)
}

export type AuthEvent = 'signed_in' | 'signed_out'

/** Keeps the auth context fresh on cross-tab sign-out / token refresh. */
export function subscribeAuth(cb: (event: AuthEvent) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') cb('signed_out')
    else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      cb('signed_in')
  })
  return () => data.subscription.unsubscribe()
}

/* ---------------------------------------------------------------- events */

export async function listEvents(
  filters?: Partial<EventFilters>,
  userId?: string,
): Promise<EventWithMeta[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
  if (error) fail(error, 'Could not load events')
  const rows = (data ?? []) as EventRow[]
  const f = { q: '', city: '', type: '', org: '', when: 'all' as const, ...filters }
  const now = Date.now()
  const filtered = rows.filter((e) => {
    if (f.city && e.city !== f.city) return false
    if (f.type && e.type !== f.type) return false
    if (f.org && !(e.house === f.org || e.society === f.org || e.collab_orgs.includes(f.org)))
      return false
    if (f.when !== 'all') {
      const t = new Date(`${e.date}T${e.start_time}`).getTime()
      const cap = f.when === 'week' ? now + 7 * 864e5 : now + 30 * 864e5
      if (t < now || t > cap) return false
    }
    if (f.q.trim()) {
      const q = f.q.trim().toLowerCase()
      const hay = `${e.title} ${e.description} ${e.venue} ${e.city} ${e.house} ${
        e.society ?? ''
      }`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  return hydrate(filtered.sort(sortEv), userId)
}

export async function getEvent(id: string, userId?: string): Promise<EventWithMeta> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
  if (error) fail(error, 'Event not found')
  const [hydrated] = await hydrate([data as EventRow], userId)
  return hydrated
}

export async function createEvent(
  userId: string,
  input: Omit<
    CampusEvent,
    'id' | 'created_at' | 'host_id' | 'status' | 'rejection_reason' | 'cohost_ids'
  >,
): Promise<CampusEvent> {
  void userId
  if (!input.title.trim()) throw new ApiError('Title is required.', 'validation')
  if (input.title.trim().length < 6)
    throw new ApiError('Title must be at least 6 characters.', 'validation')
  if (input.description.trim().length < 30)
    throw new ApiError('Description must be at least 30 characters.', 'validation')
  if (!input.date) throw new ApiError('Pick a date.', 'validation')
  if (input.end_time <= input.start_time)
    throw new ApiError('End time must be after start time.', 'validation')
  if (input.capacity < 2 || input.capacity > 500)
    throw new ApiError('Capacity must be between 2 and 500.', 'validation')

  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, title: input.title.trim(), description: input.description.trim() })
    .select('*')
    .single()
  if (error) fail(error, 'Could not create event')

  const collabs = (input.collab_orgs ?? []).filter((o) => o !== input.house && o !== input.society)
  if (collabs.length) {
    const { error: cErr } = await supabase.from('collab_requests').insert(
      collabs.map((org) => ({
        event_id: data.id,
        requested_by: data.host_id,
        target_org: org,
        message: `Requested ${org} to co-host “${input.title}”.`,
      })),
    )
    if (cErr) fail(cErr, 'Event saved but the collaboration request failed')
  }
  return data as CampusEvent
}

async function assertPending(eventId: string): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .maybeSingle()
  if (error) fail(error, 'Could not load event')
  if (!data) throw new ApiError('Event not found.', 'not_found')
  if (data.status !== 'pending')
    throw new ApiError('This proposal is no longer pending.', 'state')
}

export async function approveEvent(eventId: string, adminId: string): Promise<void> {
  void adminId
  await assertPending(eventId)
  const { error } = await supabase
    .from('events')
    .update({ status: 'approved', rejection_reason: null })
    .eq('id', eventId)
  if (error) fail(error, 'Could not approve event')
}

export async function rejectEvent(eventId: string, adminId: string, reason: string): Promise<void> {
  void adminId
  if (!reason.trim()) throw new ApiError('A rejection reason is required.', 'validation')
  await assertPending(eventId)
  const { error } = await supabase
    .from('events')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', eventId)
  if (error) fail(error, 'Could not reject event')
}

export async function setEventStatus(
  eventId: string,
  userId: string,
  status: CampusEvent['status'],
): Promise<void> {
  void userId
  if (!['cancelled', 'completed', 'approved'].includes(status))
    throw new ApiError('Unsupported status change.', 'validation')
  const { error } = await supabase.from('events').update({ status }).eq('id', eventId)
  if (error) fail(error, 'Could not update event status')
}

/* ---------------------------------------------------------- registration */

export async function registerForEvent(eventId: string, userId: string): Promise<Registration> {
  const { data, error } = await supabase
    .from('registrations')
    .insert({ event_id: eventId, user_id: userId })
    .select('*')
    .single()
  if (!error) return data as Registration
  if (error.code !== '23505') throw mapRegError(error)

  // unique violation: the row may be a cancelled registration — reactivate
  // it (fresh token, cleared check-in) exactly like the demo server does
  const { data: existing, error: exErr } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()
  if (exErr) throw mapRegError(exErr)
  if (!existing) throw mapRegError(error)
  if ((existing as Registration).status === 'registered')
    throw new ApiError('You are already registered for this event.', 'duplicate')
  const { data: updated, error: upErr } = await supabase
    .from('registrations')
    .update({ status: 'registered' })
    .eq('id', (existing as Registration).id)
    .select('*')
    .single()
  if (upErr) throw mapRegError(upErr)
  return updated as Registration
}

export async function cancelRegistration(eventId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('id')
  if (error) throw mapRegError(error)
  if (!data?.length)
    throw new ApiError('You are not registered for this event.', 'not_found')
}

export async function listMyRegistrations(userId: string): Promise<EventWithMeta[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'registered')
  if (error) fail(error, 'Could not load your registrations')
  const ids = (data ?? []).map((r) => r.event_id as string)
  if (!ids.length) return []
  const { data: evs, error: eErr } = await supabase.from('events').select('*').in('id', ids)
  if (eErr) fail(eErr, 'Could not load events')
  return hydrate(((evs ?? []) as EventRow[]).sort(sortEv), userId)
}

/* ------------------------------------------------------------- check-in */

export async function verifyCheckin(
  eventId: string,
  scanToken: string,
  scannerId: string,
): Promise<CheckinResult> {
  void scannerId
  const { data, error } = await supabase.rpc('verify_checkin', {
    p_event_id: eventId,
    p_token: scanToken,
  })
  if (error) fail(error, 'Check-in verification failed')
  return data as CheckinResult
}

export async function attendeeManifest(eventId: string, userId: string): Promise<ManifestRow[]> {
  const { data: evErrData, error: evErr } = await supabase
    .from('events')
    .select('host_id, cohost_ids')
    .eq('id', eventId)
    .single()
  if (evErr) fail(evErr, 'Event not found')
  if (!evErrData) throw new ApiError('Event not found.', 'not_found')
  const staff = evErrData.host_id === userId || (evErrData.cohost_ids ?? []).includes(userId)
  if (!staff) {
    const { data: isAdmin } = await supabase.rpc('is_admin')
    if (!isAdmin) throw new ApiError('Only staff can open the manifest.', 'forbidden')
  }
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'registered')
  if (error) fail(error, 'Could not load the attendee manifest')
  const rows = (data ?? []) as Registration[]
  const profiles = await fetchProfiles(rows.map((r) => r.user_id))
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return rows.map((r) => ({ registration: r, attendee: byId.get(r.user_id) }))
}

/* ------------------------------------------------------------- collabs */

export async function listCollabRequests(userId: string): Promise<CollabRequest[]> {
  // mirrors the demo: admins see pending requests; everyone else sees the
  // threads aimed at their house/society (RLS enforces the same rule)
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  let q = supabase
    .from('collab_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (me?.role === 'admin') q = q.eq('status', 'pending')
  const { data, error } = await q
  if (error) fail(error, 'Could not load collaboration requests')
  return (data ?? []) as CollabRequest[]
}

export async function respondCollab(
  collabId: string,
  _userId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  void _userId
  const { error } = await supabase.rpc('respond_collab', {
    p_collab_id: collabId,
    p_status: status,
  })
  if (error) fail(error, 'Could not update the request')
}

/* --------------------------------------------------------- leaderboards */

export async function leaderboard(): Promise<{
  overall: Profile[]
  houses: { house: string; points: number; members: number }[]
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .order('points', { ascending: false })
  if (error) fail(error, 'Could not load the leaderboard')
  const overall = await decorate((data ?? []) as ProfileRow[])
  const map = new Map<string, { points: number; members: number }>()
  for (const p of overall) {
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
  const { data, error } = await supabase
    .from('points_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) fail(error, 'Could not load points history')
  return (data ?? []) as PointsEntry[]
}

export async function attendanceHistory(userId: string): Promise<EventWithMeta[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('event_id')
    .eq('user_id', userId)
    .not('checked_in_at', 'is', null)
  if (error) fail(error, 'Could not load attendance history')
  const ids = (data ?? []).map((r) => r.event_id as string)
  if (!ids.length) return []
  const { data: evs, error: eErr } = await supabase.from('events').select('*').in('id', ids)
  if (eErr) fail(eErr, 'Could not load events')
  return ((evs ?? []) as EventRow[]).sort(sortEv).map((e) => ({ ...e })) as EventWithMeta[]
}

/* -------------------------------------------------------------- admin */

export async function listProposals(adminId: string): Promise<EventWithMeta[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) fail(error, 'Could not load proposals')
  void adminId
  return hydrate((data ?? []) as EventRow[])
}

export async function listDisputes(adminId: string): Promise<AttendanceDispute[]> {
  void adminId
  const { data, error } = await supabase
    .from('attendance_disputes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) fail(error, 'Could not load disputes')
  return (data ?? []) as AttendanceDispute[]
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: string,
): Promise<void> {
  void adminId
  const { error } = await supabase.rpc('resolve_dispute', {
    p_dispute_id: disputeId,
    p_resolution: resolution,
  })
  if (error) fail(error, 'Could not resolve dispute')
}

export async function submitDispute(eventId: string, userId: string, note: string): Promise<void> {
  if (!note.trim()) throw new ApiError('Describe the problem first.', 'validation')
  const { error } = await supabase
    .from('attendance_disputes')
    .insert({ event_id: eventId, user_id: userId, note: note.trim() })
  if (error) fail(error, 'Could not submit the dispute')
}

export async function profileById(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', id)
    .maybeSingle()
  if (error) fail(error, 'Profile not found')
  if (!data) throw new ApiError('Profile not found.', 'not_found')
  return decorateOne(data as ProfileRow)
}
