# Oslo → Geiranger · 7月2日逐步領航 (Trip Helper)

A single-page, mobile-first navigation helper for **2 July 2026 only**:
Oslo S → (F6 Dovre Railway) → Dombås → (R65 Rauma Railway) → Åndalsnes →
Romsdalen Gondola → (Vy bus over Trollstigen) → Geiranger.

Written for people with zero sense of direction: every step is
"press one button → follow the blue dot → match one word", with a green
"what you should see in front of you" proof after each action and a red
"if you see X instead, do exactly this" recovery. It never assumes the
reader can find things by look, judge a train by its appearance, or
approach staff.

## Files

- `index.html` — the whole app (no build step, no dependencies)
- `sw.js` — service worker so the page keeps working offline in the mountains

## Privacy

The HTML contains **no booking references or names**. Private data is
injected once via a `#d=<base64>` URL fragment (shared privately in the
group chat) and stored in each phone's localStorage. This makes the file
safe to host on a public site.

## Pages

- `index.html` — the step-by-step navigator (tickets, transfers, emergency card)
- `spots.html` — photo spots + talking points along the route
- `evening.html` — post-arrival evening plan around Homlungsvegen 34

## Hosting (free)

The repo is public. **Use commit-pinned rawcdn URLs only** (raw.githack
branch URLs are rate-limited and can intermittently fail — policy is to
never share those):

```
https://rawcdn.githack.com/Georgechengtai/Oslo-Train/<commit-sha>/index.html
https://rawcdn.githack.com/Georgechengtai/Oslo-Train/<commit-sha>/spots.html
https://rawcdn.githack.com/Georgechengtai/Oslo-Train/<commit-sha>/evening.html
```

Replace `<commit-sha>` with the latest commit hash (`git rev-parse HEAD`).
Pinned URLs are immutable and CDN-cached, so they never throttle; pushing
new content means sharing a new pinned URL.

**Nicer permanent URL (GitHub Pages):** a deploy workflow is included
(`.github/workflows/pages.yml`), but GitHub requires the Pages *site* to
be created once by a repo admin — a workflow token cannot do it
("Resource not accessible by integration"). One-time step:
**Settings → Pages → Source: GitHub Actions**. After that every push
deploys automatically to `https://georgechengtai.github.io/Oslo-Train/`.

Share the navigator URL **with the `#d=` fragment appended** (see group
chat) so booking references appear on each phone.

## Before the trip (tonight, 2 minutes per person)

1. Open the full link (with `#d=`) once on every phone — caches for offline.
2. Screenshot each QR page of the ticket PDF into the photo album.
3. Find the separate **iTicket email** with the gondola QR (sent ~7 days
   before departure; check spam) and screenshot it.
4. Tap each "👁 街景" button once to preview the walks.
