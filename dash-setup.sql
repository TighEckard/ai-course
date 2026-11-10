-- Dashboard stats for riside.com/tigh. Aggregates only. Paste in Supabase > SQL Editor and Run.
-- Test accounts (owner, admins, Claude/funnel tests) are kept in dash_test_emails and excluded everywhere.
create table if not exists public.dash_test_emails (email text primary key, note text);
alter table public.dash_test_emails enable row level security;
insert into public.dash_test_emails (email, note) select lower(email), 'admin' from admins on conflict do nothing;
insert into public.dash_test_emails (email, note) select lower(email), 'owner member (not paid)' from members where email ilike 'eck%@gmail.com' on conflict do nothing;
insert into public.dash_test_emails (email, note) select lower(email), 'test signup' from signups where email ilike '%@example.com' or name ilike '%test%' or source in ('funneltest','selftest','internal') on conflict do nothing;

-- Session recordings (rrweb) for real visitors. Anyone can add a small chunk, only admins can read.
create table if not exists public.replay_chunks (id bigserial primary key, sid text not null, vid text, seq int not null, part int, parts int,
  created_at timestamptz not null default now(), data text not null);
create index if not exists replay_chunks_sid on public.replay_chunks (sid, seq);
create index if not exists replay_chunks_time on public.replay_chunks (created_at);
alter table public.replay_chunks enable row level security;
drop policy if exists "anyone adds replay" on public.replay_chunks;
drop policy if exists "admin reads replay" on public.replay_chunks;
drop policy if exists "admin deletes replay" on public.replay_chunks;
create policy "anyone adds replay" on public.replay_chunks for insert to anon, authenticated with check (length(data) < 400000 and seq between 0 and 2000 and length(sid) < 40);
create policy "admin reads replay" on public.replay_chunks for select to authenticated using (public.is_admin());
create policy "admin deletes replay" on public.replay_chunks for delete to authenticated using (public.is_admin());
-- keep storage small: the admin page removes recordings older than 60 days when it opens the replays
create or replace function public.replay_cleanup() returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return; end if;
  delete from replay_chunks where created_at < now() - interval '60 days';
end $$;
revoke all on function public.replay_cleanup() from public;
grant execute on function public.replay_cleanup() to authenticated;

create or replace function public.dash_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with tst as (select email from dash_test_emails),
  sg as (select * from signups where lower(email) not in (select email from tst) and email not ilike '%@example.com' and name not ilike '%test%'),
  mb as (select * from members where lower(email) not in (select email from tst)),
  a as (select * from analytics_events),
  bad as (select distinct sid from a where (city='San Jose' and os='Android' and device='mobile' and vw in (412,1024)) or src in ('selftest','internal','funneltest')),
  ses as (select sid, max(vid) vid, min(created_at) t, max(created_at) t2, max(coalesce(depth,0)) d, max(coalesce(dur,0)) du, bool_or(type='click') ck,
            count(*) filter (where type='view') pv, bool_or(type='signup') su, bool_or(type='view' and path like '/join%') jn,
            (array_agg(coalesce(src,'direct') order by created_at))[1] src, (array_agg(ref_host order by created_at))[1] ref,
            (array_agg(path order by created_at) filter (where type='view'))[1] land, max(device) dev, max(browser) br, max(os) os,
            max(country) country, max(region) region, max(city) city, bool_or(coalesce(new_visitor,false)) nv, max(utm_campaign) camp
          from a where sid not in (select sid from bad) group by sid),
  real as (select * from ses where d >= 25 or du >= 10000 or ck or su),
  r30 as (select * from real where t >= now() - interval '30 days'),
  rv as (select a.* from a join real using (sid)),
  agg as (select 1)
  select jsonb_build_object(
    'generated_at', now(),
    'real_rule', 'real = scrolled 25%+, stayed 10s+, clicked or signed up; bots, crawlers, testing and the owner removed',
    'real_visitors_1d', (select count(distinct vid) from real where t >= now() - interval '1 day'),
    'real_visitors_7d', (select count(distinct vid) from real where t >= now() - interval '7 days'),
    'real_visitors_30d', (select count(distinct vid) from r30),
    'real_visitors_total', (select count(distinct vid) from real),
    'real_sessions_7d', (select count(*) from real where t >= now() - interval '7 days'),
    'new_visitors_30d', (select count(distinct vid) from r30 where nv),
    'returning_visitors_30d', (select count(distinct vid) from r30 where not nv),
    'avg_time_sec_30d', (select round(avg(du)/1000.0) from r30),
    'avg_scroll_30d', (select round(avg(d)) from r30),
    'avg_pages_30d', (select round(avg(pv)::numeric,1) from r30),
    'bounce_pct_30d', (select round(100.0*count(*) filter (where pv<=1 and not ck)/nullif(count(*),0)) from r30),
    'real_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(t at time zone 'America/New_York','YYYY-MM-DD') d, count(distinct vid) n from r30 group by 1) q),
    'by_hour_et', (select coalesce(jsonb_object_agg(h, n), '{}') from (select to_char(t at time zone 'America/New_York','HH24') h, count(*) n from r30 group by 1) q),
    'real_sources_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select src s, count(distinct vid) n from r30 group by 1) q),
    'referrers_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(ref,'(none)') s, count(distinct vid) n from r30 group by 1 order by 2 desc limit 10) q),
    'campaigns_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select camp s, count(distinct vid) n from r30 where camp is not null group by 1) q),
    'landing_pages_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(land,'?') s, count(*) n from r30 group by 1 order by 2 desc limit 10) q),
    'real_pages_30d', (select coalesce(jsonb_object_agg(p, n), '{}') from (select path p, count(*) n from rv where type='view' and created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 12) q),
    'clicks_30d', (select coalesce(jsonb_object_agg(p, n), '{}') from (select coalesce(el,'?') p, count(*) n from rv where type='click' and created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 10) q),
    'devices_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(dev,'?') s, count(distinct vid) n from r30 group by 1) q),
    'browsers_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(br,'?') s, count(distinct vid) n from r30 group by 1) q),
    'os_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(os,'?') s, count(distinct vid) n from r30 group by 1) q),
    'countries_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(country,'?') s, count(distinct vid) n from r30 group by 1) q),
    'cities_30d', (select coalesce(jsonb_object_agg(s, n), '{}') from (select concat_ws(', ', city, region) s, count(distinct vid) n from r30 group by 1 order by 2 desc limit 12) q),
    'funnel_30d', jsonb_build_object('visitors', (select count(distinct vid) from r30), 'engaged', (select count(distinct vid) from r30 where d>=50 or du>=30000),
                    'opened_join', (select count(distinct vid) from r30 where jn), 'signed_up', (select count(*) from sg where created_at >= now() - interval '30 days' and slot <> 'roofing'),
                    'paid', (select count(*) from mb)),
    'recent_visits', (select coalesce(jsonb_agg(q), '[]') from (select sid, exists(select 1 from replay_chunks rc where rc.sid = real.sid) rec, t, round(du/1000.0) secs, d scroll, pv pages, src, land, dev, concat_ws(', ', city, region) place from real order by t desc limit 25) q),
    'recordings_7d', (select count(distinct rc.sid) from replay_chunks rc join real using (sid) where rc.created_at >= now() - interval '7 days'),
    'recordings_total', (select count(distinct rc.sid) from replay_chunks rc join real using (sid)),
    'real_views_1d', (select count(*) from rv where type='view' and created_at >= now() - interval '1 day'),
    'real_views_7d', (select count(*) from rv where type='view' and created_at >= now() - interval '7 days'),
    'real_views_30d', (select count(*) from rv where type='view' and created_at >= now() - interval '30 days'),
    'real_views_total', (select count(*) from rv where type='view'),
    'all_views_7d', (select count(*) from a where type='view' and created_at >= now() - interval '7 days'),
    'bot_views_7d', (select count(*) from a where type='view' and created_at >= now() - interval '7 days' and sid not in (select sid from real)),
    'signups_total', (select count(*) from sg where slot <> 'roofing'),
    'signups_7d', (select count(*) from sg where slot <> 'roofing' and created_at >= now() - interval '7 days'),
    'signups_1d', (select count(*) from sg where slot <> 'roofing' and created_at >= now() - interval '1 day'),
    'test_signups_excluded', (select count(*) from signups where slot <> 'roofing') - (select count(*) from sg where slot <> 'roofing'),
    'signups_by_source', (select coalesce(jsonb_object_agg(s, n), '{}') from (select coalesce(source,'direct') s, count(*) n from sg where slot <> 'roofing' group by 1) q),
    'signups_by_slot', (select coalesce(jsonb_object_agg(s, n), '{}') from (select slot s, count(*) n from sg where slot <> 'roofing' group by 1) q),
    'signups_by_day', (select coalesce(jsonb_object_agg(d, n), '{}') from (select to_char(created_at,'YYYY-MM-DD') d, count(*) n from sg where slot <> 'roofing' and created_at >= now() - interval '30 days' group by 1) q),
    'recent_signups', (select coalesce(jsonb_agg(q), '[]') from (select created_at, split_part(name,' ',1) as first_name, '***@' || split_part(email,'@',2) as email_domain, slot, coalesce(source,'direct') as source, (slot='roofing') as roofing from sg order by created_at desc limit 10) q),
    'paid_members', (select count(*) from mb),
    'test_members_excluded', (select count(*) from members) - (select count(*) from mb),
    'messages_total', (select count(*) from messages where sender='member' and lower(thread_email) not in (select email from tst)),
    'messages_7d', (select count(*) from messages where sender='member' and lower(thread_email) not in (select email from tst) and created_at >= now() - interval '7 days'),
    'messages_unanswered', (select count(*) from (select thread_email, max(created_at) filter (where sender='member') m, max(created_at) filter (where sender='instructor') i from messages where lower(thread_email) not in (select email from tst) group by 1) q where m is not null and (i is null or i < m)),
    'roofing_total', (select count(*) from sg where slot = 'roofing'),
    'roofing_7d', (select count(*) from sg where slot = 'roofing' and created_at >= now() - interval '7 days'),
    'roofing_real_visitors_7d', (select count(distinct vid) from rv where type='view' and path like '/roofing%' and created_at >= now() - interval '7 days')
  );
$$;
revoke all on function public.dash_stats() from public;
grant execute on function public.dash_stats() to anon, authenticated;
select (select count(*) from dash_test_emails) tests, public.dash_stats() - 'recent_signups' - 'recent_visits' - 'real_pages_30d' - 'cities_30d' - 'clicks_30d' - 'referrers_30d' - 'landing_pages_30d' as check;
