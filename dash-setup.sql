-- One-time: paste in Supabase > SQL Editor. Aggregate counts only (no emails/names). Powers the private dashboard.
create or replace function public.dash_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'generated_at', now(),
    'signups_total', (select count(*) from signups where slot <> 'roofing'),
    'signups_7d', (select count(*) from signups where slot <> 'roofing' and created_at >= now() - interval '7 days'),
    'signups_1d', (select count(*) from signups where slot <> 'roofing' and created_at >= now() - interval '1 day'),
    'signups_by_source', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(source,'direct') s, count(*) n from signups group by 1) q),
    'signups_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(created_at,'YYYY-MM-DD') d, count(*) n from signups where created_at >= now() - interval '30 days' group by 1) q),
    'recent_signups', (select coalesce(jsonb_agg(q), '[]') from (select created_at, split_part(name,' ',1) as first_name, '***@' || split_part(email,'@',2) as email_domain, slot, coalesce(source,'direct') as source, (slot='roofing') as roofing from signups order by created_at desc limit 10) q),
    'messages_total', (select count(*) from messages where sender='member'),
    'messages_7d', (select count(*) from messages where sender='member' and created_at >= now() - interval '7 days'),
    'messages_unanswered', (select count(*) from (select thread_email, max(created_at) filter (where sender='member') m, max(created_at) filter (where sender='instructor') i from messages group by 1) q where m is not null and (i is null or i < m)),
    'roofing_total', (select count(*) from signups where slot = 'roofing'),
    'roofing_7d', (select count(*) from signups where slot = 'roofing' and created_at >= now() - interval '7 days'),
    'roofing_views_7d', (select count(*) from analytics_events where type='view' and path like '/roofing%' and created_at >= now() - interval '7 days'),
    'paid_members', (select count(*) from members),
    'views_total', (select count(*) from analytics_events where type='view'),
    'views_1d', (select count(*) from analytics_events where type='view' and created_at >= now() - interval '1 day'),
    'views_7d', (select count(*) from analytics_events where type='view' and created_at >= now() - interval '7 days'),
    'visitors_7d', (select count(distinct vid) from analytics_events where type='view' and created_at >= now() - interval '7 days'),
    'views_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(created_at,'YYYY-MM-DD') d, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1) q),
    'views_by_source_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(src,'direct') s, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 15) q),
    'top_pages_30d', (select coalesce(jsonb_object_agg(p, n), '{}') from (select path p, count(*) n from analytics_events where type='view' and created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 10) q)
  );
$$;
revoke all on function public.dash_stats() from public;
grant execute on function public.dash_stats() to anon, authenticated;
