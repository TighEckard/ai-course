-- AI Coffee Club backend. Paste into Supabase > SQL Editor > Run. Safe to run once on a new project.

create table public.signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 5 and 200),
  slot text not null check (char_length(slot) < 60)
);

create table public.groups (
  id text primary key,
  name text not null,
  instructor text not null,
  slot text not null,
  zoom_link text
);

create table public.members (
  email text primary key,
  group_id text references public.groups(id),
  added_at timestamptz not null default now()
);

create table public.profiles (
  email text primary key,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar text check (char_length(avatar) < 80000),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  thread_email text not null,
  sender text not null check (sender in ('member','instructor')),
  body text not null check (char_length(body) between 1 and 2000)
);

create table public.activities (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('activity','demo','recording')),
  title text not null,
  body text,
  url text,
  group_id text references public.groups(id)  -- null = every group
);

create table public.events (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null,
  title text not null,
  group_id text references public.groups(id)
);

-- Helpers (security definer so policies can look at the members table safely).
create function public.is_member() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
create function public.my_group() returns text language sql stable security definer set search_path = public as $$
  select group_id from members where lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;
-- Names and pictures of the people in your own class. Nothing else is shared.
create function public.roster() returns table (display_name text, avatar text, is_me boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(p.display_name, 'New member'), p.avatar, lower(m.email) = lower(auth.jwt() ->> 'email')
  from members m left join profiles p on lower(p.email) = lower(m.email)
  where m.group_id = (select group_id from members where lower(email) = lower(auth.jwt() ->> 'email') limit 1)
  order by 3 desc, 1
$$;
grant execute on function public.is_member(), public.my_group(), public.roster() to authenticated;

alter table public.signups enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.activities enable row level security;
alter table public.events enable row level security;

create policy "anyone can sign up" on public.signups for insert to anon, authenticated with check (true);
create policy "see own membership" on public.members for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "members read groups" on public.groups for select to authenticated using (public.is_member());
create policy "own profile read" on public.profiles for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "own profile add" on public.profiles for insert to authenticated with check (lower(email) = lower(auth.jwt() ->> 'email') and public.is_member());
create policy "own profile edit" on public.profiles for update to authenticated using (lower(email) = lower(auth.jwt() ->> 'email')) with check (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "own messages read" on public.messages for select to authenticated using (lower(thread_email) = lower(auth.jwt() ->> 'email'));
create policy "send message" on public.messages for insert to authenticated with check (sender = 'member' and lower(thread_email) = lower(auth.jwt() ->> 'email') and public.is_member());
create policy "members read activities" on public.activities for select to authenticated using (public.is_member() and (group_id is null or group_id = public.my_group()));
create policy "members read events" on public.events for select to authenticated using (public.is_member() and (group_id is null or group_id = public.my_group()));

insert into public.groups (id, name, instructor, slot, zoom_link) values
  ('tue', 'Coffee & Basics',   'Rachel Moore', 'Tuesdays 7:00 PM Eastern',  'https://zoom.us/'),
  ('thu', 'Everyday Helpers',  'Emma Carter',  'Thursdays 7:00 PM Eastern', 'https://zoom.us/'),
  ('sat', 'Open Table',        'Sam Rivera',   'Saturdays 10:00 AM Eastern','https://zoom.us/');

-- Weekly classes through the end of 2026 (times are Eastern, daylight saving handled).
insert into public.events (starts_at, title, group_id)
select (d::date + time '19:00') at time zone 'America/New_York', g.name, g.id from public.groups g, generate_series(date '2026-10-27', date '2026-12-31', interval '7 days') d where g.id = 'tue';
insert into public.events (starts_at, title, group_id)
select (d::date + time '19:00') at time zone 'America/New_York', g.name, g.id from public.groups g, generate_series(date '2026-10-29', date '2026-12-31', interval '7 days') d where g.id = 'thu';
insert into public.events (starts_at, title, group_id)
select (d::date + time '10:00') at time zone 'America/New_York', g.name, g.id from public.groups g, generate_series(date '2026-10-31', date '2026-12-31', interval '7 days') d where g.id = 'sat';

insert into public.activities (kind, title, body) values
  ('activity', 'Write a thank-you note', 'Ask your AI helper to write a short, warm thank-you note to someone who helped you this week. Change anything you do not like, then send it.'),
  ('activity', 'Plan a day trip', 'Pick a town within an hour of home. Ask for a gentle day plan with a lunch stop and a short walk.'),
  ('demo', 'Is this email a scam?', 'Watch your teacher paste a suspicious email and ask the right questions. A recording link will appear here after the class.');
