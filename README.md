# Oslo → Geiranger · 7月2日一日跟住行 (Trip Helper)

A single-page, mobile-first navigation helper for **2 July 2026 only**:
Oslo S → (F6 Dovre Railway) → Dombås → (R65 Rauma Railway) → Åndalsnes →
Romsdalen Gondola → (Vy bus over Trollstigen) → Geiranger.

Built for travellers with zero Norwegian/English — Traditional Chinese UI,
mock departure boards showing the exact words on real station screens,
live Norway-time countdown, tap-to-call emergency card, and Google
Maps / Street View deep links for every transfer point.

## Files

- `index.html` — the whole app (no build step, no dependencies)
- `sw.js` — service worker so the page keeps working offline in the mountains

## Hosting (free)

**Option A — GitHub Pages (recommended, permanent URL):**
1. Repo → **Settings → Pages**
2. Source: *Deploy from a branch* → branch `main` (or this branch) → `/ (root)` → Save
3. URL becomes `https://<user>.github.io/oslo-train/`

**Option B — instant, zero setup (works right now from this branch):**

```
https://raw.githack.com/georgechengtai/oslo-train/claude/norway-trip-nav-helper-uwgg8h/index.html
```

Open once on each phone while on Wi-Fi, then **Add to Home Screen** —
after that it works even without signal.

## Before the trip (2 minutes)

1. Open the link on every traveller's phone once (caches for offline).
2. Screenshot each QR code page of the ticket PDF into the photo album.
3. The gondola ticket arrives separately by email from iTicket ~7 days
   before departure — find that email in advance (check spam).
