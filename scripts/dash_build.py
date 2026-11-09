#!/usr/bin/env python3
"""Builds dash/<token>/data.json from Supabase, YouTube RSS, posts.json and dash/feed/social.json. Each source fails soft."""
import json, os, re, sys, urllib.request, datetime, glob
import xml.etree.ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(ROOT, 'tigh')
SB = 'https://yhsxxblilclylzgejehk.supabase.co/rest/v1/rpc/dash_stats'
KEY = 'sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj'
def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30).read().decode()
d = {'generated_at': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + 'Z', 'errors': {}}
try:
    d['site'] = json.loads(get(SB, b'{}', {'apikey': KEY, 'Content-Type': 'application/json'}))
except Exception as e:
    d['site'] = None; d['errors']['site'] = 'Site numbers need the one-time dash-setup.sql paste in Supabase'
try:
    html = get('https://www.youtube.com/@risidelearning', headers={'User-Agent': 'Mozilla/5.0', 'Cookie': 'CONSENT=YES+1'})
    cid = re.search(r'"channelId":"(UC[\w-]{22})"', html) or re.search(r'channel_id=(UC[\w-]{22})', html)
    xml = get('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid.group(1))
    ns = {'a': 'http://www.w3.org/2005/Atom', 'm': 'http://search.yahoo.com/mrss/', 'y': 'http://www.youtube.com/xml/schemas/2015'}
    vids = []
    for e in ET.fromstring(xml).findall('a:entry', ns):
        st = e.find('m:group/m:community/m:statistics', ns)
        vids.append({'title': e.find('a:title', ns).text, 'url': e.find('a:link', ns).get('href'),
                     'published': e.find('a:published', ns).text, 'views': int(st.get('views')) if st is not None else 0,
                     'likes': int(e.find('m:group/m:community/m:starRating', ns).get('count'))})
    d['youtube'] = {'total_views': sum(v['views'] for v in vids), 'videos': len(vids),
                    'likes': sum(v['likes'] for v in vids), 'top': sorted(vids, key=lambda v: -v['views'])[:3], 'recent': vids[:5], 'all': vids}
    # Full catalog: RSS only lists the latest 15, so read every Short/video id and its exact view count.
    ids = [re.search(r'v=([\w-]{11})', v['url']).group(1) for v in vids if 'v=' in v['url']]
    for tab in ('shorts', 'videos'):
        try:
            pg = get('https://www.youtube.com/@risidelearning/' + tab, headers={'User-Agent': 'Mozilla/5.0', 'Cookie': 'CONSENT=YES+1', 'Accept-Language': 'en-US'})
            for m in re.findall(r'"(?:videoId|entityId)":"(?:shorts-shelf-item-)?([\w-]{11})"', pg):
                if m not in ids: ids.append(m)
        except Exception as e:
            d['errors']['youtube_catalog_' + tab] = str(e)[:80]
    cat = []
    for vid in ids[:120]:
        try:
            w = get('https://www.youtube.com/watch?v=' + vid, headers={'User-Agent': 'Mozilla/5.0', 'Cookie': 'CONSENT=YES+1', 'Accept-Language': 'en-US'})
            vc = re.search(r'"videoDetails":\{.*?"viewCount":"(\d+)"', w, re.S)
            ch = re.search(r'"channelId":"(UC[\w-]{22})"', w)
            if not vc or (ch and ch.group(1) != cid.group(1)): continue
            t = re.search(r'"videoDetails":\{.*?"title":"(.*?)","', w, re.S)
            pub = re.search(r'"publishDate":"([^"]+)"', w)
            lk = re.search(r'"likeCount":"?(\d+)', w) or re.search(r'([\d,]+) likes', w)
            cat.append({'id': vid, 'title': json.loads('"' + t.group(1) + '"') if t else vid, 'url': 'https://youtube.com/shorts/' + vid,
                        'views': int(vc.group(1)), 'likes': int(lk.group(1).replace(',', '')) if lk else None,
                        'published': pub.group(1) if pub else None})
        except Exception:
            pass
    if cat:
        rss_sum = d['youtube']['total_views']
        d['youtube'].update({'total_views': sum(v['views'] for v in cat), 'videos': len(cat), 'catalog': True,
                             'likes': sum(v['likes'] or 0 for v in cat), 'top': sorted(cat, key=lambda v: -v['views'])[:3]})
        d.setdefault('checks', []).append({'name': 'YouTube views', 'ok': d['youtube']['total_views'] >= rss_sum,
            'detail': '%d videos read one by one = %d views (latest-15 feed alone: %d)' % (len(cat), d['youtube']['total_views'], rss_sum)})
    else:
        d['errors']['youtube_catalog'] = 'Could only read the latest 15 videos; total views is too low'
except Exception as e:
    d['youtube'] = None; d['errors']['youtube'] = str(e)[:120]
try:
    from zoneinfo import ZoneInfo
    sch = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'schedule.json')))
    tz = ZoneInfo(sch['tz']); now = datetime.datetime.now(tz); today = now.date().isoformat()
    soc = {}
    try: soc = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'social.json')))
    except Exception: pass
    norm = lambda t: re.sub(r'[^a-z0-9]', '', (t or '').lower())
    yt_today = []
    for v in (d.get('youtube') or {}).get('all', []):
        t = datetime.datetime.fromisoformat(v['published'].replace('Z', '+00:00')).astimezone(tz)
        if t.date().isoformat() == today: yt_today.append((norm(v['title']), t))
    plan = {}
    mf = os.path.join(ROOT, 'social', today, 'manifest.json')
    items = json.load(open(mf))['videos'] if os.path.exists(mf) else []
    for it in items:
        h, m = map(int, sch['slots'].get(it.get('slot'), '12:00').split(':'))
        when = now.replace(hour=h, minute=m, second=0, microsecond=0)
        for pf in it['platforms']:
            for plat in sch['platform_of'].get(pf, []):
                title = it.get('yt_title') or it.get('pin_title') or (it.get('caption_meta') or it['id']).split('. ')[0][:70]
                plan.setdefault(plat, []).append({'title': title, 'id': it['id'], 'when': when.isoformat(), 'slot': it.get('slot')})
    reported = (soc.get('posted_today') or {}) if soc.get('posted_date') == today else {}
    out = {}
    for plat, lst in plan.items():
        lst.sort(key=lambda x: x['when'])
        for x in lst:
            if plat == 'youtube':
                x['done'] = any(norm(x['id']) in n or norm(x['title'])[:25] in n for n, _ in yt_today)
                x['verified'] = bool(d.get('youtube'))
            elif plat in reported:
                x['done'] = x['id'] in reported[plat]; x['verified'] = True
            else:
                x['done'] = None; x['verified'] = False
            x['due'] = datetime.datetime.fromisoformat(x['when']) <= now
        nxt = next((x for x in lst if x['done'] is not True), None)
        out[plat] = {'planned': len(lst), 'done': sum(1 for x in lst if x['done']), 'verified': all(x['verified'] for x in lst),
                     'overdue': sum(1 for x in lst if x['due'] and x['done'] is False), 'items': lst, 'next': nxt}
    if 'youtube' not in plan and yt_today:
        out['youtube'] = {'planned': 0, 'done': len(yt_today), 'verified': True, 'overdue': 0, 'items': [], 'next': None}
    d['posting'] = {'date': today, 'now_et': now.strftime('%-I:%M %p'), 'today': out,
                    'yt_by_day': {}, 'comments_by_day': soc.get('comments_by_day', {})}
    for v in (d.get('youtube') or {}).get('all', []):
        k = v['published'][:10]; d['posting']['yt_by_day'][k] = d['posting']['yt_by_day'].get(k, 0) + 1
except Exception as e:
    d['posting'] = None; d['errors']['posting'] = 'Posting check failed: ' + str(e)[:100]
try:
    d['social'] = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'social.json')))
except Exception as e:
    d['social'] = None
ck = d.setdefault('checks', [])
st = d.get('site') or {}
if st:
    ck.append({'name': 'Website visitors', 'ok': st.get('real_visitors_7d', 0) <= st.get('all_views_7d', 0),
               'detail': '%s real people this week; %s of %s page views were bots, crawlers or testing and are excluded' % (st.get('real_visitors_7d'), st.get('bot_views_7d'), st.get('all_views_7d'))})
    ck.append({'name': 'Signups', 'ok': True, 'detail': '%s Riside signups and %s roofing leads counted straight from the database' % (st.get('signups_total'), st.get('roofing_total'))})
else:
    ck.append({'name': 'Website and signups', 'ok': False, 'detail': 'Could not read the database'})
pt = (d.get('posting') or {}).get('today', {}).get('youtube')
if pt: ck.append({'name': 'Posting', 'ok': not pt['overdue'], 'detail': 'YouTube %d/%d planned posts found live on the channel today' % (pt['done'], pt['planned'])})
d['checked_at'] = d['generated_at']
json.dump(d, open(os.path.join(out_dir, 'data.json'), 'w'), indent=1)
biz = []
for f in sorted(glob.glob(os.path.join(out_dir, 'biz', '*.json'))):
    if f.endswith('index.json'): continue
    try:
        b = json.load(open(f)); biz.append({'slug': os.path.basename(f)[:-5], 'name': b.get('name') or os.path.basename(f)[:-5], 'updated': b.get('updated')})
        try: age = (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(b['updated'].replace('Z', '+00:00'))).total_seconds() / 3600
        except Exception: age = 999
        d['checks'].append({'name': biz[-1]['name'], 'ok': age <= 12, 'detail': 'numbers last refreshed %.0fh ago' % age + ('' if age <= 12 else ' (older than 12h, flagged stale)')})
    except Exception as e:
        print('bad biz file', f, e)
json.dump(biz, open(os.path.join(out_dir, 'biz', 'index.json'), 'w'), indent=1)
json.dump(d, open(os.path.join(out_dir, 'data.json'), 'w'), indent=1)
print('ok', list(d['errors']))
