import { describe, expect, it } from 'vitest'
import schema from '../../../supabase/schema.sql?raw'

/** Body of `create or replace function public.<name>` up to its closing $$ */
function fnBody(name: string): string {
  const start = schema.indexOf(`create or replace function public.${name}`)
  expect(start, `function ${name} must exist in schema.sql`).toBeGreaterThanOrEqual(0)
  const end = schema.indexOf('$$;', start)
  return schema.slice(start, end)
}

describe('schema security invariants', () => {
  it('enables row level security on every client-facing table', () => {
    for (const t of [
      'profiles',
      'events',
      'registrations',
      'points_entries',
      'collab_requests',
      'attendance_disputes',
    ]) {
      expect(schema, `RLS missing on ${t}`).toMatch(
        new RegExp(`alter table public\\.${t}\\s+enable row level security`),
      )
    }
  })

  it('defines every table before the first function (safe under check_function_bodies)', () => {
    const lastTable = schema.lastIndexOf('create table if not exists')
    const firstFn = schema.indexOf('create or replace function')
    expect(lastTable).toBeLessThan(firstFn)
  })

  it('makes the points ledger write-protected from clients', () => {
    expect(schema).not.toMatch(/create policy \w+ on public\.points_entries\s+for insert/i)
    expect(schema).toMatch(
      /revoke insert, update, delete, truncate on public\.points_entries from anon, authenticated/,
    )
  })

  it('never grants the profiles.email column to clients', () => {
    expect(schema).toMatch(/revoke all on public\.profiles from anon, authenticated/)
    const grantSelectLines = schema
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^grant select \(/i.test(l))
    expect(grantSelectLines.length).toBeGreaterThan(0)
    for (const line of grantSelectLines) {
      expect(line, `email must not be granted: ${line}`).not.toMatch(/\bemail\b/)
    }
    // own-profile updates can only touch safe columns
    expect(schema).toMatch(
      /grant update \(full_name, house, society, city, bio\)\s+on public\.profiles to authenticated/,
    )
  })

  it('runs verify_checkin as a trusted definer function with an authorization gate', () => {
    const body = fnBody('verify_checkin')
    expect(body).toContain('security definer')
    expect(body).toContain("set_config('app.trusted', '1', true)")
    expect(body).toContain('is_admin()')
    expect(body).toContain('You are not authorised to check in attendees')
    // points flow through the ledger only (profiles.points is bumped by trigger)
    expect(body).not.toMatch(/points\s*=\s*points\s*\+/)
    // attendee + host awards are idempotent
    expect(body.match(/on conflict \(event_id, user_id\) do nothing/g)?.length).toBe(2)
  })

  it('short-circuits every guard in the trusted GUC context', () => {
    for (const g of [
      'guard_profile_mutation',
      'guard_event_mutation',
      'guard_registration',
      'guard_collab_mutation',
    ]) {
      expect(fnBody(g), `${g} must honour app.trusted`).toContain(
        "current_setting('app.trusted', true) = '1'",
      )
    }
  })

  it('bumps profiles.points only from the ledger trigger (no inflation path)', () => {
    expect(fnBody('bump_profile_points')).toMatch(/points = points \+ new\.points/)
    for (const name of ['verify_checkin', 'host_bonus', 'resolve_dispute']) {
      expect(fnBody(name), `${name} must not touch profiles.points directly`).not.toMatch(
        /points\s*=\s*points\s*\+/,
      )
    }
  })

  it('lets admins resolve disputes by granting the disputing attendee', () => {
    const body = fnBody('resolve_dispute')
    expect(body).toContain('is_admin()')
    expect(body).toMatch(/values \(d\.user_id, d\.event_id/)
    expect(body).not.toContain('host_bonus')
  })

  it('routes collaboration responses through the respond_collab RPC', () => {
    const body = fnBody('respond_collab')
    expect(body).toContain("set_config('app.trusted', '1', true)")
    expect(body).toContain('This request is not for your organisation.')
    expect(schema).not.toMatch(
      /create policy collab_update on public\.collab_requests\s+for update to authenticated using \(true\)/,
    )
    expect(schema).not.toMatch(
      /create policy collab_select on public\.collab_requests\s+for select to authenticated using \(true\)/,
    )
  })

  it('capacity-checks reactivation of a cancelled registration', () => {
    const body = fnBody('guard_registration')
    expect(body).toMatch(/old\.status = 'cancelled' and new\.status = 'registered'/)
    expect(body).toMatch(/status = 'registered' and id <> new\.id/)
    expect(body).toMatch(/Registration identity cannot change/)
  })

  it('lets logged-out visitors read approved events and safe profile columns', () => {
    expect(schema).toMatch(
      /create policy events_select on public\.events\s+for select to anon, authenticated/,
    )
    expect(schema).toMatch(
      /create policy profiles_select on public\.profiles\s+for select to anon, authenticated/,
    )
    expect(schema).toMatch(/grant select on public\.event_seats to anon, authenticated/)
  })

  it('revokes execute on privileged RPCs from anon', () => {
    const revokeIdx = schema.indexOf(
      'revoke execute on function public.verify_checkin(uuid, text)',
    )
    expect(revokeIdx).toBeGreaterThanOrEqual(0)
    const revokeChunk = schema.slice(revokeIdx, revokeIdx + 600)
    expect(revokeChunk).toContain('from public, anon')
    expect(revokeChunk).toContain('to authenticated')
  })

  it('keeps the registration uniqueness constraint (reactivation safety net)', () => {
    expect(schema).toMatch(/unique \(event_id, user_id\)/)
  })
})
