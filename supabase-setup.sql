-- AI Coffee Club backend. Paste into Supabase > SQL Editor > Run.
create table if not exists public.signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 5 and 200),
  slot text not null check (char_length(slot) < 60)
);
create table if not exists public.members (
  email text primary key,
  added_at timestamptz not null default now()
);
create table if not exists public.content (
  key text primary key,
  value text not null
);
alter table public.signups enable row level security;
alter table public.members enable row level security;
alter table public.content enable row level security;

-- Visitors can add a signup but never read the list.
create policy "anyone can sign up" on public.signups for insert to anon, authenticated with check (true);

-- A signed-in person can see only their own membership row.
create policy "see own membership" on public.members for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Only paying members can read class content (Zoom link, recordings).
create policy "members read content" on public.content for select to authenticated
  using (exists (select 1 from public.members m where lower(m.email) = lower(auth.jwt() ->> 'email')));

insert into public.content (key, value) values
  ('next_class', 'Tuesday, 7:00 PM Eastern'),
  ('zoom_link', 'https://zoom.us/'),
  ('recordings', '[]')
on conflict (key) do nothing;
