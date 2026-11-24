#!/usr/bin/env python3
"""Adds city pages for cities listed in scripts/new_cities.txt (Name|ST per line) by cloning a same-state page.
Idempotent. Run from repo root, then run build_state_pages.py."""
import re, os, glob, hashlib, datetime
NAMES={'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'}
slug=lambda n,st: re.sub(r"[^a-z0-9 ]","",n.lower()).replace(' ','-')+'-'+st.lower()
def city_of(s):
    m=re.search(r'<h1>AI Classes Near Me in (.*?), ([A-Z]{2}):',s); return (m.group(1),m.group(2)) if m else None
pages={}; bystate={}
for f in glob.glob('ai-classes/*/index.html'):
    d=f.split('/')[1]
    if d in('state',): continue
    s=open(f).read(); c=city_of(s)
    if c: pages[d]=(c,s); bystate.setdefault(c[1],[]).append(d)
want=[]
for line in open('scripts/new_cities.txt').read().split('\n'):
    if line.strip():
        n,st=line.strip().rsplit('|',1) if '|' in line else line.strip().rsplit(' ',1); want.append((n,st))
today=datetime.date.today().isoformat(); sm=open('sitemap.xml').read(); added=0; sitemap_add=''
for n,st in want:
    d=slug(n,st)
    if d in pages or os.path.exists('ai-classes/'+d): continue
    sn=NAMES[st]
    # template: existing page in same state having a county lede
    tpl=None
    for t in sorted(bystate.get(st,[]),key=lambda x:hashlib.md5((x+d).encode()).hexdigest()):
        s=pages[t][1]
        if re.search(r' in [A-Z][\w. \']+ County, '+sn,s): tpl=t; break
    if not tpl: print('no template',n,st); continue
    (tn,_),s=pages[tpl]
    s=re.sub(r'(%s) in [A-Z][\w. \']+ County, %s'%(re.escape(tn),sn),r'\1, %s'%sn,s)
    s=re.sub(r'libraries in [A-Z][\w. \']+ County','libraries in your county',s)
    s=s.replace('/ai-classes/%s/'%tpl,'/ai-classes/%s/'%d).replace('city-'+tpl,'city-'+d)
    s=s.replace(tn+', '+st,n+', '+st).replace(tn,n)
    # nearby -> other cities in state
    others=[x for x in sorted(bystate[st],key=lambda x:hashlib.md5((x+d+'n').encode()).hexdigest()) if x!=tpl][:6]
    li=''.join('<li><a href="/ai-classes/%s/">%s, %s</a></li>'%(x,pages[x][0][0],st) for x in others)
    s=re.sub(r'(<h2>)Nearby cities(</h2>.*?<ul class="related">).*?(</ul>)',lambda m:m.group(1)+'More cities in '+sn+m.group(2)+li+m.group(3),s,1,re.S)
    os.makedirs('ai-classes/'+d); open('ai-classes/%s/index.html'%d,'w').write(s); added+=1
    sitemap_add+='  <url><loc>https://riside.com/ai-classes/%s/</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n'%(d,today)
if sitemap_add: open('sitemap.xml','w').write(sm.replace('</urlset>',sitemap_add+'</urlset>'))
print('added',added)
