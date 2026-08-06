// Singleton registry for transient popovers/menus. Each open popover
// registers its DOM root and a close() callback. App.svelte has a single
// <svelte:document onclick> that walks the registry and closes any
// popover whose root doesn't contain the click target — replacing the
// per-instance <svelte:window> click listeners that previously made
// menus O(N) listeners per N-tier-row / N-image-card tray.

type Entry = { root: HTMLElement; close: () => void };

const entries = new Set<Entry>();

export const popoverManager = {
  /** Register a popover. Returns a cleanup fn (also called automatically when the returned
   * function is invoked from a Svelte $effect teardown). */
  register(root: HTMLElement, close: () => void): () => void {
    const entry: Entry = { root, close };
    entries.add(entry);
    return () => {
      entries.delete(entry);
    };
  },
  /** Close every registered popover whose root does not contain the click target. */
  closeOutside(target: Node | null): void {
    if (!target) return;
    for (const entry of Array.from(entries)) {
      if (!entry.root.contains(target)) entry.close();
    }
  },
  /** For tests / diagnostics. */
  size(): number {
    return entries.size;
  }
};
