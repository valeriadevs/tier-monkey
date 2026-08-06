// Singleton registry for transient popovers/menus. Each open popover
// registers its DOM root and a close() callback. App.svelte has a single
// <svelte:document onclick> that walks the registry and closes any
// popover whose root doesn't contain the click target — replacing the
// per-instance <svelte:window> click listeners that previously made
// menus O(N) listeners per N-tier-row / N-image-card tray.

type Entry = { root: HTMLElement; close: () => void; registeredAt: number };

const entries = new Set<Entry>();

// Ignore close requests within this window of a popover being registered.
// Handles the race where the click that *opened* the popover bubbles to
// document after the toggle but before the Svelte $effect registers.
const RACE_WINDOW_MS = 150;

export const popoverManager = {
  /** Register a popover. Returns a cleanup fn (also called automatically when the returned
   * function is invoked from a Svelte $effect teardown). */
  register(root: HTMLElement, close: () => void): () => void {
    const entry: Entry = { root, close, registeredAt: performance.now() };
    entries.add(entry);
    return () => {
      entries.delete(entry);
    };
  },
  /** Close every registered popover whose root does not contain the click target. */
  closeOutside(target: Node | null): void {
    if (!target) return;
    // Skip modal-backdrop clicks — the modal owns its lifecycle and the
    // document-level catch would otherwise strip our menus when the user
    // dismisses a dialog.
    if (target instanceof Element && target.closest('.modal-backdrop')) return;

    const now = performance.now();
    for (const entry of Array.from(entries)) {
      if (now - entry.registeredAt < RACE_WINDOW_MS) continue;
      if (!entry.root.contains(target)) entry.close();
    }
  },
  /** For tests / diagnostics. */
  size(): number {
    return entries.size;
  }
};
