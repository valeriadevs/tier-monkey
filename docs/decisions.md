# Tier Monkey — Decisions Log

**Purpose:** Resolve the open questions raised by the UX, UI, and Tech Art planning docs. Where multiple agents asked overlapping questions, they've been merged. Each section shows: the question, options considered, the locked decision, and why.

**Status:** All architectural calls resolved. v1 is locked. See §8 for backend-readiness design notes (v2 swap-in plan).

---

## TL;DR — The Headline Calls

| # | Decision | Locked answer |
|---|---|---|
| 1 | Backend in v1? | **No — but design data layer to be backend-ready** |
| 2 | User accounts in v1? | **No — local + share links only** (v2 hook ready) |
| 3 | Desktop-first or mobile-first? | **Desktop-first, mobile parity required** |
| 4 | Multi-list dashboard in v1? | **Yes — dashboard from day one** |
| 5 | Animated GIFs in v1? | **First-frame only (static)** |
| 6 | Watermark on exports? | **Never** |
| 7 | Sharing strategy? | **PNG download + URL-fragment base64 link (~2MB cap)** |
| 8 | Real-time collaboration? | **Out of scope for v1** |
| 9 | Public template gallery? | **Curated only, no user submission in v1** |

---

## 1. Asset Pipeline

### 1.1 GIF support *(UX #1 + Tech Art #1)*
**Options:** reject entirely / accept first-frame only / animate in canvas + APNG export / animate in canvas + animated WebP export
**Locked:** Accept, first-frame only.
**Why:** The meme format is static. APNG/WebP-anim isn't universally supported on Twitter/Discord/TikTok where these get shared. Matches every existing tier list tool's behavior. Defer animation to v2 if there's demand.

### 1.2 Remote image URLs (paste a web URL) *(UX #3 + Tech Art #7)*
**Options:** block all remote URLs / allow with broken-image warning on share / proxy via backend
**Locked:** Allow with broken-image warning on share.
**Why:** CORS-blocked images still display for the creator locally. Only the share-link fallback breaks. Matches tiermaker.com's behavior. A backend proxy is impossible in v1 (no backend, see §2.2).

### 1.3 Max items per tier row — wrap vs scroll *(Tech Art #3)*
**Locked:** **Wrap — row grows vertically.**
**Why:** Horizontal scroll inside a tier row, inside a vertically-scrolling page, is a UX trap on mobile. Wrap matches the physical metaphor (a longer ranking board).

### 1.4 Background patterns *(Tech Art #4)*
**Locked:** **Solid + transparent only in v1.**
**Why:** Patterns fight the meme aesthetic (flat color blocks). Defer to v2 if requested.

---

## 2. Sharing & Persistence

### 2.1 Sharing strategy *(UX #2 + Tech Art #2)*
**Options:** PNG download only / URL-fragment base64 (~2MB cap) / server-side image hosting / both
**Locked:** **PNG download + URL-fragment base64 link.**
**Why:** No-backend decision (§2.2) eliminates server-side hosting for v1. PNG download is the always-available escape hatch. URL-fragment base64 works offline, needs zero infrastructure, and lists over the cap show a friendly warning ("Your list is too complex for a link — export as PNG instead").

### 2.2 Authentication *(UX #6)*
**Options:** no accounts / accounts from day one / no in v1, designed for v2
**Locked:** **No accounts in v1.** Persistence = IndexedDB only. Data model designed for cheap v2 swap-in (see §8).
**Why:** Auth is the #1 friction-killer for creative apps. Casey and Maya would bounce at a signup screen. v2 will add accounts for cross-device sync + public list profiles.

### 2.3 Multi-list dashboard *(UX #4)*
**Options:** single active list / dashboard of drafts from day one
**Locked:** **Dashboard from day one.**
**Why:** IndexedDB holds dozens of drafts for free. The "Recent" widget costs ~half a day and Devon ("TierDev") loses work without it.

### 2.4 Notes per item *(UX #5)*
**Options:** yes, optional notes / defer to v2
**Locked:** **Defer to v2.**
**Why:** Notes bloat the share-link payload (the 2MB cap gets tight fast) and complicate the export. Priya ("Dr. Rank") is a real persona but a minority use case. Ship core flow first; add notes if research shows demand.

---

## 3. Collaboration & Templates

### 3.1 Real-time collaboration *(UX #7)*
**Locked:** **Out of scope for v1.** Defer.
**Why:** Real-time collab needs a backend (auth + WebSocket), which conflicts with no-backend v1. Data model designed CRDT-friendly for future implementation — see §8.

### 3.2 Template gallery *(UX #10)*
**Options:** curated only / user-submitted public gallery / both
**Locked:** **Curated templates only, in the app bundle. No user-submitted gallery in v1.**
**Why:** User-submitted gallery needs moderation + backend + accounts. Curated templates (Pokémon, programming languages, fast food) ship as static JSON. Template data structure stays portable so a public gallery can land in v2.

---

## 4. Monetization & Branding

### 4.1 Watermark on exports/shared links *(UX #8 + Tech Art #6)*
**Options:** never / always on shared links / free tier only (Pro removes)
**Locked:** **Never.**
**Why:** Watermarks tank virality. Maya wants clean screenshots for her group chat. Word-of-mouth beats forced branding. If we add Pro later, differentiate on features (custom fonts, large lists, team workspaces), not watermark removal.

---

## 5. Mobile & Interaction

### 5.1 Mobile-first vs desktop-first *(Tech Art #10)*
**Options:** desktop-first, mobile parity / mobile-first design
**Locked:** **Desktop-first, mobile parity required.**
**Why:** Devon and Priya are desktop-first. Casey and Maya need mobile to work but it's not their primary device. Build desktop, ship mobile in the same release as a functional equivalent.

### 5.2 Mobile resize interaction *(UX #9)*
**Options:** action-sheet presets (S/M/L) only / action-sheet presets + pinch-zoom
**Locked:** **Action-sheet presets only.**
**Why:** Pinch-zoom precision is poor on capacitive screens — users resize by accident. Three clear options match the global slider in the desktop toolbar. Revisit if mobile analytics show resize as top mobile friction.

---

## 6. Deferred to v2 (explicit non-goals for v1)

- Real-time collaboration
- User accounts / cross-device sync
- Server-side image hosting
- Public user-submitted template gallery
- Animated GIF/WebP playback & export
- Per-item notes
- Background patterns

---

## 7. Already locked by the planning docs (resolving Tech Art's open questions)

These were flagged by the Technical Artist but already answered in the UX or UI docs — flagged here so they don't reappear:

- **Tier count** *(Tech Art #5)* — UX locks "Add/remove/reorder tiers" as a v1 feature. Default 6 rows (S/A/B/C/D/F), freely mutable.
- **Undo/redo scope** *(Tech Art #9)* — UX locks full history: every tier move, rename, color change, image add/remove/move/resize = 1 undo step.
- **Export dark/light parity** *(Tech Art #8)* — UI locks export using user-picked tier colors regardless of editor theme. (UI doc §7 confirms.)

---

## 8. Backend-readiness design notes (v1 → v2 swap-in plan)

**Why this section exists:** v1 ships with no backend, but the data layer, sharing format, and persistence model must be designed so a backend can be added in v2 without rewriting the editor. This is the cheapest "have your cake and eat it" option — v1 stays simple, v2 stays tractable.

### 8.1 Tier list identity model
Every tier list must have a **stable, opaque ID** from v1 day one (UUIDv4 or ULID). Today the ID is local; tomorrow it's a server-side primary key. The ID appears in the URL fragment, in the IndexedDB record, and in any export metadata. **Do not** key anything by filename, document title, or user-controlled string.

### 8.2 Image asset addressing
Assets are referenced by ID, not inlined. In v1: `{ assetId: 'abc-123' }`. In v2: the same `{ assetId }` resolves to a CDN URL instead of a local Blob. Code that paints, exports, or shares an asset must always go through an `assetResolver(assetId) → URL/Blob` function — never `URL.createObjectURL(blob)` directly in app code. This is the single most important abstraction for v2.

### 8.3 Share payload format
The v1 URL-fragment base64 format **must be forward-compatible**. Rules:
- The encoded payload is versioned: `{ v: 1, list: {...}, assets: [{id, dataUrl, mime, w, h}] }`
- An unknown `v` value falls back to "read-only viewer" mode (read the list, don't try to edit)
- In v2, the same `v: 1` payload is still readable; `v: 2` payloads can use server-side URLs instead of inline `dataUrl`s

### 8.4 Persistence schema versioning
IndexedDB schema includes a `schemaVersion` field on every record and a top-level migration table. Bump it freely during v1 development; in v2, the same store becomes a local cache of server-owned data with `lastSyncedAt` timestamps and a `dirty` flag for offline edits.

### 8.5 Conflict-free editing primitives (CRDT-ready)
Tier lists are append/prepend/delete/set operations on ordered collections (tiers, items within a tier). Use immer-style patches or Y.js-style operations on the state tree. Avoid direct mutation. In v2, the same operations become CRDT updates and the server merges them. Concrete rules:
- Every state change produces a patch `{op, path, value, inverse}`
- The undo stack stores inverse patches (already aligned with this)
- No "load whole state and mutate" patterns — always load → apply patch → save patch

### 8.6 Backend surface to plan for
Even though we're not building the backend in v1, the *interface* it will eventually expose should be designed (TypeScript interfaces / OpenAPI spec stub):
- `POST /lists` — create
- `GET /lists/:id` — fetch
- `PUT /lists/:id` — replace (with `If-Match: version` for optimistic concurrency)
- `POST /assets` — upload image (returns `{assetId, url}`)
- `GET /assets/:id` — fetch (CDN-cached)
- `POST /share/:id` — generate shareable URL (optional: short link)

Keep these in a `backend-contract.ts` file from v1 day one, even if it's unimplemented. v2 imports it.

### 8.7 What NOT to do in v1
- Don't introduce `userId`, `authToken`, or session concepts anywhere in the v1 code
- Don't fetch images from arbitrary user-paste URLs (CORS + asset ownership complexity). Use the local Blob pipeline only
- Don't store absolute paths, ephemeral Blob URLs, or anything non-portable in IndexedDB
- Don't design the share format around the current 2MB cap being permanent — treat it as a soft cap

---

## Decisions signed off

All 4 architectural calls resolved:

| Call | Answer | Source of truth |
|---|---|---|
| Backend in v1? | No — but design data layer to be backend-ready | This doc §8 |
| Desktop-first or mobile-first? | Desktop-first, mobile parity required | This doc §5.1 |
| Multi-list dashboard? | Yes — from day one | This doc §2.3 |
| Notes per item? | Defer to v2 | This doc §2.4 |

v1 is locked. Ready for tech stack + scaffold.
