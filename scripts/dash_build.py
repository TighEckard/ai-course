#!/usr/bin/env python3
"""Builds dash/<token>/data.json from Supabase, YouTube RSS, posts.json and dash/feed/social.json. Each source fails soft."""
import json, os, re, sys, urllib.request, datetime, glob
import xml.etree.ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = glob.glob(os.path.join(ROOT, 'dash', '*', 'index.html'))[0].rsplit('/', 1)[0]
SB = 'https://yhsxxblilclylzgejehk.supabase.co/rest/v1/rpc/dash_stats'
KEY = 'sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj'
def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30).read().decode()
d = {'generated_at': datetime.datetime.utcnow().isoformat() + 'Z', 'errors': {}}
try:
    d['site'] = json.loads(get(SB, b'{}', {'apikey': KEY, 'Content-Type': 'application/json'}))
except Exception as e:
    d['site'] = None; d['errors']['site'] = 'Run dash-setup.sql in Supabase (%s)' % e
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
                    'likes': sum(v['likes'] for v in vids), 'top': sorted(vids, key=lambda v: -v['views'])[:3], 'recent': vids[:5]}
except Exception as e:
    d['youtube'] = None; d['errors']['youtube'] = str(e)[:120]
try:
    posts = json.load(open(os.path.join(ROOT, 'posts.json')))['posts']
    now = datetime.datetime.utcnow()
    last = {}; n7 = {}
    for p in posts:
        t = datetime.datetime.strptime(p['t'], '%Y-%m-%dT%H:%M:%SZ')
        if p['platform'] not in last or t > last[p['platform']][0]: last[p['platform']] = (t, p['label'])
        if (now - t).days < 7: n7[p['platform']] = n7.get(p['platform'], 0) + 1
    d['posting'] = {'last': {k: {'t': v[0].isoformat() + 'Z', 'label': v[1]} for k, v in last.items()}, 'posts_7d': n7}
except Exception as e:
    d['posting'] = None; d['errors']['posting'] = str(e)[:120]
try:
    d['social'] = json.load(open(os.path.join(ROOT, 'dash', 'feed', 'social.json')))
except Exception as e:
    d['social'] = None
json.dump(d, open(os.path.join(out_dir, 'data.json'), 'w'), indent=1)
print('ok', list(d['errors']))
