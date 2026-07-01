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

## Hosting (free)

This repo is currently **private**, which is why raw.githack /
HTMLPreview return 404 and GitHub Pages is unavailable on the Free plan.
Two ways to get a working URL:

**Option A — GitHub Pages (recommended):**
1. Repo → **Settings → General → Danger Zone → Change visibility → Public**
   (safe: no personal data is in the files)
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* →
   branch `claude/norway-trip-nav-helper-uwgg8h` → `/ (root)` → Save
3. Wait ~1 minute. URL: `https://georgechengtai.github.io/Oslo-Train/`

**Option B — Netlify Drop (repo stays private):**
1. Download `index.html` and `sw.js` from this branch
2. Put both in a folder, drag the folder onto https://app.netlify.com/drop
3. You get a public URL immediately (free account needed)

Then share the URL **with the `#d=` fragment appended** (see group chat)
so booking references appear on each phone.

## Before the trip (tonight, 2 minutes per person)

1. Open the full link (with `#d=`) once on every phone — caches for offline.
2. Screenshot each QR page of the ticket PDF into the photo album.
3. Find the separate **iTicket email** with the gondola QR (sent ~7 days
   before departure; check spam) and screenshot it.
4. Tap each "👁 街景" button once to preview the walks.
