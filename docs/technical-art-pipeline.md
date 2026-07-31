# Tier Monkey — Technical Art Pipeline & Rendering Strategy

**Document version:** 1.0
**Status:** Pre-production planning
**Owner:** Technical Artist

This document defines how images flow through Tier Monkey from upload to PNG export, and how the on-screen tier list and the exported raster artifact stay visually equivalent. The export *is* the product, so the pipeline is biased toward export determinism over UI flexibility.

---

## 1. Asset Pipeline Overview

### Supported Input Formats
- **JPEG** (`image/jpeg`) — primary photo format
- **PNG** (`image/png`) — primary format with transparency
- **WebP** (`image/webp`) — modern web format, both lossy and lossless
- **GIF** (`image/gif`) — **static first frame only** for placement; animated playback is not part of the MVP (see Open Questions)
- **SVG** (`image/svg+xml`) — accepted, rasterized to PNG on import (no live vector scaling)
- **BMP / TIFF** — rejected at validation; users are guided to convert

Animated GIFs and AVIF are *accepted on input* but only the first frame is used for the export. AVIF is not in MVP scope.

### Size & Dimension Policy
- **Per-file limit:** 10 MB hard cap; 5 MB soft warning at upload time
- **Max pixel dimensions on input:** 6000 × 6000; anything larger is downscaled at decode time
- **Max pixel dimensions after decode:** 1024 × 1024 for the working master (used in export tiles at native size when possible, otherwise downscaled)

### Client-Side Processing Pipeline
1. **Validate** — MIME sniff via magic bytes (not just extension), size check, dimension probe via `createImageBitmap`
2. **Decode** — `createImageBitmap(file, { imageOrientation: 'from-image' })` to handle EXIF and produce an `ImageBitmap`
3. **Normalize** — paint into an `OffscreenCanvas` at ≤1024 px on the longest edge with `imageSmoothingQuality = 'high'`
4. **Convert** — re-encode to **WebP lossless** (quality 0.9) for the master, plus a 64 × 64 WebP thumbnail for the item picker
5. **Store** — write the master Blob, thumbnail Blob, and metadata to IndexedDB; create a fresh `URL.createObjectURL(blob)` for in-session rendering

### Where Assets Live
- **In-session display:** `Blob` URLs (one per item, revoked on session end or item deletion)
- **Persistence:** IndexedDB (see Section 12 for wrapper choice) — three object stores: `images`, `thumbnails`, `lists`
- **No base64 in memory.** Base64 is reserved for export/share URL serialization only, and only when explicitly requested
- **No server upload in MVP.** All processing is client-side

### Memory Budget
A heavy session of 200 images at 500 KB raw average yields ~100 MB of Blob data + ~20 MB of decoded `ImageBitmap` instances + ~10 MB of thumbnails ≈ **130 MB resident**. This fits comfortably under the 500 MB ceiling defined in Section 6. Mitigations for edge cases:
- Cap working-masters at 512 × 512 for free tier → halves Blob memory
- Aggressive `URL.revokeObjectURL` on item deletion
- Reuse `ImageBitmap` instances; don't re-decode per render

---

## 2. Image Normalization Strategy

### Display Tile Size
- **On-screen tile:** 96 × 96 CSS px (logical)
- **Retina working bitmap:** 192 × 192 device px (2× DPR), WebP
- **Export tile:** 96 × 96 logical px in the canvas coordinate system, painted at the export DPR (default 2× → 192 × 192 raster px)
- The same bitmap (192 × 192 WebP) is used for both screen and export. **One source of truth per item.**

### Resize Algorithm
`createImageBitmap(blob, { resizeWidth, resizeHeight, resizeQuality: 'high' })` is the chosen path. It runs the resize on the browser's image decoder when supported, falling back to `OffscreenCanvas.drawImage` with `imageSmoothingQuality = 'high'` (which maps to Lanczos-like resampling in Chromium, bilinear in Firefox/Safari — acceptable for ≤2× downscales).

### Format Conversion Policy
- **Master storage:** WebP lossless, quality 0.9 — typically 30–50% smaller than PNG for photographic content, identical for flat-color UI art
- **Thumbnail:** WebP, quality 0.7, 64 × 64
- **Originals:** discarded after normalization; user re-uploads if they want the original back. This is acceptable for tier list memes.
- **Export:** PNG (lossless, supports transparency). The exporter always rasterizes to PNG regardless of source format.

### Thumbnail Generation
Generated synchronously during upload, before the item is added to the picker UI. The 64 × 64 thumbnail prevents the picker grid from being a memory sink when users have hundreds of items.

### EXIF Orientation
Always honored via `imageOrientation: 'from-image'` on `createImageBitmap`. Never read EXIF ourselves — let the decoder do it. Strip EXIF entirely after decode (we don't keep it; not relevant to a tier list).

### sRGB Color Space
Default and only working color space. Canvas color space is left at default (sRGB). Tier row colors are interpreted as sRGB hex. We do not implement wide-gamut or P3 export in MVP.

---

## 3. Canvas Rendering Approach

**Decision: (B) Custom Canvas2D render** for export.

### Justification
- **Determinism:** html2canvas and dom-to-image produce visually-different output across browsers and font-loading states. We can't ship an export that's "right on Chrome, slightly off on Safari."
- **CORS safety:** html2canvas will silently fail to embed cross-origin images without CORS headers, producing broken tiles. Custom render via `createImageBitmap` on already-decoded Blobs sidesteps this entirely.
- **Performance:** html2canvas clones the entire DOM and serializes styles — O(N) where N is the visible element count. Our export is O(items + tiers), independent of editor chrome.
- **Pixel parity:** The on-screen layout and the export layout use the same layout constants (tile size, gap, row height, label width). Drawing both with the same code path is impossible, but drawing them with the same *math* (tile size = 96, gap = 8, label width = 80) is straightforward.

The on-screen tier list is rendered with HTML/CSS (divs, CSS Grid, transforms). The export is rendered with Canvas2D using an identical layout spec. A small shared `layout.js` module exports the constants used by both.

---

## 4. Export Pipeline — PNG Generation

**Decision: PNG output, confirmed.** WebP is rejected as the primary export format because tier lists are commonly re-uploaded to social platforms, image hosts, and Discord — all of which assume PNG/JPEG.

### Step-by-Step
1. **Serialize state.** Snapshot `{ tiers: [{id, label, color, items: [{id, assetId, x?, customSize?}]}, background, dimensions }]` from the editor store. Custom per-tile `x` and `customSize` are honored if the user resized a tile.
2. **Pre-load all images.** Fetch each asset Blob from IndexedDB and decode via `createImageBitmap` in parallel with `Promise.all`. **Never** await `Image` element `onload` for export — `Image` can race with the canvas draw and produce blank tiles.
3. **Create canvas.** Width = `(labelWidth + itemsAreaWidth) × DPR`; Height = `tiers.length × rowHeight × DPR`. Default DPR = 2.
4. **Paint background.** Solid color, transparent, or pattern (user choice). Painted first, before any row.
5. **Paint tier rows.** Left-to-right: label cell (color fill + label text), then item cells starting at the left edge of the items area with the configured gap.
6. **Paint item tiles.** Each tile is `drawImage(bitmap, dx, dy, tileSize, tileSize)` clipped to the row's items area. Tiles outside the row bounds are not painted.
7. **Encode.** `canvas.convertToBlob({ type: 'image/png' })` (OffscreenCanvas) or `canvas.toBlob(cb, 'image/png')` (regular canvas).
8. **Trigger download.** Prefer `showSaveFilePicker()` (File System Access API) where supported, fall back to anchor `<a download>` with the Blob URL.
9. **Cleanup.** Revoke the Blob URL, close the OffscreenCanvas if used.

### Edge Cases
- **CORS-tainted canvas:** Not a risk — we never draw third-party URLs directly. All images are local Blobs decoded via `createImageBitmap`.
- **Very long lists (>100 items, >20 tiers):** Offload rendering to a Web Worker using `OffscreenCanvas` + `transferControlToOffscreen()` from the main thread. The worker holds the image bitmaps, renders, and posts the Blob back.
- **Retina:** All paint calls multiply coordinates by `DPR`; `ctx.scale(DPR, DPR)` is set once at the top of the render function. The canvas's `width`/`height` attributes are set in device pixels; CSS size in logical pixels is irrelevant (the canvas is detached).

---

## 5. High-DPI / Retina Export

**Decision: Default DPR = 2, user-toggleable 1×/2×/3×.**

### Coordinate System
The export uses a **logical-pixel coordinate system** internally. Layout math (tile size 96, gap 8, label width 80, row height 112) operates in logical px. A single `ctx.scale(DPR, DPR)` is applied immediately after canvas setup. Font sizes use `ctx.font = '20px Inter, system-ui, sans-serif'` — the browser scales with the transform.

### Text Rendering
- Canvas text rendering has no direct font-hinting control, but `imageSmoothingEnabled = true` and `imageSmoothingQuality = 'high'` on the *canvas* (not the text path) help with bitmap scaling
- Text uses `'geometricPrecision'` semantics implicitly by being painted at the target device size — never upscaled from a smaller font size
- Font smoothing (grayscale vs. subpixel) is browser-controlled; we accept the platform default to match on-screen rendering

---

## 6. Performance Budget

| Metric | Target | Strategy |
|---|---|---|
| Cold load → interactive | < 2.0 s (mid-range laptop, cable broadband) | Inline critical CSS, defer non-critical fonts, lazy-load export worker module |
| Drag interaction | 60 fps (16.6 ms/frame) | `transform`-only mutations on the dragged tile, no layout thrash, no React reconciliation mid-drag |
| Export of 10-tier, 100-image list | < 1.0 s | OffscreenCanvas worker, parallel `createImageBitmap` decode, single paint pass |
| Memory ceiling (heavy session) | < 500 MB | Per-session Blob cap (200 masters), thumbnail-only mode for the picker grid above 50 items |

The export target is the most aggressive; if missed, we degrade by streaming tiles to the canvas in chunks rather than holding all bitmaps resident at once.

---

## 7. Drag-and-Drop Rendering

**Decision: dnd-kit** as the primary drag-drop library.

### Why dnd-kit
- Built-in **keyboard accessibility** (arrow-key reorder, screen reader announcements)
- **Touch + pointer unified** via PointerSensor / TouchSensor — no separate mobile code path
- Custom **DragOverlay** for the ghost element — we render a 96 × 96 div with the item bitmap, transformed via CSS for smoothness
- Lightweight (~10 KB gz) and framework-agnostic

### When HTML5 Drag and Drop Would Be Considered
Not used. The native HTML5 DnD API has poor touch support, ugly browser ghost images that can't be customized cross-browser, and no keyboard story. There's no scenario where it beats dnd-kit for this product.

### Visual Feedback
- **Ghost:** rendered via dnd-kit's `DragOverlay` portal, follows pointer, slight scale (1.05) and shadow
- **Drop indicator:** a 2-px animated line or ghost tile outline in the destination slot, painted as a sibling of the dragged item
- **Snap-to-slot:** the tile animates into its final position with a 150 ms `transform` transition after drop (FLIP technique — record First and Last positions, Invert the difference, Play the transition)

---

## 8. Font & Text Rendering for Export

### Web Font Strategy
- **Self-host 2 fonts:** `Inter` (sans, UI + tier labels) and `JetBrains Mono` (mono, optional small-label variant). Both woff2, subset to Latin + common punctuation.
- **Loading:** `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `<head>` for Inter only; JetBrains Mono lazy-loaded.
- **CSS:** `font-display: swap` so text is always visible; export waits for `document.fonts.ready` before encoding.

### Font Embedding in Export
**Decision: system font stack by default; web font embedding is opt-in for Pro tier.**

- Default tier labels use `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`. Most users get Inter if it's loaded locally; everyone gets a clean sans fallback. The export rasterizes whatever font the browser resolved.
- For Pro users who want pixel-identical export across devices, fetch the woff2 at export time, base64-embed it, and build a `@font-face` rule in a hidden DOM node, then trigger a re-paint. **This is deferred to v1.1** — the v1 export font is whichever sans-serif the user's browser resolves.

### Parity Between Editor and Export
Both surfaces use the same font stack and the same font-size/length metrics. Tier labels truncate with `…` at the same width in both. We deliberately do not allow font customization in MVP (no "Comic Sans tier lists") to keep parity trivial.

---

## 9. Color Management

### Working Color Space
sRGB throughout. `canvas.getContext('2d', { colorSpace: 'srgb' })` is the default and only setting.

### Color Picker
- Native `<input type="color">` as the default, supplemented by a **6-slot custom palette** that persists per-user in IndexedDB
- Output is sRGB hex; never ICC-tagged

### Tier Row Fill Style
**Decision: flat fill by default. No gradient or texture.**

Tier lists are a meme format. The aesthetic is flat color blocks + raster images. Adding gradients or noise textures to the row background would clash with the genre and reduce the recognizability of the output. We provide a "Background pattern" toggle (OFF by default) for users who want a subtle dot-grid or diagonal-stripe overlay behind the entire tier list, applied at export time only.

---

## 10. Animation & Motion Strategy

### What's Animated (CSS)
- Tile hover: 100 ms `transform: scale(1.02)` on the tile
- Row hover: 80 ms background-color shift on the row's color cell
- Drag ghost: dnd-kit's default transform transition
- Tier reorder: FLIP, 200 ms `transform` on tiles transitioning between slots

### What's Animated (JS)
- None for MVP. FLIP is implemented once in the dnd-kit onDragEnd handler.
- **No scroll-linked animations, no parallax, no spring physics** — they're expensive to re-implement in canvas export and add nothing to a tier list meme.

### Export vs. On-Screen Parity
The export is **deliberately not pixel-identical** to the on-screen view in the following ways:
- No hover state (no scale, no shadow)
- No drop indicator
- No transient drag styles
- No focus rings (the export represents the *finished* tier list, not the *editing* state)

The layout — tile positions, sizes, row heights, label widths — is **identical**. Both paths consume the same layout constants from `layout.js`.

---

## 11. Browser & Platform Constraints

### Support Target
Latest **2 stable versions** of Chrome, Firefox, Safari, and Edge. No IE, no legacy Edge.

### Safari Quirks
- **OffscreenCanvas:** supported since Safari 16.4 (March 2023); acceptable
- **CORS canvas tainting:** Safari is strictest — `crossOrigin = 'anonymous'` is required on any non-local image; we sidestep this by using Blobs
- **Async modules:** supported, no issues
- **`createImageBitmap` with resize options:** supported in Safari 16+

### Mobile
- **iOS Safari:** touch works via dnd-kit's `TouchSensor`; no special polyfill needed
- **Android Chrome:** identical to desktop Chrome's pointer behavior
- **Memory pressure:** iOS Safari aggressively evicts IndexedDB; lists should auto-save to localStorage as a last-resort snapshot every 30 s

### IndexedDB Limits
- Per-origin quota varies: ~50% of disk free on Chromium, browser-managed on Firefox, ~1 GB starting on Safari before prompt
- Mitigation: detect `navigator.storage.estimate()` and warn the user at 80% usage; offer "Export everything as a single `.tierlist` archive" before storage fails

---

## 12. Tech Stack Recommendations (Art-Adjacent Only)

| Concern | Choice | Rationale |
|---|---|---|
| Image processing | **Vanilla `createImageBitmap` + `OffscreenCanvas`** | No dependencies; native, fast, supported everywhere we target |
| Drag-drop | **dnd-kit** | Accessibility + touch + custom drag overlay in one library |
| Export | **Custom Canvas2D** (no html2canvas) | Determinism, CORS safety, cross-browser consistency |
| State persistence | **Dexie** (IndexedDB wrapper) | Schema versioning, indexes, transactions — idb-keyval is too thin |
| Storage format | **JSON metadata + separate Blob store** | JSON in IndexedDB holds IDs and layout; Blobs live in a sibling store. For *share URLs*, the user opts into a "Bundle as ZIP" export rather than inline base64 |
| Color picker | **Native `<input type="color">` + custom palette UI** | Native is accessible; we don't need react-color |
| Animation primitives | **CSS transforms + a single FLIP helper** | No Framer Motion, no GSAP — overkill for a meme app |

---

## 13. Quality Assurance Checklist

### Visual Regression
- **Tool:** Playwright + `pixelmatch`
- **Baseline:** a fixed corpus of 20 representative tier lists (varying item counts, custom colors, font sizes, edge cases) exported on each PR
- **Threshold:** ≤ 0.1% pixel diff acceptable (anti-aliasing noise)

### Cross-Browser Export Verification Matrix
| Browser | Platform | DPI | Status |
|---|---|---|---|
| Chrome 120+ | Win / Mac / Linux | 1×, 2× | Required |
| Firefox 120+ | Win / Mac / Linux | 1×, 2× | Required |
| Safari 17+ | Mac | 1×, 2× | Required |
| Safari iOS 17+ | iPhone | 3× | Required |
| Edge 120+ | Win | 1×, 2× | Required |

### CORS Pitfalls Checklist
- Never load images from third-party URLs into the export canvas; always go through local Blob decode
- If we later add "import from URL", proxy the fetch through a same-origin endpoint or use `crossorigin` and accept the failure mode
- `crossOrigin = 'anonymous'` on every `<img>` that *might* be promoted to canvas (currently none, but documented for future contributors)

### Edge-Image Test Cases
- 1 × 1 pixel image — should display at 96 × 96 (upscaled), no crash
- 10 000 × 10 000 pixel image — must be downscaled on import to ≤ 1024 × 1024
- Animated GIF — first frame extracted, the GIF's animation flag is set in metadata
- Broken/corrupt file — graceful error toast, no crash, no partial add
- 0-byte file — rejected at validation
- File with `image/svg+xml` — rasterized to PNG via `<img>` + canvas on import
- File with EXIF rotation — orientation honored
- File with ICC P3 profile — treated as sRGB (slight color shift acceptable, documented)

---

## 14. Open Questions

1. **Animated GIF export** — single PNG first frame, animated APNG, animated WebP, or no GIF support? APNG is the only widely-supported animated format that survives a re-upload to Twitter/Discord; WebP animation is better but less compatible.
2. **Shareable URLs** — inline image data as data URLs (size-limited, ~2 MB practical ceiling) or server-side image cache requiring a backend?
3. **Max items per tier row** — wrap to multiple visual rows, or scroll horizontally within the row?
4. **Background patterns** — ship a curated set (dot grid, diagonal stripes, solid, transparent), or accept arbitrary user-uploaded textures?
5. **Tier count** — fixed at 6 (S/A/B/C/D/F) with add/remove rows, or fixed at 6 with no custom rows?
6. **Watermark on free tier** — "Made with Tier Monkey" footer in light gray, or none?
7. **Custom image upload from URL** — supported, blocked by CORS, or proxied server-side?
8. **Dark / light theme export parity** — export always uses the tier colors the user picked, regardless of editor theme?
9. **Undo / redo scope** — per-item-placement only, or full state including label renames and color changes?
10. **Mobile-first vs. desktop-first layout** — desktop is the obvious design target; do we accept a degraded mobile experience, or design mobile-first?

These questions should be resolved before the export module reaches feature-complete status.