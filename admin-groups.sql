create policy "admin edits groups" on public.groups for update to authenticated using (public.is_admin()) with check (public.is_admin());
