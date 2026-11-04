-- Read-only public stats: aggregate counts only, no emails or names. Run once in Supabase > SQL Editor.
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'generated_at', now(),
    'signups_total', (select count(*) from signups),
    'signups_7d', (select count(*) from signups where created_at >= now() - interval '7 days'),
    'signups_by_source', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(source,'direct') s, count(*) n from signups group by 1) q),
    'signups_by_slot', (select coalesce(jsonb_object_agg(s, n), '{}') from (select slot s, count(*) n from signups group by 1) q),
    'paid_members', (select count(*) from members),
    'views_total', (select count(*) from analytics_events where type='view'),
    'views_7d', (select count(*) from analytics_events where type='view' and created_at >= now() - interval '7 days'),
    'sessions_7d', (select count(distinct sid) from analytics_events where type='view' and created_at >= now() - interval '7 days'),
    'visitors_7d', (select count(distinct vid) from analytics_events where type='view' and created_at >= now() - interval '7 days'),
    'views_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(created_at,'YYYY-MM-DD') d, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1) q),
    'views_by_source_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(src,'direct') s, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1) q),
    'top_pages_30d', (select coalesce(jsonb_object_agg(p, n), '{}') from (select path p, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 15) q)
  );
$$;
revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
