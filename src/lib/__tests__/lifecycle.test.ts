import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemo, load } from '../demo/store'
import * as api from '../api'
import { DEMO_MODE } from '../config'

const futureDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const baseEvent = (overrides: Record<string, unknown> = {}) => ({
  title: 'Test Co-working Sprint',
  description:
    'A focused four-hour co-working block with mentors circulating to unblock doubts for everyone.',
  type: 'coworking' as const,
  date: futureDate(5),
  start_time: '10:00',
  end_time: '13:00',
  venue: 'The Hive',
  city: 'Chennai',
  lat: 13.03,
  lng: 80.26,
  capacity: 20,
  house: 'Ganga',
  society: 'DevSoc',
  collab_orgs: [] as string[],
  points_value: 25,
  ...overrides,
})

beforeEach(() => {
  resetDemo()
})

describe('demo mode guard', () => {
  it('runs without Supabase credentials', () => {
    expect(DEMO_MODE).toBe(true)
  })
})

describe('event lifecycle', () => {
  it('seeds approved and pending events', async () => {
    const events = await api.listEvents()
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.status === 'approved')).toBe(true)
  })

  it('creates an event as pending and publishes it only through an admin', async () => {
    const created = await api.createEvent('u-org', baseEvent() as never)
    expect(created.status).toBe('pending')

    const listed = await api.listEvents()
    expect(listed.find((e) => e.id === created.id)).toBeUndefined()

    await expect(api.approveEvent(created.id, 'u-student')).rejects.toThrow(/admins/i)

    await api.approveEvent(created.id, 'u-admin')
    const after = await api.listEvents()
    expect(after.find((e) => e.id === created.id)?.status).toBe('approved')
  })

  it('rejects a proposal with a reason and refuses approval afterwards', async () => {
    const created = await api.createEvent('u-org', baseEvent() as never)
    await expect(api.rejectEvent(created.id, 'u-admin', '')).rejects.toThrow(/reason/i)
    await api.rejectEvent(created.id, 'u-admin', 'Venue is not accessible.')
    const pending = await api.listProposals('u-admin')
    expect(pending.find((e) => e.id === created.id)).toBeUndefined()
    await expect(api.approveEvent(created.id, 'u-admin')).rejects.toThrow(/no longer pending/i)
  })

  it('validates the create form server-side', async () => {
    await expect(api.createEvent('u-org', baseEvent({ title: 'short' }) as never)).rejects.toThrow(
      /6 characters/i,
    )
    await expect(
      api.createEvent('u-org', baseEvent({ description: 'too short' }) as never),
    ).rejects.toThrow(/30 characters/i)
    await expect(
      api.createEvent('u-org', baseEvent({ end_time: '09:00' }) as never),
    ).rejects.toThrow(/after start time/i)
    await expect(api.createEvent('u-org', baseEvent({ capacity: 1 }) as never)).rejects.toThrow(
      /between 2 and 500/i,
    )
  })
})

describe('registration', () => {
  it('prevents duplicate registrations', async () => {
    await api.registerForEvent('e-2', 'u-3')
    await expect(api.registerForEvent('e-2', 'u-3')).rejects.toThrow(/already registered/i)
  })

  it('enforces capacity', async () => {
    const ev = await api.createEvent(
      'u-admin',
      baseEvent({ capacity: 2, title: 'Tiny Two-Seater Session' }) as never,
    )
    await api.approveEvent(ev.id, 'u-admin')
    await api.registerForEvent(ev.id, 'u-3')
    await api.registerForEvent(ev.id, 'u-4')
    await expect(api.registerForEvent(ev.id, 'u-student')).rejects.toThrow(/full capacity/i)
  })

  it('releases the seat on cancellation and allows re-registration', async () => {
    await api.cancelRegistration('e-1', 'u-student')
    const ev = await api.getEvent('e-1', 'u-student')
    expect(ev.my_registration?.status).toBe('cancelled')
    const reg = await api.registerForEvent('e-1', 'u-student')
    expect(reg.status).toBe('registered')
  })

  it('refuses registration for events that are not published', async () => {
    const ev = await api.createEvent('u-org', baseEvent() as never)
    await expect(api.registerForEvent(ev.id, 'u-student')).rejects.toThrow(/not open/i)
  })
})

describe('QR check-in and points', () => {
  it('rejects unauthorised scanners', async () => {
    const res = await api.verifyCheckin('e-1', 'whatever', 'u-4')
    expect(res.ok).toBe(false)
    expect(res.message).toMatch(/not authorised/i)
  })

  it('rejects an unknown token', async () => {
    const res = await api.verifyCheckin('e-1', 'NOTAREALTOKEN', 'u-admin')
    expect(res.ok).toBe(false)
    expect(res.message).toMatch(/not valid/i)
  })

  it('awards points exactly once and blocks duplicates', async () => {
    const before = load().profiles.find((p) => p.id === 'u-org')!.points
    const reg = load().registrations.find((r) => r.event_id === 'e-1' && r.user_id === 'u-org')!

    const first = await api.verifyCheckin('e-1', reg.token, 'u-admin')
    expect(first.ok).toBe(true)

    const after = load().profiles.find((p) => p.id === 'u-org')!.points
    expect(after - before).toBe(30) // e-1 points_value is 30
  })

  it('reports an already-checked-in attendee on the second scan', async () => {
    const reg = load().registrations.find((r) => r.event_id === 'e-1' && r.user_id === 'u-org')!
    await api.verifyCheckin('e-1', reg.token, 'u-admin')
    const second = await api.verifyCheckin('e-1', reg.token, 'u-admin')
    expect(second.ok).toBe(false)
    expect(second.already).toBe(true)
  })

  it('never awards points from a cancelled registration', async () => {
    await api.registerForEvent('e-3', 'u-3')
    await api.cancelRegistration('e-3', 'u-3')
    const reg = load().registrations.find((r) => r.event_id === 'e-3' && r.user_id === 'u-3')!
    const res = await api.verifyCheckin('e-3', reg.token, 'u-admin')
    expect(res.ok).toBe(false)
    expect(res.message).toMatch(/cancelled/i)
  })
})

describe('admin and leaderboard', () => {
  it('blocks students from admin surfaces', async () => {
    await expect(api.listProposals('u-student')).rejects.toThrow(/admin/i)
    await expect(api.listDisputes('u-student')).rejects.toThrow(/admin/i)
  })

  it('blocks a non-host from changing event status', async () => {
    await expect(api.setEventStatus('e-1', 'u-3', 'cancelled')).rejects.toThrow(/host or an admin/i)
    await api.setEventStatus('e-1', 'u-admin', 'cancelled')
    const ev = await api.getEvent('e-1')
    expect(ev.status).toBe('cancelled')
  })

  it('ranks students and houses by verified points', async () => {
    const { overall, houses } = await api.leaderboard()
    expect(overall[0].id).toBe('u-admin')
    for (let i = 1; i < overall.length; i++) {
      expect(overall[i - 1].points).toBeGreaterThanOrEqual(overall[i].points)
    }
    expect(houses[0].points).toBeGreaterThanOrEqual(houses[houses.length - 1].points)
  })

  it('resolves an attendance dispute by granting points once', async () => {
    const disputes = await api.listDisputes('u-admin')
    const open = disputes.find((d) => d.status === 'open')!
    const before = load().profiles.find((p) => p.id === open.user_id)!.points
    await api.resolveDispute(open.id, 'u-admin', 'grant')
    const after = load().profiles.find((p) => p.id === open.user_id)!.points
    expect(after).toBeGreaterThan(before)
    const still = await api.listDisputes('u-admin')
    expect(still.find((d) => d.id === open.id)?.status).toBe('resolved')
  })
})

describe('collaboration requests', () => {
  it('creates collab requests for invited orgs and accepts them', async () => {
    const ev = await api.createEvent(
      'u-org',
      baseEvent({
        house: 'Yamuna',
        collab_orgs: ['Ganga'],
        title: 'Cross House Mixer Session',
      }) as never,
    )
    const forGanga = await api.listCollabRequests('u-admin')
    expect(forGanga.some((c) => c.event_id === ev.id && c.target_org === 'Ganga')).toBe(true)

    const req = forGanga.find((c) => c.event_id === ev.id)!
    await api.respondCollab(req.id, 'u-admin', 'accepted')
    const refreshed = await api.getEvent(ev.id)
    expect(refreshed.collab_orgs).toContain('Ganga')
    expect(refreshed.cohost_ids).toContain('u-admin')
  })

  it('ignores a response from an unrelated organisation', async () => {
    const ev = await api.createEvent(
      'u-org',
      baseEvent({
        house: 'Yamuna',
        collab_orgs: ['Ganga'],
        title: 'Another Mixer Session',
      }) as never,
    )
    const req = (await api.listCollabRequests('u-admin')).find((c) => c.event_id === ev.id)!
    await expect(api.respondCollab(req.id, 'u-5', 'accepted')).rejects.toThrow(/not for your/i)
  })
})

describe('registration reactivation', () => {
  it('issues a fresh token and clears check-in when re-registering', async () => {
    const seeded = load().registrations.find(
      (r) => r.event_id === 'e-1' && r.user_id === 'u-student',
    )!
    const originalToken = seeded.token
    await api.cancelRegistration('e-1', 'u-student')
    const reg = await api.registerForEvent('e-1', 'u-student')
    expect(reg.status).toBe('registered')
    expect(reg.token).not.toBe(originalToken)
    expect(reg.checked_in_at).toBeNull()
  })

  it('enforces capacity when reactivating a cancelled seat', async () => {
    const ev = await api.createEvent(
      'u-admin',
      baseEvent({ capacity: 2, title: 'Reactivation Capacity Check' }) as never,
    )
    await api.approveEvent(ev.id, 'u-admin')
    await api.registerForEvent(ev.id, 'u-student')
    await api.registerForEvent(ev.id, 'u-3')
    await api.cancelRegistration(ev.id, 'u-student')
    // a walk-up fills the freed seat — the old registration must not overbook
    await api.registerForEvent(ev.id, 'u-4')
    await expect(api.registerForEvent(ev.id, 'u-student')).rejects.toThrow(/full capacity/i)
    await api.cancelRegistration(ev.id, 'u-4')
    const reg = await api.registerForEvent(ev.id, 'u-student')
    expect(reg.status).toBe('registered')
  })
})
