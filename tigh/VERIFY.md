# Data check protocol for riside.com/tigh

Runs automatically: GitHub Action "Refresh dashboard" every hour (so every number is never more than 1h old,
well inside the 12h rule) plus on every change to a business file. Results show in the "Data checks" card.

1. Website (Supabase `dash_stats()`): only REAL people count. Removed: the admin page's bot rule
   (San Jose Android data-center crawler), selftest/internal links, and any visit with no human behaviour
   (didn't scroll 25%, stay 10s, or click). The owner's browsers are never tracked (t.js skips anyone who opened /admin).
   Check: real visitors <= all page views; the excluded bot/test count is shown.
2. Signups, paid members, messages, roofing leads: counted directly from the database tables, no estimates.
3. YouTube: every video id on the channel's Shorts and Videos tabs is opened one by one and its exact view
   count read. Check: catalog total >= the latest-15 feed total, else a warning shows ("partial").
4. Posting: today's planned posts (social/<date>/manifest.json) are matched against what is actually live on
   YouTube. Facebook/Instagram/Pinterest show "Not verified" until the PC collector reports them.
5. Other businesses (tigh/biz/*.json): each file must be refreshed within 12h, otherwise flagged stale.
   Each business agent must pull numbers from the real source and label anything unverified.
Any failed check shows a ⚠ on the dashboard instead of a wrong number.
