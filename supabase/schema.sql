-- ============================================================
-- CollabSphere — PostgreSQL / Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Layout: extensions → enums → tables → indexes → helper
-- functions → guards/triggers → RPCs → RLS → privileges.
-- SQL-language helpers are defined AFTER the tables they
-- reference so the script also runs with
-- check_function_bodies = on.
--
-- Trusted-context pattern: security-definer functions that must
-- bypass the guards below first run
--     perform set_config('app.trusted', '1', true);
-- and every guard short-circuits when that transaction-local GUC
-- is set. PostgREST clients have no way to set it, so the guards
-- stay authoritative for all client-driven writes.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- enums
-- ------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'organizer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('pending','approved','rejected','cancelled','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('meetup','coworking','study-group','workshop','social','hackathon');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reg_status as enum ('registered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collab_status as enum ('pending','accepted','declined');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 80),
  email       text not null unique,
  house       text not null,
  society     text,
  city        text not null,
  role        user_role not null default 'student',
  points      integer not null default 0 check (points >= 0),
  bio         text,
  cohort      text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 6 and 120),
  description      text not null check (char_length(description) >= 30),
  type             event_type not null,
  status           event_status not null default 'pending',
  date             date not null,
  start_time       text not null,
  end_time         text not null,
  venue            text not null,
  city             text not null,
  lat              double precision not null,
  lng              double precision not null,
  capacity         integer not null check (capacity between 2 and 500),
  host_id          uuid not null references public.profiles(id) on delete cascade,
  house            text not null,
  society          text,
  collab_orgs      text[] not null default '{}',
  cohost_ids       uuid[] not null default '{}',
  points_value     integer not null default 25 check (points_value between 5 and 200),
  rejection_reason text,
  created_at       timestamptz not null default now(),
  constraint end_after_start check (end_time > start_time)
);

create index if not exists events_status_date_idx on public.events (status, date);
create index if not exists events_city_idx on public.events (city);
create index if not exists events_host_idx on public.events (host_id);

-- ------------------------------------------------------------
-- registrations  (unique => duplicate registration impossible)
-- ------------------------------------------------------------
create table if not exists public.registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        reg_status not null default 'registered',
  token         text not null default upper(replace(gen_random_uuid()::text, '-', '')),
  checked_in_at timestamptz,
  checkin_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists reg_event_idx on public.registrations (event_id);
create index if not exists reg_user_idx on public.registrations (user_id);
create unique index if not exists reg_active_checkin_uidx
  on public.registrations (event_id, user_id) where checked_in_at is not null;

-- ------------------------------------------------------------
-- points ledger (written only by verify_checkin / host_bonus /
-- resolve_dispute — never by clients; see privileges below)
-- ------------------------------------------------------------
create table if not exists public.points_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  points     integer not null check (points > 0),
  reason     text not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists points_user_idx on public.points_entries (user_id);

-- ------------------------------------------------------------
-- collaboration requests
-- ------------------------------------------------------------
create table if not exists public.collab_requests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  target_org   text not null,
  message      text not null,
  status       collab_status not null default 'pending',
  created_at   timestamptz not null default now()
);

create index if not exists collab_event_idx on public.collab_requests (event_id);

-- ------------------------------------------------------------
-- attendance disputes
-- ------------------------------------------------------------
create table if not exists public.attendance_disputes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  note        text not null,
  status      text not null default 'open' check (status in ('open','resolved')),
  resolution  text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- helper: is_admin()  (security definer avoids RLS recursion)
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_staff_for_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (e.host_id = auth.uid() or auth.uid() = any(e.cohost_ids))
  );
$$;

-- ------------------------------------------------------------
-- auto-create a profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, house, city, role, cohort)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'house', 'Ganga'),
    coalesce(new.raw_user_meta_data->>'city', 'Chennai'),
    'student',
    'BS Programme'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- guard: a student can never self-assign role, points or email
-- ------------------------------------------------------------
create or replace function public.guard_profile_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.trusted', true) = '1' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot change';
  end if;
  new.created_at := old.created_at;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Role changes require an administrator';
  end if;
  if new.points is distinct from old.points then
    raise exception 'Points are awarded server-side only';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email is managed by authentication';
  end if;
  if new.id <> auth.uid() then
    raise exception 'You may only modify your own profile';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_mutation();

create or replace function public.guard_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := 'student';
  new.points := 0;
  return new;
end;
$$;

drop trigger if exists profiles_insert_guard on public.profiles;
create trigger profiles_insert_guard
  before insert on public.profiles
  for each row execute function public.guard_profile_insert();

-- ------------------------------------------------------------
-- guard: only admins publish/reject, only host/admin edit
-- ------------------------------------------------------------
create or replace function public.guard_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.trusted', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.host_id := auth.uid();
    new.status   := 'pending';
    new.cohost_ids := '{}';
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Event id cannot change';
  end if;
  if new.host_id is distinct from old.host_id then
    raise exception 'Event host cannot change';
  end if;
  new.created_at := old.created_at;

  if not public.is_admin() and old.host_id <> auth.uid() then
    raise exception 'Only the host or an administrator can edit this event';
  end if;

  if new.status is distinct from old.status
     and new.status in ('approved','rejected')
     and not public.is_admin() then
    raise exception 'Only an administrator can approve or reject events';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason
     and not public.is_admin() then
    new.rejection_reason := old.rejection_reason;
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard on public.events;
create trigger events_guard
  before insert or update on public.events
  for each row execute function public.guard_event_mutation();

-- ------------------------------------------------------------
-- registrations guards
-- ------------------------------------------------------------
create or replace function public.guard_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  seats integer;
begin
  if current_setting('app.trusted', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'registered';
    new.checked_in_at := null;
    new.checkin_by := null;
    new.token := upper(replace(gen_random_uuid()::text, '-', ''));

    select * into ev from public.events where id = new.event_id;
    if not found then raise exception 'Event not found'; end if;
    if ev.status <> 'approved' then raise exception 'Event is not open for registration'; end if;
    if ev.date < current_date then raise exception 'Event has already passed'; end if;

    select count(*) into seats from public.registrations
      where event_id = new.event_id and status = 'registered';
    if seats >= ev.capacity then raise exception 'Event is at full capacity'; end if;
    return new;
  end if;

  -- UPDATE ------------------------------------------------------------------
  if new.id <> old.id
     or new.event_id <> old.event_id
     or new.user_id <> old.user_id then
    raise exception 'Registration identity cannot change';
  end if;

  if new.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'You may only change your own registration';
  end if;

  -- reactivating a cancelled registration mirrors the demo server:
  -- a fresh QR token, a cleared check-in, and a fresh capacity check
  if old.status = 'cancelled' and new.status = 'registered' then
    select * into ev from public.events where id = new.event_id;
    if not found then raise exception 'Event not found'; end if;
    if ev.status <> 'approved' then raise exception 'Event is not open for registration'; end if;
    if ev.date < current_date then raise exception 'Event has already passed'; end if;

    select count(*) into seats from public.registrations
      where event_id = new.event_id and status = 'registered' and id <> new.id;
    if seats >= ev.capacity then raise exception 'Event is at full capacity'; end if;

    new.token := upper(replace(gen_random_uuid()::text, '-', ''));
    new.checked_in_at := null;
    new.checkin_by := null;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' then
      raise exception 'Unsupported registration change';
    end if;
    select * into ev from public.events where id = new.event_id;
    if found and ev.status = 'completed' then
      raise exception 'This event is already completed';
    end if;
  end if;

  if old.checked_in_at is not null then
    raise exception 'Attendance already recorded';
  end if;
  if new.checked_in_at is not null then
    raise exception 'Use verify_checkin() to record attendance';
  end if;

  if new.token is distinct from old.token then
    new.token := old.token;
  end if;
  new.checkin_by := old.checkin_by;
  return new;
end;
$$;

drop trigger if exists registrations_guard on public.registrations;
create trigger registrations_guard
  before insert or update on public.registrations
  for each row execute function public.guard_registration();

-- ------------------------------------------------------------
-- guard: only the target organisation (or an admin) may respond
-- to a collaboration request, and only the response field moves
-- ------------------------------------------------------------
create or replace function public.guard_collab_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.trusted', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.requested_by is distinct from auth.uid() then
      raise exception 'You may only send requests as yourself';
    end if;
    if new.status is distinct from 'pending' then
      raise exception 'New collaboration requests must be pending';
    end if;
    return new;
  end if;

  if new.event_id is distinct from old.event_id
     or new.requested_by is distinct from old.requested_by
     or new.target_org is distinct from old.target_org
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the response may be changed';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'Already responded.';
    end if;
    if new.status not in ('accepted','declined') then
      raise exception 'Unsupported response';
    end if;
    if not public.is_admin() and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.house = old.target_org or p.society = old.target_org)
    ) then
      raise exception 'This request is not for your organisation.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists collab_requests_guard on public.collab_requests;
create trigger collab_requests_guard
  before insert or update on public.collab_requests
  for each row execute function public.guard_collab_mutation();

-- ------------------------------------------------------------
-- every ledger entry automatically bumps the denormalised
-- profiles.points column (single source of truth = the ledger)
-- ------------------------------------------------------------
create or replace function public.bump_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.trusted', '1', true);
  update public.profiles set points = points + new.points where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists points_bump on public.points_entries;
create trigger points_bump
  after insert on public.points_entries
  for each row execute function public.bump_profile_points();

-- ------------------------------------------------------------
-- server-side check-in: verification + points, single transaction
-- ------------------------------------------------------------
create or replace function public.verify_checkin(p_event_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  reg public.registrations%rowtype;
  att public.profiles%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'unauthenticated', 'message', 'Not signed in.');
  end if;

  perform set_config('app.trusted', '1', true);

  select * into ev from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Event not found.');
  end if;

  if not public.is_admin()
     and ev.host_id <> auth.uid()
     and auth.uid() <> all(ev.cohost_ids) then
    return jsonb_build_object('ok', false, 'code', 'forbidden',
      'message', 'You are not authorised to check in attendees.');
  end if;

  select * into reg from public.registrations
    where event_id = p_event_id and upper(token) = upper(trim(p_token))
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad_token',
      'message', 'QR token is not valid for this event.');
  end if;
  if reg.status <> 'registered' then
    return jsonb_build_object('ok', false, 'code', 'cancelled',
      'message', 'This registration was cancelled.');
  end if;

  select * into att from public.profiles where id = reg.user_id;

  if reg.checked_in_at is not null then
    return jsonb_build_object(
      'ok', false, 'already', true, 'code', 'duplicate',
      'message', 'Already checked in at ' || to_char(reg.checked_in_at, 'HH24:MI') || '.',
      'attendee', jsonb_build_object('full_name', att.full_name, 'house', att.house, 'city', att.city)
    );
  end if;

  update public.registrations
    set checked_in_at = now(), checkin_by = auth.uid()
    where id = reg.id;

  -- attendee points (the points_bump trigger updates profiles.points)
  insert into public.points_entries (user_id, event_id, points, reason)
  values (reg.user_id, p_event_id, ev.points_value, 'Verified check-in · ' || ev.title)
  on conflict (event_id, user_id) do nothing;

  -- host bonus: the first authorised scan by the host or an admin
  -- credits the organiser once per event (demo-server parity)
  if ev.host_id = auth.uid() or public.is_admin() then
    insert into public.points_entries (user_id, event_id, points, reason)
    values (ev.host_id, p_event_id, ev.points_value, 'Hosted verified event · ' || ev.title)
    on conflict (event_id, user_id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Checked in — ' || ev.points_value || ' points awarded.',
    'attendee', jsonb_build_object('full_name', att.full_name, 'house', att.house, 'city', att.city)
  );
end;
$$;

create or replace function public.host_bonus(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare ev public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if not public.is_admin() and not exists (
    select 1 from public.events e where e.id = p_event_id and e.host_id = auth.uid()
  ) then
    raise exception 'Only the host or an administrator can request the hosting bonus';
  end if;

  select * into ev from public.events where id = p_event_id and status = 'completed';
  if not found then return; end if;

  insert into public.points_entries (user_id, event_id, points, reason)
  values (ev.host_id, p_event_id, ev.points_value, 'Hosted verified event · ' || ev.title)
  on conflict (event_id, user_id) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- respond to a collaboration request (accepting co-hosts the
-- responder onto the event)
-- ------------------------------------------------------------
create or replace function public.respond_collab(p_collab_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c public.collab_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if p_status not in ('accepted','declined') then
    raise exception 'Unsupported response';
  end if;

  perform set_config('app.trusted', '1', true);

  select * into c from public.collab_requests where id = p_collab_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if c.status <> 'pending' then raise exception 'Already responded.'; end if;

  if not public.is_admin() and not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.house = c.target_org or p.society = c.target_org)
  ) then
    raise exception 'This request is not for your organisation.';
  end if;

  update public.collab_requests
    set status = p_status::public.collab_status
    where id = p_collab_id;

  if p_status = 'accepted' then
    update public.events e
      set collab_orgs = case
            when c.target_org = any(e.collab_orgs) then e.collab_orgs
            else array_append(e.collab_orgs, c.target_org)
          end,
          cohost_ids = case
            when auth.uid() = any(e.cohost_ids) then e.cohost_ids
            else array_append(e.cohost_ids, auth.uid())
          end
      where e.id = c.event_id;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- admin resolves an attendance dispute; granting credits the
-- *disputing attendee* once (never the host)
-- ------------------------------------------------------------
create or replace function public.resolve_dispute(p_dispute_id uuid, p_resolution text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.attendance_disputes%rowtype;
  ev public.events%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_resolution not in ('grant','deny') then
    raise exception 'Resolution must be grant or deny.';
  end if;

  select * into d from public.attendance_disputes where id = p_dispute_id for update;
  if not found then raise exception 'Dispute not found.'; end if;
  if d.status = 'resolved' then raise exception 'This dispute is already resolved.'; end if;

  update public.attendance_disputes
    set status = 'resolved', resolution = p_resolution
    where id = p_dispute_id;

  if p_resolution = 'grant' then
    select * into ev from public.events where id = d.event_id;
    if found then
      insert into public.points_entries (user_id, event_id, points, reason)
      values (d.user_id, d.event_id, ev.points_value, 'Manual admin grant · ' || ev.title)
      on conflict (event_id, user_id) do nothing;
    end if;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.events             enable row level security;
alter table public.registrations      enable row level security;
alter table public.points_entries     enable row level security;
alter table public.collab_requests    enable row level security;
alter table public.attendance_disputes enable row level security;

-- profiles: rows are readable everywhere (leaderboard, profile
-- pages, event cards); the email column is never granted — see
-- the privileges section below.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- events: logged-out visitors read approved events only
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to anon, authenticated
  using (
    status = 'approved'
    or (auth.uid() is not null and (host_id = auth.uid() or public.is_admin()))
  );

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated with check (host_id = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated using (host_id = auth.uid() or public.is_admin());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated using (public.is_admin());

-- registrations
drop policy if exists regs_select on public.registrations;
create policy regs_select on public.registrations
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_staff_for_event(event_id)
  );

drop policy if exists regs_insert on public.registrations;
create policy regs_insert on public.registrations
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists regs_update on public.registrations;
create policy regs_update on public.registrations
  for update to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists regs_delete on public.registrations;
create policy regs_delete on public.registrations
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- points ledger: read-only for clients
drop policy if exists points_select on public.points_entries;
create policy points_select on public.points_entries
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- collab requests: visible and answerable only by the target
-- organisation's members (house/society) or an admin
drop policy if exists collab_select on public.collab_requests;
create policy collab_select on public.collab_requests
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.house = collab_requests.target_org or p.society = collab_requests.target_org)
    )
  );

drop policy if exists collab_insert on public.collab_requests;
create policy collab_insert on public.collab_requests
  for insert to authenticated with check (requested_by = auth.uid());

drop policy if exists collab_update on public.collab_requests;
create policy collab_update on public.collab_requests
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.house = collab_requests.target_org or p.society = collab_requests.target_org)
    )
  );

-- disputes
drop policy if exists disputes_select on public.attendance_disputes;
create policy disputes_select on public.attendance_disputes
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists disputes_insert on public.attendance_disputes;
create policy disputes_insert on public.attendance_disputes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists disputes_update on public.attendance_disputes;
create policy disputes_update on public.attendance_disputes
  for update to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- event_seats: aggregate attendance counts. The view runs with
-- its owner's (postgres) rights, so it bypasses registration
-- RLS and gives every visitor — including logged-out ones —
-- correct attendee_count / seats_left numbers.
-- ------------------------------------------------------------
drop view if exists public.event_seats;
create view public.event_seats as
  select
    e.id as event_id,
    coalesce(count(r.id) filter (where r.status = 'registered'), 0)::bigint as attendee_count
  from public.events e
  left join public.registrations r on r.event_id = e.id
  group by e.id;

grant select on public.event_seats to anon, authenticated;

-- ------------------------------------------------------------
-- privileges
-- Supabase grants ALL table privileges to anon/authenticated by
-- default; these revocations plus the column grants are what
-- keep emails and the points ledger unreachable from clients.
-- ------------------------------------------------------------

-- profiles: clients see safe columns only; email is never granted
-- (the app reads the signed-in user's own email from the auth
-- session instead). Updates can touch profile fields, never
-- role/points/email/id (enforced by the guard trigger above too).
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, house, society, city, role, points, bio, cohort, created_at)
  on public.profiles to anon, authenticated;
grant update (full_name, house, society, city, bio)
  on public.profiles to authenticated;

-- points ledger: clients may only read their own rows
revoke insert, update, delete, truncate on public.points_entries from anon, authenticated;

-- no client-driven deletes anywhere (the demo has none either)
revoke delete on public.profiles, public.events, public.registrations,
  public.collab_requests, public.attendance_disputes from anon, authenticated;

-- privileged RPCs: authenticated only
revoke execute on function public.verify_checkin(uuid, text),
  public.respond_collab(uuid, text),
  public.resolve_dispute(uuid, text),
  public.host_bonus(uuid)
  from public, anon;
grant execute on function public.verify_checkin(uuid, text),
  public.respond_collab(uuid, text),
  public.resolve_dispute(uuid, text),
  public.host_bonus(uuid)
  to authenticated;

-- ------------------------------------------------------------
-- bootstrap the first admin (run AFTER signing up through the
-- app). The DO block sets the trusted GUC so the profile guard
-- allows the role change:
-- ------------------------------------------------------------
-- do $$
-- begin
--   perform set_config('app.trusted', '1', true);
--   update public.profiles set role = 'admin' where email = 'admin@collabsphere.in';
-- end $$;
