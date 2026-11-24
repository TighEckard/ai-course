#!/usr/bin/env python3
"""Regenerates city lists on /ai-classes/ and the state hubs from the city pages. Run from repo root."""
import re, glob, html
NAMES={}
src=open('scripts/build_state_pages.py').read()
NAMES=eval(re.search(r'NAMES=(\{.*?\})\n',src).group(1))
slug=lambda n:n.lower().replace(' ','-')
cities={}
for f in glob.glob('ai-classes/*/index.html'):
    d=f.split('/')[1]
    if d=='state': continue
    m=re.search(r'<h1>AI Classes Near Me in (.*?), ([A-Z]{2}):',open(f).read())
    if m: cities.setdefault(m.group(2),[]).append((d,m.group(1)))
hub=open('ai-classes/index.html').read()
for ab,n in NAMES.items():
    cs=sorted(cities.get(ab,[]),key=lambda x:x[1])
    if not cs: continue
    sp='ai-classes/state/%s/index.html'%slug(n)
    try: s=open(sp).read()
    except FileNotFoundError: continue
    li=''.join('<li><a href="/ai-classes/%s/">%s, %s</a></li>'%(d,html.escape(c),ab) for d,c in cs)
    s=re.sub(r'(<h2>Cities in %s we have pages for \()\d+(\)</h2>.*?<ul class="grid"[^>]*>).*?(</ul>)'%n,lambda m:m.group(1)+str(len(cs))+m.group(2)+li+m.group(3),s,1,re.S)
    open(sp,'w').write(s)
    li2=''.join('<li><a href="/ai-classes/%s/">%s</a></li>'%(d,html.escape(c)) for d,c in cs)
    hub=re.sub(r'(<h2><a href="/ai-classes/state/%s/"[^>]*>%s</a></h2><ul class="related">).*?(</ul>)'%(slug(n),n),lambda m:m.group(1)+li2+m.group(2),hub,1,re.S)
open('ai-classes/index.html','w').write(hub)
print({a:len(c) for a,c in cities.items()}['TN'], sum(len(c) for c in cities.values()))
