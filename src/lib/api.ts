import { DEMO_MODE } from './config'
import * as demo from './demo/server'
import * as remote from './supabase/server'
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
} from './types'

/**
 * Single data-access surface for the app.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured every call
 * is proxied to Supabase (Postgres + Auth + RLS). Otherwise the app runs in
 * "Local demo mode", backed by localStorage — clearly labelled everywhere
 * and NOT a substitute for real authentication.
 */
export const ApiError = DEMO_MODE ? demo.ApiError : remote.ApiError
export const isDemo = DEMO_MODE

const d = demo
const r = remote

/* auth */
export const signIn = (email: string, password: string): Promise<Profile> =>
  DEMO_MODE ? d.signIn(email, password) : r.signIn(email, password)

export const signUp = (input: {
  full_name: string
  email: string
  password: string
  house: string
  city: string
  role: Profile['role']
}): Promise<Profile> => (DEMO_MODE ? d.signUp(input) : r.signUp(input))

export const signOut = (): Promise<void> => (DEMO_MODE ? d.signOut() : r.signOut())

export const currentSession = (): Promise<Profile | null> =>
  DEMO_MODE ? d.currentSession() : r.currentSession()

export const updateProfile = (
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'house' | 'city' | 'bio' | 'society'>>,
): Promise<Profile> => (DEMO_MODE ? d.updateProfile(userId, patch) : r.updateProfile(userId, patch))

export const subscribeAuth = (cb: (event: 'signed_in' | 'signed_out') => void): (() => void) =>
  DEMO_MODE ? d.subscribeAuth(cb) : r.subscribeAuth(cb)

export const profileById = (id: string): Promise<Profile> =>
  DEMO_MODE ? d.profileById(id) : r.profileById(id)

/* events */
export const listEvents = (
  filters?: Partial<EventFilters>,
  userId?: string,
): Promise<EventWithMeta[]> =>
  DEMO_MODE ? d.listEvents(filters, userId) : r.listEvents(filters, userId)

export const getEvent = (id: string, userId?: string): Promise<EventWithMeta> =>
  DEMO_MODE ? d.getEvent(id, userId) : r.getEvent(id, userId)

export const createEvent = (
  userId: string,
  input: Omit<
    CampusEvent,
    'id' | 'created_at' | 'host_id' | 'status' | 'rejection_reason' | 'cohost_ids'
  >,
): Promise<CampusEvent> => (DEMO_MODE ? d.createEvent(userId, input) : r.createEvent(userId, input))

export const approveEvent = (eventId: string, adminId: string): Promise<void> =>
  DEMO_MODE ? d.approveEvent(eventId, adminId) : r.approveEvent(eventId, adminId)

export const rejectEvent = (eventId: string, adminId: string, reason: string): Promise<void> =>
  DEMO_MODE ? d.rejectEvent(eventId, adminId, reason) : r.rejectEvent(eventId, adminId, reason)

export const setEventStatus = (
  eventId: string,
  userId: string,
  status: CampusEvent['status'],
): Promise<void> =>
  DEMO_MODE ? d.setEventStatus(eventId, userId, status) : r.setEventStatus(eventId, userId, status)

/* registrations */
export const registerForEvent = (eventId: string, userId: string): Promise<Registration> =>
  DEMO_MODE ? d.registerForEvent(eventId, userId) : r.registerForEvent(eventId, userId)

export const cancelRegistration = (eventId: string, userId: string): Promise<void> =>
  DEMO_MODE ? d.cancelRegistration(eventId, userId) : r.cancelRegistration(eventId, userId)

export const listMyRegistrations = (userId: string): Promise<EventWithMeta[]> =>
  DEMO_MODE ? d.listMyRegistrations(userId) : r.listMyRegistrations(userId)

/* check-in */
export const verifyCheckin = (
  eventId: string,
  scanToken: string,
  scannerId: string,
): Promise<CheckinResult> =>
  DEMO_MODE
    ? d.verifyCheckin(eventId, scanToken, scannerId)
    : r.verifyCheckin(eventId, scanToken, scannerId)

export const attendeeManifest = (eventId: string, userId: string): Promise<ManifestRow[]> =>
  DEMO_MODE ? d.attendeeManifest(eventId, userId) : r.attendeeManifest(eventId, userId)

/* collaboration */
export const listCollabRequests = (userId: string): Promise<CollabRequest[]> =>
  DEMO_MODE ? d.listCollabRequests(userId) : r.listCollabRequests(userId)

export const respondCollab = (
  collabId: string,
  userId: string,
  status: 'accepted' | 'declined',
): Promise<void> =>
  DEMO_MODE ? d.respondCollab(collabId, userId, status) : r.respondCollab(collabId, userId, status)

/* points & leaderboard */
export const leaderboard = (): Promise<{
  overall: Profile[]
  houses: { house: string; points: number; members: number }[]
}> => (DEMO_MODE ? d.leaderboard() : r.leaderboard())

export const pointsHistory = (userId: string): Promise<PointsEntry[]> =>
  DEMO_MODE ? d.pointsHistory(userId) : r.pointsHistory(userId)

export const attendanceHistory = (userId: string): Promise<EventWithMeta[]> =>
  DEMO_MODE ? d.attendanceHistory(userId) : r.attendanceHistory(userId)

/* admin */
export const listProposals = (adminId: string): Promise<EventWithMeta[]> =>
  DEMO_MODE ? d.listProposals(adminId) : r.listProposals(adminId)

export const listDisputes = (adminId: string): Promise<AttendanceDispute[]> =>
  DEMO_MODE ? d.listDisputes(adminId) : r.listDisputes(adminId)

export const resolveDispute = (
  disputeId: string,
  adminId: string,
  resolution: string,
): Promise<void> =>
  DEMO_MODE
    ? d.resolveDispute(disputeId, adminId, resolution)
    : r.resolveDispute(disputeId, adminId, resolution)

export const submitDispute = (eventId: string, userId: string, note: string): Promise<void> =>
  DEMO_MODE ? d.submitDispute(eventId, userId, note) : r.submitDispute(eventId, userId, note)
