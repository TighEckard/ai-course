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
    ns = {'a': 'http://www.w3.org/2005/Atom', 'm': 'http://search.yahoo.com/mrss/', 'y': 'http://www.youtube.com/xml/schemas/2015'}
    vids = []
    try:
        xml = get('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid.group(1))
        entries = ET.fromstring(xml).findall('a:entry', ns)
    except Exception as e:
        entries = []; print('rss failed', e)
    for e in entries:
        st = e.find('m:group/m:community/m:statistics', ns)
        vids.append({'title': e.find('a:title', ns).text, 'url': e.find('a:link', ns).get('href'),
                     'published': e.find('a:published', ns).text, 'views': int(st.get('views')) if st is not None else 0,
                     'likes': int(e.find('m:group/m:community/m:starRating', ns).get('count'))})
    d['youtube'] = {'total_views': sum(v['views'] for v in vids), 'videos': len(vids),
                    'likes': sum(v['likes'] for v in vids), 'top': sorted(vids, key=lambda v: -v['views'])[:3], 'recent': vids[:5], 'all': vids}
    # Full catalog: RSS only lists the latest 15, so read every Short/video id and its exact view count.
    ids = [re.search(r'v=([\w-]{11})', v['url']).group(1) for v in vids if 'v=' in v['url']]
    approx = {}
    H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Cookie': 'CONSENT=YES+1; SOCS=CAI', 'Accept-Language': 'en-US,en;q=0.9'}
    def num(t):
        t = t.replace(',', '').strip(); m = re.match(r'([\d.]+)\s*(thousand|million|K|M)?', t)
        return int(float(m.group(1)) * {'thousand': 1e3, 'K': 1e3, 'million': 1e6, 'M': 1e6}.get(m.group(2) or '', 1)) if m else 0
    for tab in ('shorts', 'videos'):
        try:
            pg = get('https://www.youtube.com/@risidelearning/' + tab, headers=H)
            for m in re.findall(r'/shorts/([\w-]{11})|"videoId":"([\w-]{11})"', pg):
                i = m[0] or m[1]
                if i not in ids: ids.append(i)
            for i, tt, v in re.findall(r'"reelWatchEndpoint":\{"videoId":"([\w-]{11})".{0,4000}?"accessibilityText":"((?:[^"\\]|\\.)*?), ([\d.,]+(?: thousand| million)?|No) views?', pg, re.S):
                approx.setdefault(i, (0 if v == 'No' else num(v), tt))
            for tt, v, i in re.findall(r'"accessibilityText":"((?:[^"\\]|\\.)*?), ([\d.,]+(?: thousand| million)?|No) views? - play Short".{0,3000}?"videoId":"([\w-]{11})"', pg, re.S):
                approx.setdefault(i, (0 if v == 'No' else num(v), tt))
        except Exception as e:
            d['errors']['youtube_catalog_' + tab] = str(e)[:80]
    cat = []; exact = 0
    for vid in ids[:150]:
        row = None
        try:
            w = get('https://www.youtube.com/watch?v=' + vid, headers=H)
            vc = re.search(r'"videoDetails":\{.*?"viewCount":"(\d+)"', w, re.S)
            ch = re.search(r'"videoDetails":\{[^}]*?"channelId":"(UC[\w-]{22})"', w)
            if vc and (not ch or ch.group(1) == cid.group(1)):
                t = re.search(r'"videoDetails":\{"videoId":"[^"]+","title":"((?:[^"\\]|\\.)*)"', w)
                pub = re.search(r'"publishDate":"([^"]+)"', w)
                row = {'id': vid, 'title': json.loads('"' + t.group(1) + '"') if t else vid, 'url': 'https://youtube.com/shorts/' + vid,
                       'views': int(vc.group(1)), 'published': pub.group(1) if pub else None, 'exact': True}
                exact += 1
        except Exception:
            pass
        if row is None and vid in approx:
            try: ttl = json.loads('"' + approx[vid][1] + '"')
            except Exception: ttl = approx[vid][1]
            rss = next((v for v in vids if vid in v['url']), None)
            row = {'id': vid, 'title': ttl or vid, 'url': 'https://youtube.com/shorts/' + vid, 'views': approx[vid][0], 'exact': False,
                   'published': rss['published'] if rss else None}
        if row and row['title'] == vid:
            try: row['title'] = json.loads(get('https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/shorts/' + vid))['title']
            except Exception: pass
        if row: cat.append(row)
    print('youtube ids', len(ids), 'exact', exact, 'approx-only', len(cat) - exact)
    if cat:
        rss_sum = d['youtube']['total_views']
        d['youtube'].update({'total_views': sum(v['views'] for v in cat), 'videos': len(cat), 'catalog': True,
                             'likes': d['youtube']['likes'], 'exact_videos': exact, 'list': sorted(cat, key=lambda v: v.get('published') or '', reverse=True), 'top': sorted(cat, key=lambda v: -v['views'])[:3]})
        d.setdefault('checks', []).append({'name': 'YouTube views', 'ok': d['youtube']['total_views'] >= rss_sum,
            'detail': '%d videos on the channel, %d with exact counts%s = %d views' % (len(cat), exact, '' if exact == len(cat) else ' (rest from the channel page, rounded)', d['youtube']['total_views'])})
    else:
        d['errors']['youtube_catalog'] = 'Could only read the latest 15 videos; total views is too low'
except Exception as e:
    d['youtube'] = None; print('youtube failed', e)
if not d.get('youtube') or not d['youtube'].get('catalog'):
    try:
        prev = json.load(open(os.path.join(out_dir, 'data.json'))).get('youtube')
        if prev and prev.get('catalog'):
            prev['stale_from'] = prev.get('checked_at') or prev.get('stale_from'); d['youtube'] = prev
            d['errors']['youtube'] = 'YouTube did not answer this hour; showing the last good numbers'
    except Exception:
        pass
if d.get('youtube') and d['youtube'].get('catalog') and not d['youtube'].get('stale_from'):
    d['youtube']['checked_at'] = d['generated_at']
try:
    from zoneinfo import ZoneInfo
    sch = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'schedule.json')))
    tz = ZoneInfo(sch['tz']); now = datetime.datetime.now(tz); today = now.date().isoformat()
    soc = {}
    try: soc = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'social.json')))
    except Exception: pass
    norm = lambda t: re.sub(r'[^a-z0-9]', '', (t or '').lower())
    yt_today = []
    for v in ((d.get('youtube') or {}).get('all') or [x for x in (d.get('youtube') or {}).get('list', []) if x.get('published')]):
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
                cat_titles = [norm(v['title']) for v in ((d.get('youtube') or {}).get('list') or [])]
                x['done'] = any(norm(x['id']) in n or norm(x['title'])[:25] in n for n, _ in yt_today) or any(norm(x['title'])[:25] in n for n in cat_titles)
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
    hist = []
    ytl = (d.get('youtube') or {}).get('list') or (d.get('youtube') or {}).get('all') or []
    for k in range(0, 8):
        day = (now - datetime.timedelta(days=k)).date().isoformat()
        mf2 = os.path.join(ROOT, 'social', day, 'manifest.json')
        if not os.path.exists(mf2): continue
        for it in json.load(open(mf2))['videos']:
            title = it.get('yt_title') or it.get('pin_title') or (it.get('caption_meta') or it['id']).split('. ')[0][:70]
            plats = []
            for pf in it['platforms']:
                for plat in sch['platform_of'].get(pf, []):
                    link = None; st = 'unverified'
                    if plat == 'youtube' and ytl:
                        hit = next((v for v in ytl if norm(it.get('yt_title') or it['id'])[:25] in norm(v['title']) or norm(it['id']) in norm(v['title'])), None)
                        link = hit and hit['url']; st = 'live' if hit else ('missing' if day < today or datetime.datetime.fromisoformat(now.replace(hour=int(sch['slots'].get(it.get('slot'),'12:00')[:2])).isoformat()) <= now else 'scheduled')
                        if hit: plats.append({'p': plat, 'status': st, 'url': link, 'views': hit['views']}); continue
                    elif plat in ((soc.get('posted_by_day') or {}).get(day) or {}):
                        st = 'live' if it['id'] in soc['posted_by_day'][day][plat] else 'missing'
                    plats.append({'p': plat, 'status': st, 'url': link})
            hist.append({'date': day, 'slot': it.get('slot'), 'title': title, 'format': it.get('format'), 'platforms': plats})
    d['posting'] = {'date': today, 'now_et': now.strftime('%-I:%M %p'), 'today': out, 'history': hist,
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
        d['checks'].append({'name': biz[-1]['name'], 'ok': age <= 12, 'detail': 'numbers last refreshed %.0fh ago' % max(age, 0) + ('' if age <= 12 else ' (older than 12h, flagged stale)')})
    except Exception as e:
        print('bad biz file', f, e)
json.dump(biz, open(os.path.join(out_dir, 'biz', 'index.json'), 'w'), indent=1)
json.dump(d, open(os.path.join(out_dir, 'data.json'), 'w'), indent=1)
print('ok', list(d['errors']))
