-- Dashboard stats (aggregate only). Paste in Supabase > SQL Editor and Run.
-- "Real people" = not the admin page's bot rule (San Jose Android data-center crawler, selftest/internal links)
-- AND the visit shows human behaviour: scrolled 25%+, stayed 10s+, or clicked something.
-- The owner's own browsers are never tracked (t.js skips anyone who opened /admin).
create or replace function public.dash_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with a as (select * from analytics_events),
  bad as (select distinct sid from a where (city='San Jose' and os='Android' and device='mobile' and vw in (412,1024)) or src in ('selftest','internal')),
  ses as (select sid, max(vid) vid, min(created_at) t, max(coalesce(depth,0)) d, max(coalesce(dur,0)) du, bool_or(type='click') ck,
            (array_agg(coalesce(src,'direct') order by created_at))[1] src
          from a where sid not in (select sid from bad) group by sid),
  real as (select * from ses where d >= 25 or du >= 10000 or ck),
  rv as (select a.* from a join real using (sid) where a.type='view')
  select jsonb_build_object(
    'generated_at', now(),
    'real_rule', 'scrolled 25%+, stayed 10s+ or clicked; bots and testing removed',
    'real_visitors_1d', (select count(distinct vid) from real where t >= now() - interval '1 day'),
    'real_visitors_7d', (select count(distinct vid) from real where t >= now() - interval '7 days'),
    'real_visitors_total', (select count(distinct vid) from real),
    'real_views_7d', (select count(*) from rv where created_at >= now() - interval '7 days'),
    'real_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(t,'YYYY-MM-DD') d, count(distinct vid) n from real where t >= now() - interval '30 days' group by 1) q),
    'real_sources_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select src s, count(distinct vid) n from real where t >= now() - interval '30 days' group by 1) q),
    'real_pages_30d', (select coalesce(jsonb_object_agg(p, n), '{}') from (select path p, count(*) n from rv where created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 10) q),
    'all_views_7d', (select count(*) from a where type='view' and created_at >= now() - interval '7 days'),
    'bot_views_7d', (select count(*) from a where type='view' and created_at >= now() - interval '7 days' and sid not in (select sid from real)),
    'signups_total', (select count(*) from signups where slot <> 'roofing'),
    'signups_7d', (select count(*) from signups where slot <> 'roofing' and created_at >= now() - interval '7 days'),
    'signups_1d', (select count(*) from signups where slot <> 'roofing' and created_at >= now() - interval '1 day'),
    'signups_by_source', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(source,'direct') s, count(*) n from signups where slot <> 'roofing' group by 1) q),
    'signups_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(created_at,'YYYY-MM-DD') d, count(*) n from signups where slot <> 'roofing' and created_at >= now() - interval '30 days' group by 1) q),
    'recent_signups', (select coalesce(jsonb_agg(q), '[]') from (select created_at, split_part(name,' ',1) as first_name, '***@' || split_part(email,'@',2) as email_domain, slot, coalesce(source,'direct') as source, (slot='roofing') as roofing from signups order by created_at desc limit 10) q),
    'messages_total', (select count(*) from messages where sender='member'),
    'messages_7d', (select count(*) from messages where sender='member' and created_at >= now() - interval '7 days'),
    'messages_unanswered', (select count(*) from (select thread_email, max(created_at) filter (where sender='member') m, max(created_at) filter (where sender='instructor') i from messages group by 1) q where m is not null and (i is null or i < m)),
    'roofing_total', (select count(*) from signups where slot = 'roofing'),
    'roofing_7d', (select count(*) from signups where slot = 'roofing' and created_at >= now() - interval '7 days'),
    'roofing_real_visitors_7d', (select count(distinct vid) from rv where path like '/roofing%' and created_at >= now() - interval '7 days'),
    'paid_members', (select count(*) from members)
  );
$$;
revoke all on function public.dash_stats() from public;
grant execute on function public.dash_stats() to anon, authenticated;
select public.dash_stats() - 'recent_signups' as check;
