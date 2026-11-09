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
json.dump(d, open(os.path.join(out_dir, 'data.json'), 'w'), indent=1)
biz = []
for f in sorted(glob.glob(os.path.join(out_dir, 'biz', '*.json'))):
    if f.endswith('index.json'): continue
    try:
        b = json.load(open(f)); biz.append({'slug': os.path.basename(f)[:-5], 'name': b.get('name') or os.path.basename(f)[:-5], 'updated': b.get('updated')})
    except Exception as e:
        print('bad biz file', f, e)
json.dump(biz, open(os.path.join(out_dir, 'biz', 'index.json'), 'w'), indent=1)
print('ok', list(d['errors']))
