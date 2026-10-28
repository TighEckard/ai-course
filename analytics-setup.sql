-- Visitor analytics. Run once in Supabase > SQL Editor.
-- Anyone can insert a tracking event; only admins can read (via is_admin()).

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  vid text not null check (char_length(vid) <= 40),
  sid text not null check (char_length(sid) <= 40),
  type text not null check (type in ('view','click','scroll','signup')),
  path text check (char_length(path) <= 120),
  src text check (char_length(src) <= 100),
  ref_host text check (char_length(ref_host) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  new_visitor boolean,
  device text check (device in ('mobile','tablet','desktop')),
  browser text check (char_length(browser) <= 30),
  os text check (char_length(os) <= 30),
  vw int check (vw between 0 and 20000),
  vh int check (vh between 0 and 20000),
  country text check (char_length(country) <= 60),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 80),
  depth smallint check (depth between 0 and 100),
  dur int check (dur between 0 and 86400000),
  x smallint check (x between 0 and 1000),
  y int check (y between 0 and 100000),
  el text check (char_length(el) <= 80)
);
create index if not exists analytics_events_created on public.analytics_events (created_at);
create index if not exists analytics_events_type_created on public.analytics_events (type, created_at);

alter table public.analytics_events enable row level security;
drop policy if exists "anyone adds analytics" on public.analytics_events;
drop policy if exists "admin reads analytics" on public.analytics_events;
create policy "anyone adds analytics" on public.analytics_events for insert to anon, authenticated with check (true);
create policy "admin reads analytics" on public.analytics_events for select to authenticated using (public.is_admin());
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

-- One call returns every number the Analytics tab shows.
create or replace function public.analytics_summary(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d int := greatest(1, least(coalesce(p_days, 30), 365));
  since timestamptz := now() - make_interval(days => d);
  res jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with e as (select * from analytics_events where created_at >= since),
  sess as (
    select distinct on (sid) sid, vid, created_at as t0, coalesce(src,'direct') as src, utm_campaign,
           device, browser, os, country, region, city, coalesce(new_visitor,false) as new_visitor
    from e where type = 'view' order by sid, created_at
  ),
  fl as (
    select sid,
      count(*) filter (where type='view') as pages,
      bool_or(type='view' and path='/join') as joined,
      bool_or(type='signup') as signed,
      coalesce(sum(dur),0) as dur
    from e group by sid
  ),
  s as (select sess.*, fl.pages, fl.joined, fl.signed, fl.dur from sess join fl using (sid))
  select jsonb_build_object(
    'days', d,
    'totals', (select jsonb_build_object(
        'views', (select count(*) from e where type='view'),
        'sessions', count(*),
        'visitors', count(distinct vid),
        'new_visitors', count(distinct vid) filter (where new_visitor),
        'bounce_pct', coalesce(round(100.0 * count(*) filter (where pages <= 1) / nullif(count(*),0)), 0),
        'avg_sec', coalesce(round(avg(dur) filter (where dur > 0) / 1000.0), 0)
      ) from s),
    'live', (select count(distinct sid) from analytics_events where created_at >= now() - interval '5 minutes'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', to_char(g, 'YYYY-MM-DD'),
        'views', coalesce(v.views,0), 'sessions', coalesce(v.sessions,0)) order by g), '[]')
      from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') g
      left join (select date_trunc('day', created_at) dd, count(*) views, count(distinct sid) sessions
                 from e where type='view' group by 1) v on v.dd = g),
    'funnel', jsonb_build_object(
        'sessions', (select count(*) from s),
        'joined', (select count(*) from s where joined),
        'signed', (select count(*) from s where signed),
        'signups_total', (select count(*) from signups where created_at >= since),
        'members_total', (select count(*) from members)),
    'sources', (select coalesce(jsonb_agg(r order by (r->>'sessions')::int desc), '[]') from (
        select jsonb_build_object('name', src, 'sessions', count(*), 'joined', count(*) filter (where joined),
               'signed', count(*) filter (where signed)) r from s group by src order by count(*) desc limit 15) q),
    'campaigns', (select coalesce(jsonb_agg(r order by (r->>'sessions')::int desc), '[]') from (
        select jsonb_build_object('name', utm_campaign, 'sessions', count(*), 'signed', count(*) filter (where signed)) r
        from s where utm_campaign is not null group by utm_campaign order by count(*) desc limit 15) q),
    'countries', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', coalesce(country,'Unknown'), 'n', count(*)) r from s group by country order by count(*) desc limit 15) q),
    'regions', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', coalesce(region,'Unknown') || coalesce(', ' || country,''), 'n', count(*)) r
        from s where region is not null group by region, country order by count(*) desc limit 15) q),
    'cities', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', city || coalesce(', ' || region,''), 'n', count(*)) r
        from s where city is not null group by city, region order by count(*) desc limit 15) q),
    'devices', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', coalesce(device,'Unknown'), 'n', count(*)) r from s group by device) q),
    'browsers', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', coalesce(browser,'Other'), 'n', count(*)) r from s group by browser order by count(*) desc limit 8) q),
    'systems', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', coalesce(os,'Other'), 'n', count(*)) r from s group by os order by count(*) desc limit 8) q),
    'pages', (select coalesce(jsonb_agg(r order by (r->>'views')::int desc), '[]') from (
        select jsonb_build_object('name', v.path, 'views', v.views, 'avg_depth', coalesce(sc.avg_depth,0),
               'reach50', coalesce(sc.reach50,0), 'reach90', coalesce(sc.reach90,0), 'avg_sec', coalesce(sc.avg_sec,0)) r
        from (select path, count(*) views from e where type='view' group by path) v
        left join (select path, round(avg(depth)) avg_depth,
                          round(100.0 * count(*) filter (where depth >= 50) / count(*)) reach50,
                          round(100.0 * count(*) filter (where depth >= 90) / count(*)) reach90,
                          round(avg(dur) / 1000.0) avg_sec
                   from e where type='scroll' group by path) sc on sc.path = v.path
        order by v.views desc limit 12) q),
    'recent', (select coalesce(jsonb_agg(r order by (r->>'t')::text desc), '[]') from (
        select jsonb_build_object('t', t0, 'src', src, 'country', country, 'region', region, 'city', city,
               'device', device, 'browser', browser, 'pages', pages, 'joined', joined, 'signed', signed) r
        from s order by t0 desc limit 25) q)
  ) into res;
  return res;
end $$;
revoke all on function public.analytics_summary(int) from public, anon;
grant execute on function public.analytics_summary(int) to authenticated;

-- Click points for the heatmap. x is 0 to 1000 across the page width, y is pixels from the top.
create or replace function public.analytics_clicks(p_path text, p_days int default 30, p_mobile boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days,30), 365))); res jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with c as (
    select x, y, el from analytics_events
    where type = 'click' and path = p_path and created_at >= since and x is not null and y is not null
      and ((vw < 700) = coalesce(p_mobile,false))
    order by created_at desc limit 5000)
  select jsonb_build_object(
    'total', (select count(*) from c),
    'maxy', (select coalesce(max(y),0) from c),
    'pts', (select coalesce(jsonb_agg(jsonb_build_array(x, y)), '[]') from c),
    'top', (select coalesce(jsonb_agg(r order by (r->>'n')::int desc), '[]') from (
        select jsonb_build_object('name', el, 'n', count(*)) r from c where el is not null and el <> '' group by el order by count(*) desc limit 10) q)
  ) into res;
  return res;
end $$;
revoke all on function public.analytics_clicks(text, int, boolean) from public, anon;
grant execute on function public.analytics_clicks(text, int, boolean) to authenticated;
