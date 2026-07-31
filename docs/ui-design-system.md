# Tier Monkey — UI Design System & Screen Design Document

| | |
|---|---|
| **Product** | Tier Monkey — a shareable tier list maker |
| **Version** | 1.0 (initial system) |
| **Date** | 2026-07-31 |
| **Author** | UI Designer |
| **Status** | Ready for developer handoff |
| **Scope** | Brand, tokens, components, screens (Empty State, Canvas/Editor, Export Modal, Mobile reflow), motion, accessibility |

---

## 1. Brand Identity & Personality

### 1.1 Brand Voice — 5 Adjectives

1. **Playful** — the app is a toy as much as a tool. Dragging things should feel good.
2. **Irreverent** — a little cheeky, never corporate. We judge things here; that's the whole point.
3. **Energetic** — saturated color, snappy motion, big confident type.
4. **Approachable** — zero learning curve. Your mom can rank her soaps in 30 seconds.
5. **Opinionated** — the UI takes stances (one big yellow button, one obvious next step), mirroring the product's purpose: having opinions.

**Microcopy tone examples:**
- Empty state: "Nothing to judge yet. Coward."
- Upload: "Feed the monkey."
- Export success: "Certified banger. Go argue about it."
- Delete tier: "This tier had it coming."

### 1.2 Logo Concept Directions

**Direction A — "The Hanger" (CHOSEN):** A round, geometric monkey hanging by one arm from the top tier bar of a mini 3-bar tier list (red/orange/yellow bars). The monkey dangles below the S-tier like it's climbing the rankings. Works at 16px favicon (monkey head + single red bar) and at billboard size. Wordmark: "Tier Monkey" in Fredoka 600, "Tier" in ink, "Monkey" in banana yellow.

**Direction B — "Banana Stack" (fallback/app icon):** Three stacked tier bars where the top bar curls into a banana/S-curve hybrid, implying the letter S without text. More abstract, loses the mascot. Kept as the loading-splash and social-card mark.

Decision: **Direction A** — mascot-first branding gives us empty states, error states, and celebration moments for free.

### 1.3 Brand Color Philosophy

**"Meme-native, refined."** The classic tier-list rainbow (red → orange → yellow → green → blue → purple) is the product's DNA — it's instantly recognizable and we will NOT "elevate" it into a tasteful beige SaaS palette. The rainbow belongs to the tiers. The app chrome around it is the gallery wall: warm paper neutrals, one loud banana yellow for action, warm ink for text. The tension between calm chrome and loud tiers is the whole look.

Rules:
- Tier rows may be rainbow. Buttons may NOT be rainbow.
- One accent hue per screen region. Banana yellow means "primary action" everywhere, always.
- Neutrals are warm (yellow-undertone), never blue-gray. Cold grays make the tier colors look cheap.

### 1.4 Typography Personality

- **Fredoka** (display/headings, weights 500/600/700): rounded, chunky, confident — looks like a sticker. Used for tier labels, headlines, logo. This is the voice of the monkey.
- **Inter** (UI body, weights 400/500/600/700): invisible workhorse. Gets out of the way so the tiers can shout.
- **JetBrains Mono** (functional readouts, 400/500/700): dimensions, file sizes, keyboard hints, export specs. Signals "precision" inside a playful frame.

---

## 2. Design Tokens

All values concrete. Naming convention: `--tm-<category>-<name>` (prefix `tm`).

### 2.1 Color Palette

**Primary — Banana (action color)**

| Token | Hex | Usage |
|---|---|---|
| `color-primary` | `#FFC224` | Primary buttons, active highlights, logo wordmark accent |
| `color-primary-hover` | `#F5B301` | Primary hover |
| `color-primary-active` | `#E0A400` | Primary pressed |
| `color-primary-subtle` | `#FFF3D1` | Tinted backgrounds, selected-nav pill |
| `color-on-primary` | `#2B2115` | Text/icons on banana (contrast ≈ 10.2:1) |

**Secondary — Grape (links, focus, selection)**

| Token | Hex | Usage |
|---|---|---|
| `color-secondary` | `#6D4AFF` | Focus rings, links, selection outlines, drop indicator |
| `color-secondary-hover` | `#5B3AE8` | Link hover |
| `color-secondary-subtle` | `#EFEAFF` | Selected row tint, focus ring halo |
| `color-on-secondary` | `#FFFFFF` | Text on grape (contrast ≈ 5.2:1) |

**Accent — Monkey Blush (sparing: mascot cheeks, confetti, "new" badges)**

| Token | Hex | Usage |
|---|---|---|
| `color-accent` | `#FF5C8A` | Mascot details, celebratory moments, promo badges. NEVER for errors or primary actions. |

**Neutrals — Warm Paper scale (8 shades)**

| Token | Hex | Usage |
|---|---|---|
| `color-neutral-0` | `#FFFFFF` | Panels, cards, modal surface |
| `color-neutral-50` | `#FAF7F2` | App canvas background |
| `color-neutral-100` | `#F3EEE7` | Item tray background, subtle fills |
| `color-neutral-200` | `#E7E0D5` | Default borders, dividers |
| `color-neutral-300` | `#D4CAB8` | Strong borders, disabled fills |
| `color-neutral-400` | `#A89E8C` | Placeholder text, decorative icons only (not AA for real text) |
| `color-neutral-500` | `#7A7060` | Secondary text on canvas (≈ 4.6:1, AA pass) |
| `color-neutral-900` | `#241E17` | Ink: headings, body-emphasis, sticker shadows |

**Semantic**

| Token | Hex | Usage |
|---|---|---|
| `color-success-fill` | `#22B573` | Success icon fills |
| `color-success-text` | `#0E7A45` | Success text on white (≈ 5.4:1) |
| `color-success-subtle` | `#E2F7EC` | Success banner bg |
| `color-warning-fill` | `#F6A609` | Warning icon fills |
| `color-warning-text` | `#8A5A00` | Warning text on white (≈ 5.1:1) |
| `color-warning-subtle` | `#FDF0D3` | Warning banner bg |
| `color-error-fill` | `#D92D20` | Destructive button bg (white text ≈ 4.8:1) |
| `color-error-hover` | `#B42318` | Destructive hover / error text on white (≈ 6.6:1) |
| `color-error-subtle` | `#FDE8E8` | Error banner bg, invalid input halo |

**Surface / On-surface (semantic aliases)**

| Token | Light value | Usage |
|---|---|---|
| `surface-canvas` | `#FAF7F2` | App background |
| `surface-panel` | `#FFFFFF` | Cards, tier drop zones, tray items |
| `surface-sunken` | `#F3EEE7` | Tray well, inset areas |
| `surface-overlay` | `rgba(36, 30, 23, 0.5)` | Modal scrim (warm ink at 50%) |
| `on-surface-primary` | `#241E17` | Headings, body strong |
| `on-surface-secondary` | `#5A5145` | Captions, meta (≈ 6.1:1 on panel) |
| `on-surface-disabled` | `#B4AA99` | Disabled labels (paired with `neutral-200` fill) |

### 2.2 Tier Preset Palette (default 7 tiers)

Default row order and label text. **On-tier text is always dark ink `#2B2115` in both themes** — every pair ≥ 4.8:1. This is a hard rule baked into the custom color picker (see §3.4).

| Tier | Token | Hex (light) | Hex (dark mode) | Contrast vs `#2B2115` |
|---|---|---|---|---|
| S | `tier-s` | `#FF6B6B` | `#FF7B7B` | ≈ 5.9:1 |
| A | `tier-a` | `#FFA94D` | `#FFB566` | ≈ 7.1:1 |
| B | `tier-b` | `#FFD43B` | `#FFDE59` | ≈ 9.2:1 |
| C | `tier-c` | `#69DB7C` | `#7CE38B` | ≈ 7.8:1 |
| D | `tier-d` | `#74C0FC` | `#86C9FF` | ≈ 7.4:1 |
| E | `tier-e` | `#9775FA` | `#A687FF` | ≈ 4.9:1 |
| F | `tier-f` | `#F783AC` | `#FF93B9` | ≈ 6.3:1 |

New tiers added by the user cycle through this palette starting from `tier-a`.

### 2.3 Typography Scale

| Token | Family / Weight | Size / Line-height | Usage |
|---|---|---|---|
| `text-display` | Fredoka 600 | 40px / 48px | Empty-state headline, marketing moments |
| `text-h1` | Fredoka 600 | 32px / 40px | Export modal hero, dialog titles (large) |
| `text-h2` | Fredoka 600 | 24px / 32px | Modal titles, section heads |
| `text-h3` | Fredoka 600 | 20px / 28px | Panel titles, tray header |
| `text-tier-label` | Fredoka 600 | 18px / 24px | Tier row label cells |
| `text-title` | Inter 600 | 16px / 24px | Card titles, list title, toolbar doc name |
| `text-body` | Inter 400 | 16px / 24px | Default body, inputs |
| `text-body-strong` | Inter 600 | 16px / 24px | Emphasized body |
| `text-small` | Inter 400 | 14px / 20px | Dense UI, button labels (500 weight), menu items |
| `text-caption` | Inter 500 | 12px / 16px | Hints, errors, metadata, badge text |
| `text-mono` | JetBrains Mono 500 | 13px / 20px | Dimensions, file size, keyboard shortcut hints |

Letter-spacing: 0 for all body/UI; `text-display` and headings at −0.01em; tier labels +0.01em; mono −0.02em.

### 2.4 Spacing Scale (4px base)

| Token | Value | Typical use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap, inline padding |
| `space-2` | 8px | Card gaps in tier rows, compact padding |
| `space-3` | 12px | Input padding, menu item padding |
| `space-4` | 16px | Default component padding, tier row gap |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Modal padding, card block padding |
| `space-8` | 32px | Section separation |
| `space-10` | 40px | Empty-state block gaps |
| `space-12` | 48px | Major layout rhythm |
| `space-16` | 64px | Hero/empty-state vertical padding |

### 2.5 Radii

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | 4px | Badges, count chips |
| `radius-sm` | 8px | Buttons, inputs, swatches |
| `radius-md` | 12px | Image cards, tier rows, menus, toasts |
| `radius-lg` | 16px | Modals, popovers, tray |
| `radius-full` | 999px | Pills, drop indicator caps, avatar |

### 2.6 Shadows / Elevation

All shadows use warm ink `36, 30, 23` — never pure black, never blue-tinted.

| Token | Value | Usage |
|---|---|---|
| `elevation-0` | none | Flush elements |
| `elevation-1` | `0 1px 2px rgba(36,30,23,0.08)` | Resting image cards |
| `elevation-2` | `0 4px 12px rgba(36,30,23,0.12)` | Hovered cards, popovers, menus |
| `elevation-3` | `0 12px 32px rgba(36,30,23,0.18)` | Modals, tray sheet on mobile |
| `elevation-drag` | `0 8px 24px rgba(36,30,23,0.22)` | Drag ghost only |
| `shadow-sticker` | `3px 3px 0 #241E17` | Signature: primary CTA + mascot illustrations ONLY. Hard offset, no blur — this is the brand's playful tell. |

### 2.7 Motion

| Token | Value | Usage |
|---|---|---|
| `duration-instant` | 80ms | Micro state flips (checkmark, icon swap) |
| `duration-fast` | 120ms | Hover transitions, color fades |
| `duration-normal` | 200ms | Layout moves, drops, menus, toasts in |
| `duration-slow` | 320ms | Modals, sheet entrance, celebratory moments |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default UI transitions |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful overshoot: drops, pops, success |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits, removals |

### 2.8 Z-index Scale

| Token | Value | Layer |
|---|---|---|
| `z-canvas` | 0 | Tier rows |
| `z-tray` | 10 | Item tray dock |
| `z-toolbar` | 20 | Sticky toolbar |
| `z-popover` | 50 | Menus, color picker |
| `z-drag` | 100 | Drag ghost |
| `z-modal` | 200 | Dialogs + scrim |
| `z-toast` | 300 | Toasts (always on top) |

---

## 3. Component Library Specifications

### 3.1 Button

**Anatomy:** container (`radius-sm` 8px) + optional 16px leading icon + label (`text-small` Inter 600, +0.01em) + optional 16px trailing icon. Icon-to-label gap `space-2`. Single-line, no wrap.

**Sizes:**

| Size | Height | Padding-X | Icon |
|---|---|---|---|
| sm | 32px | 12px | 16px |
| md | 40px | 16px | 18px |
| lg | 48px | 24px | 20px |

**Variants & states:**

**Primary (Banana)** — the "one loud button." Max ONE primary button visible per view region.
- Default: bg `color-primary`, text `color-on-primary`, `shadow-sticker`
- Hover: bg `color-primary-hover`, `translateY(-1px)`, shadow grows to `4px 4px 0 #241E17`
- Active/pressed: bg `color-primary-active`, `translateY(2px)`, shadow `1px 1px 0 #241E17` (button physically "stamps")
- Focus-visible: 2px solid `color-secondary` outline, 2px offset (sticker shadow retained)
- Disabled: bg `neutral-200`, text `on-surface-disabled`, no shadow, no transform
- Loading: label replaced by 18px spinner (ink), width locked to prevent layout shift

**Secondary** — bg `surface-panel`, 1.5px border `neutral-300`, text `on-surface-primary`.
- Hover: border `neutral-500`, bg `neutral-50`, `translateY(-1px)` + `elevation-1`
- Active: bg `neutral-100`, `translateY(0)`
- Focus/disabled: same pattern as primary.

**Ghost** — transparent bg, text `neutral-500`.
- Hover: bg `neutral-100`, text `on-surface-primary`
- Active: bg `neutral-200`
- Used for: cancel actions, toolbar overflow, tertiary links.

**Destructive** — bg `color-error-fill`, text `#FFFFFF`.
- Hover: bg `color-error-hover` + `elevation-1`
- Active: darken 6%, `translateY(1px)`
- Never used for reversible actions (returning an item to the tray is ghost-icon, not destructive).

**Icon-only** — 36×36px hit area padded to 44px, `radius-sm`, ghost color behavior, 18px icon. Used in toolbar (undo/redo), row actions, modal close. Tooltip required (200ms delay, keyboard-focus shows immediately).

### 3.2 Tier Row (the hero component)

**Anatomy** (desktop): full-width container, `radius-md`, 1.5px border `neutral-200`, bg `surface-panel`, min-height 88px. Three regions in a row:

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌─────┐ ┌───────────┐ ┌──────────────────────────┐ ┌─────────┐ │
│ │ grip│ │LABEL CELL │ │ DROP ZONE (flex-wrap)    │ │ ⋯ menu  │ │
│ │ 18px│ │ 120px wide│ │ gap 8px, padding 8px     │ │ 40px    │ │
│ └─────┘ └───────────┘ └──────────────────────────┘ └─────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **Grip handle:** 18px grip-vertical icon, `neutral-400`, only visible on row hover or keyboard focus; cursor `grab`. Dragging it reorders the whole row.
- **Label cell:** 120px wide, full row height, tier color fill, `text-tier-label` in `#2B2115`, horizontally+vertically centered, 8px horizontal padding. Bottom-right corner holds a 20px color-dot button (visible on hover/focus) that opens the Color Picker. **Click label text → inline rename:** text becomes an input, select-all on entry, Enter/blur commits, Esc cancels, 24-char max, empty input reverts to previous name. Label supports 2 lines with 16px size if renamed long.
- **Drop zone:** 1fr width, `space-2` padding, flex-wrap row of Image Cards with `space-2` gap. Empty zone shows dashed 1.5px `neutral-300` inset outline + centered caption "Drop items here" in `neutral-400`.
- **Row actions (⋯):** icon-only ghost button; menu items: Rename (pencil), Change color (swatch), Add tier above, Add tier below, Duplicate tier, Delete tier (error text, confirm if row has items).

**States:**
- Default: as above.
- Row hover: border `neutral-300`, grip + color-dot fade in (120ms).
- **Drag-over (drop target):** drop zone bg shifts to tier color at 12% opacity, 2px dashed inner border in tier color darkened 20%, zone min-height grows +8px to "make room." Label cell brightens 4%.
- **Selected (keyboard focus):** entire row outlined 2px `color-secondary` + `color-secondary-subtle` outer halo 3px.
- **Dragging (row being reordered):** source row collapses to 40% opacity placeholder with dashed outline; ghost follows cursor (see §3.9).
- **Invalid drop attempt** (e.g., dropping a tier row into the tray): row shakes ±4px over 200ms, no state change.

**Overflow:** cards wrap to additional lines; row height grows in 80px increments. Max 3 visible lines per row, then the row scrolls internally with a fade gradient at the bottom edge.

### 3.3 Image Card

**Anatomy:** square thumbnail, `radius-md` 12px, 1.5px border `rgba(36,30,23,0.08)`, `elevation-1`, image `object-fit: cover`. Alt text editable (defaults to filename), used for export accessibility metadata.

**Sizes** (global slider in toolbar + per-row override in row menu):

| Size | Dimensions | Typical use |
|---|---|---|
| S | 56×56px | Dense rows, mobile |
| M | 72×72px | Desktop default |
| L | 96×96px | Showcase lists |

**States:**
- Default: as above, cursor `grab`.
- Hover (desktop): `elevation-2`, `scale(1.04)`, 120ms; a 20px circular ✕ chip fades in at top-right (returns item to tray — icon, not destructive-red, because it's reversible).
- Selected (click/Space): 2px `color-secondary` outline + 16px check chip top-left on grape fill; supports Shift/Cmd multi-select.
- Dragging-source: original slot collapses to a dashed 40%-opacity placeholder so the row layout is preserved.
- Keyboard-focused: 2px grape focus ring, offset 2px.
- Processing (upload in flight): 24px progress ring centered over a 60%-opacity thumb; card not draggable until done.
- Error (failed upload): error-tinted overlay + retry icon; caption tooltip explains failure.

**Mobile behavior:** hover controls are replaced by long-press (300ms + light haptic) which initiates drag; ✕ becomes a swipe-left reveal action in the tray.

### 3.4 Color Picker

**Anatomy:** popover panel, 232px wide, `radius-md`, `elevation-2`, padding `space-3`, anchored to the tier label's color-dot. Sections, top to bottom:
1. **"Tier presets"** — the 7 preset swatches, 28×28px, `radius-sm`, in a row (wraps to 4+3).
2. **"Recent"** — last 5 custom colors, 24×24px.
3. **Custom** — 12 curated extended swatches (2 rows × 6, spanning the same hue family: warmer/cooler siblings of the presets) + a hex input (`#RRGGBB`, validated live).

**Hard accessibility guardrail:** the picker only offers colors that keep ≥ 4.5:1 contrast against ink `#2B2115` label text. Hex entries that fail are rejected with an inline caption: "Too dark — tier names need to stay readable." This keeps the meme look AND legibility without user effort.

**States:** swatch hover `scale(1.1)` (80ms); selected swatch gets 2px ink ring + 12px white check; keyboard navigable as a grid (arrow keys), Enter applies, popover closes and focus returns to the color-dot button.

**Live preview:** while hovering/previewing a swatch, the tier label cell cross-fades to the candidate color (200ms); committing animates once more (see §8.3).

### 3.5 Text Input

**Anatomy:** height 40px, `radius-sm`, 1.5px border `neutral-300`, padding `space-3`, `text-body` (dense contexts `text-small`), bg `surface-panel`.

**States:**
- Default: as above, placeholder `neutral-400`.
- Hover: border `neutral-500`.
- Focus: border `color-secondary` + 3px `color-secondary-subtle` halo; no layout shift.
- Error: border `color-error-fill` + `color-error-subtle` halo + 12px caption with alert icon below; error never conveyed by color alone.
- Disabled: bg `neutral-100`, text `on-surface-disabled`.

**Variants:**
- **Inline rename** (doc title, tier labels): borderless, `text-title`, bg transparent; hover shows `neutral-100` pill; focus becomes full input. Pencil icon appears on hover for discoverability.
- **With leading icon:** 16px icon at left `space-3`, e.g., search in a future template gallery.

### 3.6 Modal / Dialog

**Anatomy:** scrim `surface-overlay` + panel: `radius-lg`, `elevation-3`, bg `surface-panel`, max-width 520px, padding `space-6`, centered. Header: `text-h2` + right-aligned icon-only close button. Content region: `space-5` vertical rhythm. Footer: right-aligned button group — ghost "Cancel" + one primary action (secondary allowed between them). Footer separated by 1.5px `neutral-200` divider only when content scrolls.

**States/behavior:** entrance = scrim fade 120ms + panel `scale(0.96→1)` + `translateY(8→0)` with `ease-spring` 200ms; exit reverses at 150ms `ease-in`. Focus trapped, Esc closes (unless a destructive confirm is focused), close returns focus to invoking element. On mobile: full-width with 16px margins, max-height 80vh, content scrolls.

### 3.7 Toolbar

**Anatomy (desktop):** sticky top bar, height 56px, bg `surface-panel`, bottom border 1.5px `neutral-200`, `z-toolbar`, padding `space-4` / `space-6`.

```
[logo 28px] [Doc title · inline rename]      [+ Add tier] [Item size S—•—L] [BG toggle]   [↶] [↷]  [Share] [⬇ Export]
← left cluster                              ← center canvas tools                        ← right actions
```

- **Doc title:** inline-rename input (see §3.5), max 60 chars, autosaves with 400ms debounce; a `text-caption` "Saved" indicator with check appears right of title on save.
- **Add tier:** secondary button, appends a new row below the last tier (color cycles presets).
- **Item size:** 3-stop segmented slider (S/M/L), `text-caption` labels, mono size readout on hover ("72px").
- **Background toggle:** icon button switching export canvas between transparent / `surface-panel` white (affects live canvas preview subtly: dashed transparency grid at 4% opacity).
- **Undo/Redo:** icon-only buttons, disabled state at history bounds; tooltips include shortcuts (`Ctrl+Z`, `Ctrl+Shift+Z`).
- **Share:** secondary button → copies link (future: live collab); instant toast feedback.
- **Export:** the single primary button on screen. Always visible. Banana, sticker shadow.

**Overflow (< 1024px):** center tools collapse into a "⋯ Customize" popover menu. Right cluster persists.

### 3.8 Item Tray (bonus component — required by the core flow)

**Anatomy (desktop):** sticky bottom dock, height 120px, bg `surface-sunken`, top border 1.5px `neutral-200`, `z-tray`. Header row (16px tall zone inside): "ITEM TRAY · n" in `text-caption` uppercase + right-aligned ghost "Clear all" and secondary "Upload" buttons. Items: horizontal scroll strip of Image Cards, `space-2` gap, `space-3` padding, scroll fade masks at edges.

**States:** empty = dashed inner dropzone with `image` icon + caption "Uploads land here — drag files anywhere on the page". Drag-over tray = 12% grape tint + dashed grape inner border. Tray accepts drops from tier rows (return-to-tray) and OS file drops at all times.

### 3.9 Toast

**Anatomy:** bottom-center stack (above tray, 16px offset), max-width 360px, `radius-md`, bg `color-neutral-900` (ink), white `text-small`, 18px leading icon, optional banana text action, 20px close icon. `elevation-2`.

**Variants:** success (check icon), error (alert-triangle + white "Retry" action), info (info icon). Duration: success/info 4s, error 6s (also dismissible; errors never auto-dismiss while hovered/focused). Max 3 stacked, oldest collapses.

**Motion:** enter = `translateY(12px→0)` + fade, 200ms `ease-spring`; exit = fade + collapse 150ms. Screen readers: `aria-live="polite"` (errors `assertive`).

### 3.10 Drag Ghost & Drop Indicator

**Drag ghost:** the dragged card (or stack) rendered at 92% scale, rotated 2° clockwise, `elevation-drag`, 90% opacity, `radius-md`. Multi-select drags show stacked cards (2 offset layers) + 20px count badge in banana with ink text at top-right. Ghost always renders above everything (`z-drag`), cursor `grabbing`.

**Drop indicator:** 3px-wide vertical bar, height = row's card height, `radius-full` caps, `color-secondary`, with an 8px circle cap at top. Appears at the insertion point while siblings slide apart (`duration-normal`, `ease-spring`). For tier-row reordering, the indicator becomes horizontal (full row width, 3px tall) between rows.

**Keyboard drag equivalent:** Space lifts an item ("Picked up X"), arrow keys move the indicator between cards/rows (live region announces position), Enter drops, Esc cancels. The indicator is identical visually.

### 3.11 Empty-State Illustration Block

**Anatomy:** centered max-width 480px card-less block: mascot illustration (240×180px) → `text-display` headline → `text-body` supporting copy (2 lines max, `on-surface-secondary`) → button row (primary lg + ghost lg) → `text-caption` hint with mono kbd hints ("or just drag files in").

**States:** idle = mascot gently bobs (3s loop, ±4px, disabled with reduced motion). File drag-over the window = mascot's eyes widen, block scales 1.02, dashed window overlay appears. See §6 for illustration direction.

---

## 4. Screen Designs

### 4.1 Empty State (first visit)

**Description:** First visit renders the full app skeleton — toolbar (title "Untitled tier list"), five default tier rows (S/A/B/C/D) with empty dashed drop zones, and an empty tray — with the Empty-State block centered in the canvas area over the rows (rows remain visible behind at reduced prominence). This teaches the layout before it has content. Dropping files anywhere on the window dismisses the block permanently (per list) and populates the tray.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [🐒] Untitled tier list ✎        [+ Tier] [Size S—•—L] [▦]   [↶][↷] [Share]│
│                                                              [ ⬇ Export ]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│        ╭────────────────── dashed window overlay (on file drag) ──╮        │
│        │                                                          │        │
│        │                    ___________                           │        │
│        │                   /  monkey   \      Nothing to          │        │
│        │                  |  dangling   |     judge yet.           │        │
│        │                   \  from S-bar/                         │        │
│        │                    ‾‾‾‾‾‾‾‾‾‾‾     Feed the monkey:      │        │
│        │                                  drag images anywhere    │        │
│        │                                                          │        │
│        │            [  ⬆ Upload images  ]  [ Try a demo list ]    │        │
│        │                                                          │        │
│        ╰──────────────────────────────────────────────────────────╯        │
│                                                                            │
│   ┌─ S ──┬──────────────────────────────────────────────────────────┐ ⋯   │
│   │      │  - - - - - - -  Drop items here  - - - - - - - - - - - -  │     │
│   ├─ A ──┼──────────────────────────────────────────────────────────┤ ⋯   │
│   │      │  - - - - - - -  Drop items here  - - - - - - - - - - - -  │     │
│   ├─ B ──┼──────────────────────────────────────────────────────────┤ ⋯   │
│   │      │  - - - - - - -  Drop items here  - - - - - - - - - - - -  │     │
│   ├─ C ──┼──────────────────────────────────────────────────────────┤ ⋯   │
│   │      │  - - - - - - -  Drop items here  - - - - - - - - - - - -  │     │
│   └─ D ──┴──────────────────────────────────────────────────────────┘     │
│                          [ + Add tier ]                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ ITEM TRAY · 0                                       [ Clear ] [ ⬆ Upload ] │
│ ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐  │
│ │   🖼  Uploads land here — drag files anywhere on the page            │  │
│ └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

Notes: Export button is disabled until ≥ 1 item exists on canvas (tooltip explains why). "Try a demo list" loads a prefilled snack-ranking list so users learn dragging instantly.

### 4.2 Canvas / Editor (main screen)

**Description:** The working state. Toolbar sticky top, tray sticky bottom, canvas scrolls between them. Tier rows are the dominant visual element — the colored label column forms a rainbow spine down the left. Everything is inline-editable; there are no "settings pages." Autosave indicator lives beside the doc title. Undo history covers all structural ops (move, rename, recolor, add/delete tier, resize).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [🐒] My hot takes ✎ ✓Saved     [+ Tier] [Size S—•—L] [▦]   [↶][↷] [Share]  │
│                                                            [ ⬇ Export ]    │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌───┬────────┬────────────────────────────────────────────────────────┬───┐│
│ │ ≡ │   S    │ [img][img]                                             │ ⋯ ││
│ ├───┼────────┼────────────────────────────────────────────────────────┼───┤│
│ │ ≡ │   A    │ [img][img][img]                                        │ ⋯ ││
│ ├───┼────────┼────────────────────────────────────────────────────────┼───┤│
│ │ ≡ │ GOATS  │ [img]                                                  │ ⋯ ││  ← renamed tier
│ ├───┼────────┼────────────────────────────────────────────────────────┼───┤│
│ │ ≡ │   B    │ [img][img][img][img][img]                              │ ⋯ ││
│ │   │        │ [img][img]   ← wraps to 2nd line, row grows            │   ││
│ ├───┼────────┼────────────────────────────────────────────────────────┼───┤│
│ │ ≡ │   C    │ - - - - - - -  Drop items here - - - - - - - - - - - - │ ⋯ ││
│ ├───┼────────┼────────────────────────────────────────────────────────┼───┤│
│ │ ≡ │   D    │ [img]                                                  │ ⋯ ││
│ └───┴────────┴────────────────────────────────────────────────────────┴───┘│
│                        [ + Add tier ]                                      │
│                    ▏3px grape drop indicator▕ (visible while dragging)     │
├────────────────────────────────────────────────────────────────────────────┤
│ ITEM TRAY · 6                                       [ Clear ] [ ⬆ Upload ] │
│ [img][img][img][img][img][img]  ··························  scroll →       │
└────────────────────────────────────────────────────────────────────────────┘
```

Interaction map:
- Drag tray card → tier row: row enters drag-over state, indicator shows insertion point.
- Drag within row: reorder in place. Drag across rows: move. Drag to tray: return.
- Grip handle drag: row reorder with horizontal indicator.
- Click tier label: rename. Click color dot: color picker. ⋯ menu: all row ops.
- ✕ on card hover: return to tray. Right-click card: context menu (Move to ▾, Return to tray, Edit alt text, Delete).

### 4.3 Export Modal

**Description:** Triggered by the primary Export button. Left/top: live preview of the final image (scaled to fit, `radius-md`, checkerboard if transparent). Below: format segmented control, dimension presets, background choice, filename. Footer: ghost "Copy image" + primary "Download". Success state replaces the primary button label with a check + "Saved!" for 1.2s while confetti fires over the preview, then a toast confirms with the file's mono-formatted size.

```
                ┌──────────────────────────────────────────────────┐
                │  Export your list                            ✕   │
                │──────────────────────────────────────────────────│
                │  ┌────────────────────────────────────────────┐  │
                │  │                                            │  │
                │  │        live preview · scaled to fit        │  │
                │  │      (checkerboard if transparent bg)      │  │
                │  │                                            │  │
                │  └────────────────────────────────────────────┘  │
                │                                                  │
                │  Format      ( PNG ) ( JPG ) ( WebP )            │
                │  Size        [ 1920 × 1080          ▾ ]  2× ☐    │
                │  Background  (•) White    ( ) Transparent        │
                │  File name   [ my-hot-takes                    ] │
                │              caption: PNG · 1920×1080 · ~1.2 MB  │
                │──────────────────────────────────────────────────│
                │                       [ Copy image ] [ ⬇ Download]│
                └──────────────────────────────────────────────────┘
```

Details: size presets = Auto (fits content), 1920×1080, 1080×1080 (social square), Custom (two number inputs). 2× toggle for retina. Copy writes PNG to clipboard regardless of format choice (with toast "Copied — go paste it somewhere spicy"). Filename slugified live from doc title.

### 4.4 Mobile Canvas Reflow (< 640px)

**Rules:**
- Toolbar compresses to 48px: logo, undo/redo icons, Export primary (label collapses to icon at < 400px). Doc title + tools move into a "⋯" menu.
- Tier rows go full-bleed (8px page gutters). Label cell shrinks to 72px wide, `text-tier-label` drops to 16px. Cards default to S (56px).
- Tray becomes a bottom **sheet**: 64px peek showing handle + item count, drags up to 60vh, `elevation-3`, scrims canvas at 40%.
- All popovers/menus become bottom sheets; modals go full-width with 16px margins.
- Drag initiation = long-press (300ms) with haptic tick; ghost scales to 1.1 for finger occlusion. Drop indicator identical.
- Inline rename opens with the keyboard already focused; color picker becomes a full-width sheet with 40px swatches (44px hit targets).

```
┌────────────────────────────┐
│ [🐒]            [↶][↷][⬇]  │  48px compact toolbar
├────────────────────────────┤
│ ┌────┬──────────────────┬─┐│
│ │ S  │ [i][i][i][i]     │⋮││  label cell 72px
│ ├────┼──────────────────┼─┤│  cards 56px
│ │ A  │ [i][i]           │⋮││
│ ├────┼──────────────────┼─┤│
│ │ B  │ [i][i][i]        │⋮││
│ ├────┼──────────────────┼─┤│
│ │ C  │ - drop here - -  │⋮││
│ └────┴──────────────────┴─┘│
│      [ + Add tier ]        │
│                            │
├────────────────────────────┤
│ ───────── ⌃ ────────────── │  tray sheet peek (64px)
│ ITEM TRAY · 6        [ ⬆ ] │
│ [i][i][i][i][i][i] →       │
└────────────────────────────┘
   (sheet expands up to 60vh
    with scrim on drag-up)
```

---

## 5. Iconography

**Style:** outline icons on a 24px grid, 2px stroke (1.5px at 16px size), round caps and round joins, geometric-but-friendly (Lucide-adjacent). No filled icons except 12–16px status dots/badges. Single color (currentColor). The custom logo mark and mascot are the only multi-color marks in the product.

**Required icon set (13):**

| Icon | Purpose |
|---|---|
| `upload-cloud` | Upload images (tray, empty state CTA) |
| `download` | Export / Download |
| `plus` | Add tier, add images |
| `grip-vertical` | Tier row reorder handle |
| `x` | Close modal, return item to tray chip |
| `undo` / `redo` | History (toolbar) |
| `sliders-horizontal` | Item size control |
| `swatch-book` (paint palette) | Change tier color |
| `pencil` | Rename affordances |
| `trash` | Delete tier / clear tray |
| `share-2` | Share link |
| `check` | Success toast, selection chip, saved indicator |
| `alert-triangle` | Error/warning toasts, invalid states |
| `image` | Empty tray placeholder, broken image fallback |
| `chevron-up` | Mobile tray sheet handle |

---

## 6. Imagery & Illustrations

**Illustration style:** flat chunky shapes with 3px ink (`#241E17`) outlines, maximum 3 brand colors per illustration, optional `shadow-sticker` offset shadow. Corners fully rounded; elements rotated ±4–6° so nothing feels corporate-grid-perfect. Think "premium sticker pack," not "stock flat illustration."

**Monkey mascot direction:** a round-bodied, big-eared geometric monkey — circle head, minimal face (two dot eyes + tiny smirk), brown fur `#8D5B3F` with banana-yellow belly and blush `#FF5C8A` cheeks. Personality: cheeky side-eye, perpetually mid-scheme. Appears in exactly five places and nowhere else:
1. Empty state (dangling from an empty S-bar)
2. Export success (thumbs up, in the confetti burst)
3. Error/dead-end states (shrugging, palms up)
4. Loading splash (Direction B logo animation)
5. 404 (holding a peeled banana, judgmental)

Never larger than ~10% of the viewport, never next to the primary Export button (visual competition with banana yellow).

**Decorative patterns:** empty canvas regions may carry a 4%-opacity scatter pattern of 12px tier-bar dashes + tiny banana silhouettes. Export success confetti uses the 7 tier preset colors. OG/share image template: tier list thumbnail centered on warm paper bg, mascot peeking from the bottom-right corner, "Made with Tier Monkey" in Fredoka.

---

## 7. Dark Mode

**Strategy:** same hues, shifted lightness — NOT inverted. Neutrals flip to a warm charcoal scale (keeping the yellow undertone; blue-dark themes are banned). Tier colors get brightened variants so they pop off dark surfaces while keeping ink label text. Auto-follows `prefers-color-scheme` with a manual override (light / dark / system) persisted per user.

**Token mapping (light → dark):**

| Token | Light | Dark |
|---|---|---|
| `surface-canvas` | `#FAF7F2` | `#1C1813` |
| `surface-panel` | `#FFFFFF` | `#26211B` |
| `surface-sunken` | `#F3EEE7` | `#171310` |
| border default | `#E7E0D5` | `#3A332A` |
| border strong | `#D4CAB8` | `#4A4238` |
| `on-surface-primary` | `#241E17` | `#F5F0E8` |
| `on-surface-secondary` | `#5A5145` | `#B8AE9F` |
| `color-primary` | `#FFC224` | `#FFC224` (hover `#FFD054`) |
| `color-secondary` | `#6D4AFF` | `#9B85FF` (focus/link contrast ≥ 4.5 on canvas) |
| `color-secondary-subtle` | `#EFEAFF` | `#33294D` |
| `surface-overlay` | `rgba(36,30,23,0.5)` | `rgba(0,0,0,0.6)` |
| semantic fills | unchanged | lightened +10% (e.g., success `#2BC984`) |
| semantic subtles | light tints | dark tints (e.g., error bg `#3A1D1B`) |

**Tier rows in dark mode:** label cells use the brightened dark palette from §2.2 (`#FF7B7B`, `#FFB566`, `#FFDE59`, `#7CE38B`, `#86C9FF`, `#A687FF`, `#FF93B9`) and keep ink `#2B2115` label text — contrast actually improves. Drop zones stay `surface-panel`; drag-over tint = tier color at 18% opacity (up from 12% for visibility on dark). Shadows gain a 1px `rgba(255,255,255,0.06)` top border to define surfaces; `shadow-sticker` becomes `3px 3px 0 rgba(0,0,0,0.6)`.

---

## 8. Motion & Microinteractions

All motion respects `prefers-reduced-motion`: springs collapse to 120ms opacity fades; confetti, tilts, and parallax are removed entirely.

**8.1 Tier row drop (the signature moment):** card FLIP-animates from cursor to slot (200ms, `ease-spring`); on landing it overshoots `scale(1.06→1)` in 120ms while the drop zone's 12% tier-tint flashes once (120ms out). Siblings part/recombine with `ease-spring` 200ms. Feels like snapping a magnet into place.

**8.2 Tier reordering:** lifting a row via grip = `elevation-drag` + `scale(1.02)` + 1° tilt (120ms); other rows slide to make room (200ms spring); drop = settle with a 90ms `translateY(-2px→0)` bounce and one soft ink-shadow pulse.

**8.3 Color change:** label cell cross-fades old→new color over 200ms `ease-standard`; the committed swatch's check pops `scale(0.5→1)` with spring; the row's drag-over tint and focus halo update in the same frame so the row never shows mixed colors.

**8.4 Upload:** cards enter the tray staggered 30ms apart, `scale(0.6→1)` + fade, `ease-spring`; each shows a progress ring until processed. While files hover over the window, the full-viewport dashed overlay border pulses opacity 0.5↔1 (1s loop).

**8.5 Export success:** Download button spinner morphs to a check (200ms); a 12-piece confetti burst (tier palette colors, 600–900ms, gravity + random rotation) erupts from the preview's top edge; toast slides up with the mono file size. The monkey mascot thumbs-up peeks from the preview's corner for exactly 1.2s.

**8.6 Misc:** toasts 200ms spring in / 150ms fade out; modal 200ms spring scale; toolbar buttons 120ms color transitions; hover lifts always pair `translateY(-1px)` with shadow growth so motion has a light-source logic.

---

## 9. Accessibility & Contrast

**Contrast minimums (WCAG 2.2 AA, verified pairs):**
- Body text ≥ 4.5:1 — enforced pairings: `neutral-900`/`on-surface-primary` on panel (≈ 14:1), `on-surface-secondary` on panel (≈ 6.1:1), `neutral-500` on canvas (≈ 4.6:1).
- Large text (headings, tier labels) ≥ 3:1 — all tier/on-tier pairs ≥ 4.8:1 anyway.
- Interactive boundaries & focus indicators ≥ 3:1 against adjacent colors — grape `#6D4AFF` on paper passes; on banana surfaces the focus ring switches to ink.
- Banana primary button text = ink `#2B2115` (≈ 10.2:1). White text on banana is forbidden.
- Color picker guardrail (§3.4) prevents users from creating failing tier combinations.

**Non-color state cues:** selection = outline + check chip; errors = icon + text caption + color; drop targets = indicator bar + tinted zone + cursor change; disabled = reduced contrast + no-shadow + cursor change; success toast = check icon + text. No state is ever hue-only.

**Focus ring:** 2px solid `color-secondary`, 2px offset, follows element radius, plus 3px `color-secondary-subtle` halo on inputs/rows. Never suppressed. Visible on keyboard nav only (`:focus-visible`), always visible in menus/dialogs.

**Keyboard & screen reader:** full drag-and-drop parity (Space lift / arrows move / Enter drop / Esc cancel) with `aria-live="polite"` announcements ("Moved Charmander to A tier, position 2 of 5"); rows reorder via Ctrl+↑/↓; skip-link jumps to canvas; every icon button has an aria-label and tooltip; modals trap focus and return it on close.

**Other:** touch targets ≥ 44px (visual 36px buttons get padded hit areas); layout survives 200% text zoom (tier labels wrap to 2 lines, rows grow); alt text editable per image and embedded in export metadata; reduced-motion support per §8.

---

## 10. Inspiration & References

Steal from these — deliberately, and none of them are tier-list tools:

1. **Figma** — *playful precision on a canvas.* Inline everything, friendly empty states, drag interactions that feel physical, and chrome that disappears until hovered. Our tier rows should feel like Figma frames: obvious, grabbable, alive.
2. **Linear** — *speed and polish.* Keyboard-first everything, 100–200ms motion ceiling, one strong accent color against near-neutrals. Proof that restraint makes the loud moments (our banana CTA, our tier rainbow) hit harder.
3. **Notion** — *calm surfaces, inline editing.* Doc-title rename, hover-revealed block handles, and menus that don't scare people. Our row grip handle is Notion's block handle with a circus upbringing.
4. **Duolingo** — *mascot as product.* Chunky geometric character, celebration moments with confetti, illustrations with thick outlines. We take the charm and leave the passive-aggressive push notifications.
5. **Canva** — *approachable creation + export.* A non-designer should finish a list in under a minute; Canva's export modal (preview + 3 decisions max) is the model for ours.

**Explicitly avoided:** glassmorphism, corporate blue-purple gradients, generic SaaS illustration packs, dark-blue "pro tool" themes, and anything that would look at home in an enterprise dashboard.

---

## Appendix — Quick Reference Cheat Sheet

- Primary action color: `#FFC224` (banana) · one per screen · sticker shadow `3px 3px 0 #241E17`
- Focus/selection: `#6D4AFF` (grape) · 2px ring, 2px offset
- Ink: `#241E17` · Paper: `#FAF7F2` · Panel: `#FFFFFF`
- Tier defaults: S `#FF6B6B` / A `#FFA94D` / B `#FFD43B` / C `#69DB7C` / D `#74C0FC` / E `#9775FA` / F `#F783AC` — ink labels always
- Type: Fredoka 600 headings · Inter 400/600 UI · JetBrains Mono readouts · base 16px, 4px spacing grid
- Radii: 8 buttons · 12 cards/rows · 16 modals
- Motion: 200ms `cubic-bezier(0.34,1.56,0.64,1)` for drops/pops, 120ms hovers, nothing over 320ms
- Cards: 56/72/96px · Tier label cell: 120px desktop / 72px mobile · Toolbar 56px · Tray 120px
- Accessibility floor: 4.5:1 text, 3:1 UI, 44px targets, full keyboard drag-and-drop parity
