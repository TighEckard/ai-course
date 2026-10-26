-- Planner: saves the owner's price / class size / teacher pay plan. Run once in Supabase > SQL Editor.
create table if not exists public.planner (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.planner enable row level security;
drop policy if exists "admin reads planner" on public.planner;
drop policy if exists "admin adds planner" on public.planner;
drop policy if exists "admin edits planner" on public.planner;
create policy "admin reads planner" on public.planner for select to authenticated using (public.is_admin());
create policy "admin adds planner" on public.planner for insert to authenticated with check (public.is_admin());
create policy "admin edits planner" on public.planner for update to authenticated using (public.is_admin()) with check (public.is_admin());
