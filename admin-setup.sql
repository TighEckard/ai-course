-- Owner admin access. Run once in Supabase > SQL Editor.
create table public.admins (email text primary key);
insert into public.admins (email) values ('hleckard@icloud.com');
alter table public.admins enable row level security;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
grant execute on function public.is_admin() to authenticated;

create policy "see own admin row" on public.admins for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "admin reads signups" on public.signups for select to authenticated using (public.is_admin());
create policy "admin reads members" on public.members for select to authenticated using (public.is_admin());
create policy "admin adds members" on public.members for insert to authenticated with check (public.is_admin());
create policy "admin edits members" on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin removes members" on public.members for delete to authenticated using (public.is_admin());
create policy "admin reads profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "admin reads messages" on public.messages for select to authenticated using (public.is_admin());
create policy "admin replies" on public.messages for insert to authenticated with check (public.is_admin() and sender = 'instructor');
create policy "admin reads groups" on public.groups for select to authenticated using (public.is_admin());
