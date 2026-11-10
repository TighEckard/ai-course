"""Every few minutes: if a new REAL signup, roofing lead or paid member shows up, send a notification.
Notifications: a GitHub issue in this repo (GitHub emails/pushes the repo owner) + a push to ntfy.sh topic below.
No personal details are sent (repo and topic are public-ish): only source, class time and counts."""
import json, os, urllib.request
SB = 'https://yhsxxblilclylzgejehk.supabase.co/rest/v1/rpc/dash_stats'
KEY = 'sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj'
TOPIC = 'riside-05b7e0ac36b4'
STATE = 'dash/feed/alert_state.json'

def req(url, data=None, headers=None, method=None):
    r = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(r, timeout=30) as f:
        return f.read()

s = json.loads(req(SB, b'{}', {'apikey': KEY, 'Content-Type': 'application/json'}))
now = {'signups': s.get('signups_total') or 0, 'roofing': s.get('roofing_total') or 0, 'paid': s.get('paid_members') or 0}
try:
    old = json.load(open(STATE))
except Exception:
    old = None
alerts = []
if old is not None:
    rec = s.get('recent_signups') or []
    if now['signups'] > old.get('signups', 0):
        n = now['signups'] - old.get('signups', 0)
        new = [r for r in rec if not r.get('roofing')][:n]
        det = '; '.join('class: %s, came from: %s' % (r.get('slot'), r.get('source')) for r in new)
        alerts.append(('New real Riside signup (%d total)' % now['signups'], '%d new real signup(s). %s\nDetails: https://riside.com/#admin  Dashboard: https://riside.com/tigh/' % (n, det)))
    if now['roofing'] > old.get('roofing', 0):
        n = now['roofing'] - old.get('roofing', 0)
        alerts.append(('New roofing lead (%d total)' % now['roofing'], '%d new roofing lead(s). Phone numbers are in https://riside.com/#admin' % n))
    if now['paid'] > old.get('paid', 0):
        alerts.append(('New paid Riside member (%d total)' % now['paid'], 'A real paid member was added. https://riside.com/#admin'))
for title, body in alerts:
    print('ALERT', title)
    try:
        req('https://ntfy.sh/' + TOPIC, body.encode(), {'Title': title, 'Tags': 'tada', 'Click': 'https://riside.com/tigh/'})
    except Exception as e:
        print('ntfy failed', e)
    tok, repo = os.environ.get('GITHUB_TOKEN'), os.environ.get('GITHUB_REPOSITORY')
    if tok and repo:
        try:
            req('https://api.github.com/repos/%s/issues' % repo, json.dumps({'title': title, 'body': body + '\n\n(Automatic alert. Close this issue once seen.)'}).encode(),
                {'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
        except Exception as e:
            print('issue failed', e)
if old != now:
    json.dump(now, open(STATE, 'w'))
print('counts', now, 'alerts', len(alerts))
