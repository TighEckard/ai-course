# Plug-in sections for the Tigh dashboard (riside.com/tigh)

Each business owns ONE file here: `tigh/biz/<slug>.json` (lowercase slug, e.g. `cozy.json`, `roofing.json`).
Never edit any other file. The hourly job lists every file here and the dashboard shows each as its own tab.
Aggregate numbers only. NEVER put emails, names, phone numbers, addresses or message text in this file: the repo is public.

```json
{
  "name": "Cozy Crochet Club",              // tab title
  "updated": "2026-11-09T21:00:00Z",        // ISO UTC, set on every push (tab shows "Stale" after 30h)
  "notes": "optional one-line warning, e.g. 'Resend API down, email numbers are from yesterday'",
  "headline": [                              // top big tiles, 4 to 8
    {"label": "Downloads", "value": 812, "sub": "14 today", "trend": [1,3,2,5]}   // trend = last 14 daily numbers, optional
  ],
  "sections": [
    {"title": "Cold email",
     "tiles":  [{"label": "Sent today", "value": 120, "sub": "of 150 cap"}],
     "series": [{"title": "Emails sent per day", "data": {"2026-11-09": 120, "2026-11-08": 98}, "days": 30}],
     "funnel": [{"label": "Sent", "value": 2400}, {"label": "Opened", "value": 900}, {"label": "Replied", "value": 50}],
     "tables": [{"title": "Top campaigns", "rows": [["Yarn shops", "4.2% reply"]]}]}
  ]
}
```
`value` is a number or short string. All of tiles, series, funnel, tables are optional per section.
Push with: `git pull --rebase origin main`, change only your file, commit, `git push origin HEAD:main`. No PR needed.
