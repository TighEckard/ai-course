#!/usr/bin/env python3
"""Builds /ai-classes/state/<state>/ hub pages, links them from the city hub and city pages.
Idempotent. Run from repo root."""
import re, glob, json, collections, html, os
NAMES={'AL':'Alabama','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia','FL':'Florida','GA':'Georgia','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'}
TIMES={'Eastern':('7 pm','10 am'),'Central':('6 pm','9 am'),'Mountain':('5 pm','8 am'),'Pacific':('4 pm','7 am')}
ORDER=['Eastern','Central','Mountain','Pacific']
slug=lambda n:n.lower().replace(' ','-')
e=html.escape
cities=collections.defaultdict(list); cons={}
for f in sorted(glob.glob('ai-classes/*/index.html')):
    d=f.split('/')[1]; s=open(f).read()
    m=re.search(r'<h1>AI Classes for Adults in (.*?), ([A-Z]{2})</h1>',s)
    if not m: continue
    cities[m.group(2)].append((d,m.group(1)))
    tm=re.search(r'<th>Your time \((.*?)\)</th>',s)
    cp=re.search(r'<li><b>[^<]* consumer protection\.</b>.*?<a href="([^"]*)"',s)
    cities[m.group(2)+'_z']=cities.get(m.group(2)+'_z',set())|({tm.group(1)} if tm else set())
    if cp: cons[m.group(2)]=cp.group(1)
tpl=open('ai-classes/beaumont-tx/index.html').read()
head=tpl[:tpl.index('<script type="application/ld+json">')]
style=re.search(r'<style>.*?</style></head>',tpl,re.S).group(0)
body_open=tpl[tpl.index('<body>'):tpl.index('<main>')+6]
foot=tpl[tpl.index('</main>'):]
foot=foot.replace('<a href="/ai-classes/">Classes by city</a>','<a href="/ai-classes/">Classes by city</a>')
def mkhead(title,desc,url):
    h=head
    h=re.sub(r'<title>.*?</title>','<title>%s</title>'%e(title),h)
    h=re.sub(r'(<meta name="description" content=")[^"]*','\\g<1>'+e(desc,quote=True),h)
    h=re.sub(r'(<meta property="og:title" content=")[^"]*','\\g<1>'+e(title,quote=True),h)
    h=re.sub(r'(<meta property="og:description" content=")[^"]*','\\g<1>'+e(desc,quote=True),h)
    h=re.sub(r'(rel="canonical" href=")[^"]*','\\g<1>'+url,h)
    h=re.sub(r'(<meta property="og:url" content=")[^"]*','\\g<1>'+url,h)
    return h
for ab,name in NAMES.items():
    cs=sorted(cities[ab],key=lambda x:x[1]); zones=[z for z in ORDER if z in cities[ab+'_z']]
    if not cs: continue
    url='https://riside.com/ai-classes/state/%s/'%slug(name)
    n=len(cs)
    title='AI Classes in %s: Free Live Class Online for Adults | Riside'%name
    desc='Live AI classes for adults in %s, taught on Zoom in small groups. First class free. See class times in your time zone, local help and cities we serve.'%name
    rows=''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>'%(z,TIMES[z][0],TIMES[z][0],TIMES[z][1]) for z in zones)
    rows=''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>'%(z,TIMES[z][0],TIMES[z][1]) for z in zones)
    tz_note=('%s is in the %s time zone.'%(name,zones[0]) if len(zones)==1 else '%s spans more than one time zone, so check the row that matches where you live.'%name)
    ccon='<li><b>%s consumer protection.</b> Report scams and file a complaint with <a href="%s" rel="noopener">the %s consumer protection office</a>.</li>'%(name,cons[ab],name) if ab in cons else ''
    faq=[("Are Riside classes in person in %s?"%name,"No. Classes are live on Zoom, so you join from home in %s on a phone, tablet or computer. Groups hold 12 people so you can ask questions out loud."%name),
         ("What does it cost?","Your first class is free. If you keep going, membership is $46 a month, locked in for as long as you stay."),
         ("Do I need experience?","No. If you can open a web page, you can start. The first six weeks are made for beginners."),
         ("What time are classes in %s?"%name,"Classes run Tuesday and Thursday evenings and Saturday morning. The table on this page shows the time for each time zone in %s."%name)]
    ld=[{"@context":"https://schema.org","@type":"CollectionPage","name":"AI Classes in %s"%name,"description":desc,"url":url,"inLanguage":"en","publisher":{"@id":"https://riside.com/#org"}},
        {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]},
        {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://riside.com/"},{"@type":"ListItem","position":2,"name":"Classes by city","item":"https://riside.com/ai-classes/"},{"@type":"ListItem","position":3,"name":name,"item":url}]}]
    clist=''.join('<li><a href="/ai-classes/%s/">%s, %s</a></li>'%(d,e(c),ab) for d,c in cs)
    page=(mkhead(title,desc,url)+'<script type="application/ld+json">'+json.dumps(ld)+'</script>\n'+style+body_open+
     '<p class="crumb"><a href="/">Home</a> / <a href="/ai-classes/">Classes by city</a> / %s</p>\n'%name+
     '<article><h1>AI Classes for Adults in %s</h1>'%name+
     '<p class="lede">Riside Learning teaches everyday AI to adults in small live groups on Zoom. If you live anywhere in %s, you can join from home. Your first class is free.</p>'%name+
     '<div class="cta"><h2>Reserve a free seat</h2><p>One hour, small group, no experience needed.</p><a class="btn" href="/?src=state-%s#reserve">Join the free class</a></div>'%slug(name)+
     '<h2>Class times in %s</h2><p>The same live class runs at three times each week. %s</p>'%(name,tz_note)+
     '<table><tr><th>Time zone</th><th>Tuesday and Thursday evening</th><th>Saturday morning</th></tr>%s</table>'%''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>'%(z,TIMES[z][0],TIMES[z][1]) for z in zones)+
     '<p class="fine">Groups hold 12 people, so every question gets answered. Every class is recorded for members.</p>'+
     '<h2>What you will learn</h2><p>You will practice with ChatGPT, Claude and Gemini on real questions from your own life: understanding a confusing letter, writing a clear email, planning a trip, and checking whether a message is a scam. Holden Eckard teaches every class live and shows each step on screen.</p>'+
     '<h2>Free help for %s residents</h2><ul class="loc">%s<li><b>Area Agency on Aging.</b> Find local services for older adults with the <a href="https://eldercare.acl.gov/" rel="noopener">Eldercare Locator</a>, or call 1-800-677-1116.</li><li><b>Medicare questions.</b> Free, unbiased counseling is available through your State Health Insurance Assistance Program at <a href="https://www.shiphelp.org/" rel="noopener">shiphelp.org</a>.</li><li><b>Report a scam.</b> Use <a href="https://reportfraud.ftc.gov/" rel="noopener">ReportFraud.ftc.gov</a>, the federal reporting site.</li><li><b>Everyday needs.</b> Dial 211 for local food, housing and transportation help.</li></ul>'%(name,ccon)+
     '<h2>Cities in %s we have pages for (%d)</h2><p>Every city page shows class times and local help for that area.</p><ul class="grid" style="grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))">%s</ul>'%(name,n,clist.replace('<a ','<a ').replace('<li>','<li>'))+
     '<h2>Common questions</h2>'+''.join('<details><summary>%s</summary><p>%s</p></details>'%(e(q),e(a)) for q,a in faq)+
     '<div class="cta"><h2>Ready to try it?</h2><p>Join a free live class on Zoom from anywhere in %s.</p><a class="btn" href="/?src=state-%s#reserve">Reserve a free seat</a></div>'%(name,slug(name))+
     '<h2>More guides</h2><ul class="related"><li><a href="/guides/is-ai-safe-to-use/">Is AI Safe to Use?</a></li><li><a href="/guides/what-is-chatgpt/">What Is ChatGPT?</a></li><li><a href="/guides/how-to-spot-an-ai-scam-text/">How to Spot an AI Scam Text</a></li></ul></article>'+foot)
    os.makedirs('ai-classes/state/'+slug(name),exist_ok=True)
    open('ai-classes/state/%s/index.html'%slug(name),'w').write(page)
# city hub: link state headings + jump list
hub=open('ai-classes/index.html').read()
if 'class="statejump"' not in hub:
    jump='<p class="fine" class="statejump"></p>'
    jump='<ul class="related statejump" style="grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))">'+''.join('<li><a href="/ai-classes/state/%s/">%s</a></li>'%(slug(n),n) for ab,n in NAMES.items() if cities[ab])+'</ul>'
    hub=hub.replace('</p><h2>Alabama','</p><h2>Browse by state</h2>'+jump+'<h2>Alabama',1)
    for n in NAMES.values():
        hub=hub.replace('<h2>%s</h2>'%n,'<h2><a href="/ai-classes/state/%s/" style="text-decoration:none">%s</a></h2>'%(slug(n),n),1)
    open('ai-classes/index.html','w').write(hub)
# city pages: breadcrumb to state
cnt=0
for ab,name in NAMES.items():
    for d,c in cities[ab]:
        f='ai-classes/%s/index.html'%d; s=open(f).read()
        if '/ai-classes/state/' in s: continue
        sl=slug(name); u='https://riside.com/ai-classes/state/%s/'%sl
        s=s.replace('<a href="/ai-classes/">Classes by city</a> / %s, %s</p>'%(c,ab),'<a href="/ai-classes/">Classes by city</a> / <a href="/ai-classes/state/%s/">%s</a> / %s, %s</p>'%(sl,name,c,ab),1)
        s=s.replace('{"@type": "ListItem", "position": 3, "name": "%s, %s", "item": "https://riside.com/ai-classes/%s/"}'%(c,ab,d),
          '{"@type": "ListItem", "position": 3, "name": "%s", "item": "%s"}, {"@type": "ListItem", "position": 4, "name": "%s, %s", "item": "https://riside.com/ai-classes/%s/"}'%(name,u,c,ab,d),1)
        s=s.replace('<h2>Nearby cities</h2>','<h2>Nearby cities</h2><p class="fine">Browse <a href="/ai-classes/state/%s/">every %s city page</a>.</p>'%(sl,name),1)
        open(f,'w').write(s); cnt+=1
print('city pages updated',cnt)
