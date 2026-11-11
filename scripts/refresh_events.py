"""Keep the homepage's Event markup pointing at the next real free classes (for Google search).
Rewrites Event entries in the main JSON-LD block of index.html. Run daily by .github/workflows/events.yml."""
import json, re, datetime as dt
from zoneinfo import ZoneInfo
ET = ZoneInfo('America/New_York')
P = 'index.html'
s = open(P, encoding='utf-8').read()
m = re.search(r'(<script type="application/ld\+json">)(\[\{"@context": "https://schema.org", "@type": "EducationalOrganization".*?)(</script>)', s)
data = [x for x in json.loads(m.group(2)) if x.get('@type') != 'Event']
now = dt.datetime.now(ET)
SL = {1: (19, 'Free intro AI class for beginners', 'A free one-hour live Zoom class on using ChatGPT, Claude and Gemini for everyday life. Small group of up to 12, no experience needed.', 'https://riside.com/#reserve'),
      3: (19, 'Free intro AI class for beginners', 'A free one-hour live Zoom class on using ChatGPT, Claude and Gemini for everyday life. Small group of up to 12, no experience needed.', 'https://riside.com/#reserve'),
      5: (10, 'Free Scam Check class: spot AI and phone scams', 'A free live Zoom class on spotting scam calls, texts and emails, and using AI to check suspicious messages. No experience needed.', 'https://riside.com/#scamcheck')}
ev = []
for i in range(15):
    d = (now + dt.timedelta(days=i)).date()
    if d.weekday() not in SL: continue
    h, name, desc, url = SL[d.weekday()]
    st = dt.datetime(d.year, d.month, d.day, h, tzinfo=ET)
    if st <= now: continue
    ev.append({"@context": "https://schema.org", "@type": "Event", "name": name, "description": desc,
               "startDate": st.isoformat(), "endDate": (st + dt.timedelta(hours=1)).isoformat(),
               "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
               "location": {"@type": "VirtualLocation", "url": url}, "organizer": {"@id": "https://riside.com/#org"},
               "performer": {"@type": "Person", "name": "Holden Eckard"}, "image": "https://riside.com/images/og-image.jpg?v=2", "isAccessibleForFree": True,
               "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD", "url": url, "availability": "https://schema.org/InStock", "validFrom": now.date().isoformat()}})
new = m.group(1) + json.dumps(data + ev, ensure_ascii=False) + m.group(3)
if new != m.group(0):
    open(P, 'w', encoding='utf-8').write(s.replace(m.group(0), new))
    print('updated', len(ev), 'events')
else:
    print('no change')
