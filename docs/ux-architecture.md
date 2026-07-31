# Tier Monkey — UX Architecture Foundation

**Version:** 1.0
**Author:** ArchitectUX
**Status:** Foundation locked. Ready for design system + implementation.

---

## 1. User Personas

### Maya "MemeMaya" — The Casual Sharer
- **Role:** 19-year-old college student, active on Discord and TikTok
- **Goals:** Make a tier list of her favorite anime characters in 3 minutes, screenshot it, post it in her group chat
- **Frustrations:** Editing tools that require accounts, slow uploads, watermarks she can't remove
- **Tech comfort:** High. Lives in creative apps (CapCut, Canva, TikTok editor)
- **Devices:** Primarily phone (iPhone 14), sometimes laptop

### Devon "TierDev" — The Content Creator
- **Role:** 28-year-old YouTuber/Redditor who posts weekly tier list content
- **Goals:** Produce a polished, branded tier list video thumbnail every week; iterate on the same list multiple times before publishing
- **Frustrations:** Losing work when the browser refreshes; not being able to save drafts; having to redo work when one image gets deleted
- **Tech comfort:** Very high. Builds spreadsheets, knows what an API is.
- **Devices:** Desktop (Windows) for editing, phone for quick reference

### Priya "Dr. Rank" — The Analyst
- **Role:** 34-year-old product manager comparing vendor options for a procurement decision
- **Goals:** Build a defensible, side-by-side ranking of 12 SaaS tools with custom criteria and weights, export it as a PNG for her deck
- **Frustrations:** Tier lists built only for memes — needs custom tier names like "Strong Fit / Possible / Weak / Reject", neutral colors, and the ability to add notes per item
- **Tech comfort:** Medium. PowerPoint native, comfortable with web tools.
- **Devices:** Desktop (MacBook Pro), sometimes iPad

### Casey "Template Carl" — The Lurking Starter
- **Role:** 25-year-old who saw a cool tier list on Twitter and wants to make one but doesn't know where to start
- **Goals:** Find a template (e.g., "Pokémon starters tier list"), clone it, swap in his favorites, share back
- **Frustrations:** Blank canvases are intimidating; doesn't want to upload 100+ items manually
- **Tech comfort:** Medium-low. Uses web apps as a consumer, not a power user.
- **Devices:** Phone primarily, laptop sometimes

---

## 2. Core Jobs-To-Be-Done

1. **When** I have a hot take about how things stack up, **I want to** drop a bunch of images into rows quickly and rank them, **so I can** share the result before the take cools off.

2. **When** I find a tier list template I like, **I want to** clone it and modify the contents, **so I can** remix community content without starting from zero.

3. **When** I'm mid-creation and accidentally delete an image, **I want to** undo the action instantly, **so I can** keep my flow without losing 20 minutes of work.

4. **When** I want to share my tier list, **I want to** download a clean PNG or generate a short link, **so I can** post it on any platform without re-explaining my reasoning in text.

5. **When** I'm comparing 10+ items seriously, **I want to** reorder tiers, rename them, and recolor them, **so I can** model my actual mental model instead of being forced into S/A/B/C/F.

6. **When** I'm on my phone, **I want to** drag items with my finger and have the canvas behave predictably, **so I can** actually finish a tier list without switching devices.

7. **When** I close my browser and come back tomorrow, **I want to** find my draft exactly where I left it, **so I can** continue without starting over.

8. **When** I need to share an item that only exists as a URL (mascot, logo, screenshot), **I want to** paste the URL and have it appear, **so I can** include assets I don't have saved locally.

---

## 3. Primary User Flows

### a) First-Time User — First Tier List

1. Land on `/` (canvas page). No auth required.
2. See empty state: "Welcome to Tier Monkey" with default S/A/B/C/D/F rows pre-rendered, plus an empty image pool at the bottom. **(Decision: blank canvas with default rows — not an empty page. Reduces friction.)**
3. Click "Upload" or drag images onto the canvas.
4. Images appear in the pool (bottom tray).
5. Drag an image from the pool into the S row. Visual feedback: image lifts, drop zones highlight.
6. Drop. Image snaps to row, reflows siblings.
7. Repeat for remaining items, ranking as they go.
8. Optionally rename tiers (double-click label) and recolor (click color swatch).
9. Click "Export" → choose PNG → download.

**Decision points:**
- After 5 images placed, surface a non-blocking tip: "💡 You can rename tiers by double-clicking the label."
- If user closes tab, autosave prompt fires: "Save as draft?" → Yes saves to local IndexedDB.

### b) Returning User — Edit Saved List

1. Land on `/`. Top-right shows "Recent" with last 3 drafts (thumbnail + name + last-modified).
2. Click draft → loads state from IndexedDB → canvas repopulates with rows and images.
3. (Alternative path: `/draft/:id` deep link if user bookmarked.)
4. All edits autosave on debounce (1s after last change).
5. "Discard" button in header clears current draft (with confirm).

### c) Uploading Images

**Three input methods, all wired to the same handler:**

1. **Drag-drop:** Drag files from OS onto canvas → overlay highlights "Drop here" → drop → uploads process in parallel.
2. **File picker:** Click "Upload" button → native picker → multi-select supported.
3. **URL paste:** Paste image URL into URL input (in upload zone, expandable) → fetch → CORS check → add to pool. On CORS fail, show inline error "Can't fetch — try saving the image and uploading directly."

**Processing states:**
- File >5MB: show thumbnail during resize (downscale to max 512px longest edge, keep aspect). Original discarded.
- Non-image MIME: rejected with inline error "Not a supported file (PNG, JPG, GIF, WebP)."
- Animated GIF/WebP: preserve animation.

### d) Customizing Tiers

1. **Rename:** Double-click tier label → label becomes editable input → Enter or blur commits → Escape reverts.
2. **Recolor:** Click color swatch (left of label) → popover opens with: 12 preset swatches + custom hex input (`#RRGGBB`) + opacity slider. Click swatch or press Enter on hex to commit.
3. **Add row:** Click "+ Add Tier" button below the last row → new row inserted with default label "New Tier" and default color (gray #95a5a6). New row appears at the position clicked (top or bottom — UI gives explicit choice).
4. **Remove row:** Hover row → trash icon appears top-right → click → confirm if row has items ("Move items to pool?" or "Delete permanently").
5. **Reorder rows:** Drag the row handle (left edge) up/down. Drop zones highlight between rows. All items move with their row.
6. **Reorder items within a row:** Drag-drop horizontally. Same animation, no resnap delay.

### e) Exporting / Sharing

**Export modal opens. User chooses:**

1. **Download as PNG:** Default. Shows preview at chosen resolution (1200×auto / 1920×auto / 2560×auto). Background: opaque (default) or transparent. Watermark toggle. Quality slider for JPG if format=JPG.
2. **Copy to clipboard:** Same options, copies PNG bitmap. Useful for quick paste into Discord/Slack.
3. **Share via link:** Generates a short URL (`tiermonkey.app/s/:token`). **Decision: v1 link encodes JSON state as base64 in URL fragment — works offline, no backend needed, but links break if list is too large (>2MB encoded). v2 will add server-side image hosting for large lists.** See Open Questions.

### f) Loading a Template or Starting from Blank

1. From empty state, two buttons: "Start from template" and "Start blank."
2. "Start from template" opens a modal with curated templates: Pokémon Starters, Fast Food, Anime Waifus, Programming Languages, Custom (upload your own JSON).
3. Click a template → loads its tier structure + (optionally) image URLs into the pool. User can swap any image.
4. "Start blank" → starts with S/A/B/C/D/F default but empty pool.

---

## 4. Information Architecture

### Sitemap

```
/                       (Canvas — main editor; same route for new + drafts via ?draft=:id)
/templates              (Template gallery — full page route)
/templates/:id          (Template preview before load)
/about                  (Static about page)
/help                   (FAQ + keyboard shortcuts)
```

**Decision: single-page canvas. No nested routes inside the editor.** Modal-over-canvas pattern keeps state simple and avoids losing work on navigation.

### Modal vs. Page Decisions

| Surface | Type | Reason |
|---|---|---|
| Canvas | Page | Primary workspace |
| Export modal | Modal overlay | Discrete task, doesn't lose canvas |
| Color picker | Popover (anchored to swatch) | Inline editing feel |
| Tier label editor | Inline (no modal) | Direct manipulation |
| Image alt-text editor | Inline on hover/select | Lightweight |
| Template gallery | Page (separate route) | Browsable, shareable URL |
| Share link result | Toast + clipboard | Ephemeral confirmation |
| Settings | Modal | Rare access, contextual |
| Confirm destructive ops | Modal | Forces attention |

### Persistence Strategy

| Data | Where | Why |
|---|---|---|
| Current draft state (rows, labels, colors, image metadata) | **IndexedDB** | Survives refresh, can store binary |
| Image binary data | **IndexedDB as Blob** | localStorage 5MB limit too small |
| Recent drafts list | **IndexedDB** (separate store) | Powers "Recent" widget |
| User preferences (theme, default tier count) | **localStorage** | Tiny, synchronous, fine here |
| Shared link payload | **URL fragment** | No server needed for v1 |
| Template gallery data | **Static JSON in app bundle** | Curated, infrequent change |

**Auto-save trigger:** debounced 1 second after any mutation. Visual indicator in header: "Saved • 3s ago."

---

## 5. Interaction Patterns & Component Inventory

### Tier Row
- **Drag target:** accepts images from pool or other rows
- **Reorderable:** drag handle on left edge; rows can be moved up/down between siblings
- **Color swatch:** left of label, 28×28px, click opens popover
- **Label:** double-click to edit inline; single-click selects the row
- **Delete:** trash icon appears on row hover (top-right corner)
- **Empty state:** shows ghost placeholder "Drop items here"
- **Full state:** horizontal flex, wraps if too many items (desktop) or scrolls horizontally (mobile)

### Image Card
- **Default size:** 80×80px square thumbnail, object-fit: contain
- **Resize:** bottom-right handle, drag to scale 40–200px (snaps to 10px grid). Aspect ratio locked.
- **Delete:** hover shows × button top-right. Confirm only if bulk delete (Shift+click multi-select).
- **Alt text:** hover shows edit icon → inline popover with text input. Required for accessibility before export.
- **Drag source:** entire card is grabbable; cursor changes to grabbing; card lifts (scale 1.05, shadow, z-index raise).
- **Selection:** click selects (shows blue ring); Shift+click multi-select for bulk move/delete.

### Image Tray (Unsorted Pool)
- **Location:** bottom of canvas, horizontal scroll strip, always visible (collapsible on mobile).
- **Capacity:** unlimited scroll, virtualized if >100 items.
- **Upload zone:** trailing + button reveals file picker; whole tray is also drop-target.
- **Empty state:** "Drop images here to start" with upload icon.

### Tier Label Editor
- **Inline:** double-click label → swaps `<span>` for `<input>`. Width auto-fits content.
- **Keyboard:** Enter commits, Escape reverts, max 24 chars.

### Color Picker
- **Anchor:** anchored popover, opens upward from swatch.
- **Layout:** 4×3 preset grid (12 colors, neutral palette) + custom hex input + (optional) opacity slider.
- **Behavior:** real-time preview as user types hex; commit on Enter or blur.

### Upload Zone
- **Triple mode:**
  - Drag-drop overlay on canvas + tray (full canvas on dragenter)
  - File picker button
  - URL input field (collapsible, "Paste image URL" link)
- **Progress:** per-file thumbnail grows in tray; failed files show error chip with retry.

### Export Modal
- **Layout:** left = live preview, right = options.
- **Options:** Resolution (3 radio presets), Background (opaque/transparent), Watermark (toggle, default off), Format (PNG/JPG), Filename (editable text).
- **Actions:** Cancel (closes), Download (triggers save), Copy to Clipboard (alt button).

### Share Link
- **Generation:** encodes current state to base64, packs into URL fragment.
- **Display:** toast on success with copy button; click-to-copy with visual confirmation.
- **Size guard:** if encoded >2MB, show warning "Link too long — use PNG export instead."

### Undo / Redo
- **History stack:** last 50 actions stored as command pattern.
- **Triggers:** Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac); buttons in header.
- **Granularity:** each tier move, rename, color change, image add/remove/move/resize = 1 step. Multi-select bulk = 1 step.
- **Scope:** session-only. (Cross-session undo is out of scope for v1.)

### Keyboard Shortcuts

| Key | Action |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + S | Force save (also auto-saves) |
| Ctrl/Cmd + E | Open export modal |
| Delete / Backspace | Delete selected item(s) or row |
| T | Add new tier |
| U | Open upload |
| ? | Show shortcut overlay |
| Esc | Close modal / cancel drag |
| Tab | Move focus through tier rows |
| Arrow keys (with focus on row) | Move focused item within row |
| Enter (on selected item) | Open alt-text editor |

---

## 6. Empty / Loading / Error States

### Empty Canvas (First Visit)
Shows the default S/A/B/C/D/F skeleton rows already rendered, with the image pool empty and a hero CTA inside the pool: "Drop images here, or click to upload. Don't have images? Start from a template."

### Empty Pool, Rows Exist
Rows show ghost placeholders "Drop items here" in dashed outline.

### Zero Rows (User Deleted All)
Show inline prompt: "Add a tier to start ranking." Button: "+ Add Tier."

### Image Upload Failure
- **Too large (>10MB pre-resize):** inline error chip on upload zone — "Some files too large (max 10MB)" with list of filenames.
- **Wrong format:** chip — "Unsupported file type — PNG, JPG, GIF, WebP only."
- **Failed URL fetch:** chip — "Couldn't load image from that URL. Check the link or upload the file directly."
- **CORS-blocked URL:** chip — "That image can't be loaded for sharing. Try downloading it and uploading directly."

### Save Failure
- IndexedDB quota exceeded → modal: "Storage full. Remove old drafts to continue." Link to drafts manager.

### Share Link Failure
- Encoded payload >2MB → warning: "Your list is too complex for a shareable link. Export as PNG instead."
- Clipboard API denied (rare) → fall back to showing the URL in a copy-field.

### Loading States
- Image processing: shimmer placeholder in tray, becomes real thumbnail.
- Template load: skeleton rows + spinner.
- Export generation: modal shows progress bar with "Rendering... 47%" — disable close until done.

---

## 7. Responsive Behavior

### Desktop (>1024px) — Primary
- Full canvas with all controls visible.
- Drag-and-drop is the primary interaction. Cursor changes on hover.
- Tray docked at bottom, full-width, scrollable horizontally.
- Multi-select via Shift+click + drag-rect marquee.

### Tablet (768–1024px)
- Same layout as desktop, slightly tighter spacing.
- Touch fallback active: long-press (300ms) to pick up, drag with finger.
- Two-finger pinch on selected image to resize.
- Tray becomes collapsible bottom drawer.

### Mobile (<768px)
- **Canvas scrolls vertically** through tiers. Each tier row scrolls horizontally internally.
- **Long-press to drag:** 300ms hold → item lifts (scale + shadow) → drag with finger → release.
- **No resize handles** on touch (precision is too low). Instead: tap item → action sheet appears with "Resize: Small / Medium / Large" options.
- **Tier label editor:** tap label → full-screen modal text input (better than inline on small screens).
- **Color picker:** tap swatch → bottom-sheet picker instead of popover.
- **Upload zone:** tray becomes a full-width sticky bar at bottom with prominent + button.
- **No multi-select in v1 mobile** — keep it simple.

---

## 8. Accessibility

### Keyboard Navigation
- All interactive elements reachable via Tab in logical order: header → top tier → next tier → ... → pool → footer controls.
- Within a tier row, arrow keys move focus between items. Space/Enter "picks up" focused item for repositioning via arrow keys.
- Drag operation fully keyboard-operable: focus an item → Space to pick up → arrow keys move → Space to drop. Live region announces each move.
- Escape cancels an in-progress drag.

### Screen Reader Announcements
- ARIA live region (`aria-live="polite"`) announces: item moved to row, tier renamed, tier added, tier deleted, image added, etc.
- Tier rows use `role="list"`; items use `role="listitem"`. Pool uses `role="region"` with `aria-label="Unsorted images"`.
- Drag operations announce source and destination: "Pikachu moved from S tier to A tier."
- Export completion: "Tier list exported as PNG to Downloads."

### Color Contrast
- Tier labels must meet WCAG 2.1 AA (4.5:1) against their row backgrounds. Color picker warns if chosen swatch fails check.
- Default tier colors pre-tested for contrast; custom hex validated with hint if too low.
- Selection ring uses 3px outline + offset, never relies on color alone.

### Focus Management
- On modal open, focus moves to first interactive element inside; trap focus within modal.
- On modal close, focus returns to the trigger element.
- Tier-row color popover traps focus until dismissed.
- All focus indicators visible (2px outline + offset) — no `outline: none` without replacement.

---

## 9. Open Questions / Decisions Needed

These should be resolved before the design system is finalized.

1. **GIF support** — Do we preserve animation in uploaded GIFs, both on canvas and in exported PNG (which would need GIF/WebP export)? Recommendation: yes for canvas, PNG export stays static. Confirm with team.

2. **Shared link payload size** — v1 caps at ~2MB encoded. Do we build a server-side image hosting service for v2, or accept the limit? Recommendation: ship v1 with URL-fragment-only, queue server hosting for v2.

3. **Image storage during sharing** — If a user shares a URL, the recipient's browser must be able to fetch the original images (CORS-permitting). Do we proxy via our server? Or restrict "shareable" tier lists to images we host? Recommendation: v1 is "best effort" — if recipient sees broken images, they see a notice.

4. **Multi-list vs single active list** — Do users work on one list at a time with autosave, or maintain a dashboard of many drafts? Recommendation: dashboard of drafts from day one (low cost, high value).

5. **Notes per item** — Priya wants to add reasoning text. Do we add a "note" field per item? Recommendation: yes, optional, stored in metadata; show as tooltip on hover in canvas, included in PNG export as small caption.

6. **Authentication** — Do we need accounts for v1, or is everything local + shareable-link only? Recommendation: no accounts in v1. Reduces friction 10x. Add accounts in v2 for cross-device sync.

7. **Collaborative editing** — Is real-time multi-user editing on the roadmap? Recommendation: explicitly out of scope for v1. Plan data model to be CRDT-friendly for future.

8. **Watermarking policy** — Do we always include "Made with Tier Monkey" watermark for shared links (free marketing), with option to remove for paid tier? Recommendation: no watermark by default; consider after launch.

9. **Mobile resize interactions** — Are action-sheet size presets sufficient, or do we need pinch-zoom? Recommendation: presets only for v1; revisit if analytics show resize is a top mobile friction point.

10. **Template submission** — Do users submit their own templates to a public gallery? Recommendation: out of scope for v1, but design template data structure to be portable.

---

## ASCII Wireframes

### Wireframe 1: Main Canvas (Mid-Edit)

```
+----------------------------------------------------------------------+
| 🐵 Tier Monkey  [Templates]  [Save ✓]  [Export]  [?]  [⚙]   [🌓]    |
+----------------------------------------------------------------------+
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │▓▓│ S  (Goated)                                          [🗑]    │  |
| │██│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │  |
| │██│  │img │ │img │ │img │ │img │ │img │ │img │   Drop here →    │  |
| │██│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │▓▓│ A  (Great)                                          [🗑]    │  |
| │██│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                                │  |
| │██│  │img │ │img │ │img │ │img │   Drop here →                  │  |
| │██│  └────┘ └────┘ └────┘ └────┘                                │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │▓▓│ B  (Good)                                           [🗑]    │  |
| │██│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │  |
| │██│  │img │ │img │ │img │ │img │ │img │ │img │                  │  |
| │██│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
|                    [ + Add Tier ]                                    |
|                                                                      |
| ─────────────────────────────────────────────────────────────────── |
| Unsorted:  [img] [img] [img] [img]  [img] [img]  [img]  [+ Upload] │
| ─────────────────────────────────────────────────────────────────── |
| Saved • 2s ago                                         14 items     |
+----------------------------------------------------------------------+
```

Legend: `▓▓` = color swatch (editable); `▒▒` = drag handle; `[🗑]` = hover delete

---

### Wireframe 2: Export Modal

```
+----------------------------------------------------+
|  Export Tier List                            [X]   |
+----------------------------------------------------+
|                          |                         |
|     ┌─────────────────┐  |  Output                 |
|     │                 │  |  ───────                |
|     │   [preview of   │  |  Resolution             |
|     │    tier list    │  |  ○ 1200 × auto          |
|     │    rendered]    │  |  ● 1920 × auto          |
|     │                 │  |  ○ 2560 × auto          |
|     │                 │  |  ○ Custom: ___ × ___    |
|     └─────────────────┘  |                         |
|                          |  Background             |
|     1920 × 1080          |  ● Opaque (white)       |
|     Preview at 50%       |  ○ Transparent          |
|                          |  ○ Match canvas         |
|                          |                         |
|                          |  Format                 |
|                          |  ● PNG                  |
|                          |  ○ JPG (95% quality)    |
|                          |                         |
|                          |  Filename               |
|                          |  [my-tier-list.png]     |
|                          |                         |
|                          |  [✓] Include watermark   |
|                          |       "Made with Tier    |
|                          |        Monkey"           |
|                          |                         |
|----------------------------------------------------+
|                                                  |
|       [ Copy to Clipboard ]   [ Download PNG ]    |
+----------------------------------------------------+
```

---

### Wireframe 3: Empty State (First Visit, Default Rows Present)

```
+----------------------------------------------------------------------+
| 🐵 Tier Monkey  [Templates]  [Save ✓]  [Export]  [?]  [⚙]   [🌓]   |
+----------------------------------------------------------------------+
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ S  (click to rename)                                   [🗑] │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ A                                              [🗑]          │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ B                                              [🗑]          │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ C                                              [🗑]          │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ D                                              [🗑]          │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
| ┌──┬──────────────────────────────────────────────────────────────┐  |
| │██│ F                                              [🗑]          │  |
| │██│      Drop items here →                                    │  |
| └──┴──────────────────────────────────────────────────────────────┘  |
|                                                                      |
|                    [ + Add Tier ]                                    |
|                                                                      |
| ═══════════════════════════════════════════════════════════════════ |
|                                                                      |
|     ╭──────────────────────────────────────────────────────────╮    |
|     │                                                          │    |
|     │           📥  Drop images here                           │    |
|     │              ────────────────                            │    |
|     │           or  [ Upload ]   [ Paste URL ]                │    |
|     │                                                          │    |
|     │           💡 Don't have images?                          │    |
|     │              [ Start from a template → ]                 │    |
|     │                                                          │    |
|     ╰──────────────────────────────────────────────────────────╯    |
|                                                                      |
+----------------------------------------------------------------------+
```

---

## Handoff Notes for LuxuryDeveloper

- **Foundation-first:** build the canvas with default S-F rows and an empty pool before any customization UI.
- **Persistence model is locked:** IndexedDB for everything binary/draft, localStorage only for preferences. Don't deviate.
- **Mobile parity is non-negotiable** even though desktop is primary — Casey and Maya need it to work.
- **Accessibility is not a stretch goal.** Every interactive component ships keyboard-operable from v1.
- **Open Questions (section 9) block design system choices on color picker scope, watermark policy, and template data shape.** Resolve these before the design system file gets written.

**Foundation complete. Ready for visual design system + implementation.**