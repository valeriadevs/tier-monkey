<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Maximize2, X } from '@lucide/svelte';
  import type { DisplaySize, Item } from '../lib/types';
  import { DISPLAY_SIZE_PX } from '../lib/types';
  import { popoverManager } from '../lib/popovers.svelte';

  let {
    item,
    onresize,
    onremove,
    onremoveLabel = 'Remove image',
    destructive = false
  }: {
    item: Item;
    onresize?: (size: DisplaySize) => void;
    onremove?: () => void;
    onremoveLabel?: string;
    destructive?: boolean;
  } = $props();

  let popoverOpen = $state(false);
  let cardEl: HTMLDivElement | undefined = $state();
  let resizeHandleEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let imageBroken = $state(false);

  const px = $derived(DISPLAY_SIZE_PX[item.displaySize]);

  const sizes: DisplaySize[] = ['S', 'M', 'L'];

  function togglePopover(e: MouseEvent) {
    e.stopPropagation();
    popoverOpen = !popoverOpen;
  }

  // Focus the first size option when the resize popover opens, and register
  // with the popover manager so a click anywhere outside the sheet closes
  // it. Replacing the per-card `<svelte:window onclick>` with this single
  // document-level handler means an N-card tray no longer has N listeners.
  $effect(() => {
    if (popoverOpen && popoverEl) {
      queueMicrotask(() => {
        const first = popoverEl!.querySelector<HTMLElement>('.size-option');
        first?.focus();
      });
      return popoverManager.register(popoverEl, () => (popoverOpen = false));
    }
  });

  function onPopoverKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      popoverOpen = false;
      resizeHandleEl?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const opts = Array.from(popoverEl?.querySelectorAll<HTMLElement>('.size-option') ?? []);
    if (opts.length === 0) return;
    e.preventDefault();
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? opts.indexOf(current) : -1;
    let next = idx;
    if (e.key === 'ArrowDown') next = (idx + 1) % opts.length;
    else if (e.key === 'ArrowUp') next = (idx - 1 + opts.length) % opts.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = opts.length - 1;
    opts[next]?.focus();
  }

  function pick(size: DisplaySize, e: MouseEvent) {
    e.stopPropagation();
    onresize?.(size);
    popoverOpen = false;
  }

  function remove(e: MouseEvent) {
    e.stopPropagation();
    onremove?.();
  }

  // Keyboard entry: focus the card so screen readers and Tab users can reach
  // it. Enter/Space opens the resize sheet (which already has full keyboard
  // navigation from a previous batch). Escape blurs focus.
  function onCardKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return;
    if (e.key === 'Escape') {
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    e.preventDefault();
    popoverOpen = true;
  }
</script>

<div
  bind:this={cardEl}
  class="card"
  class:has-popover={popoverOpen}
  class:has-actions={!!onresize || !!onremove}
  style:width="{px}px"
  style:height="{px}px"
  title={item.alt}
  tabindex="0"
  role="button"
  aria-label={item.alt ? `Image: ${item.alt}` : 'Image'}
  onkeydown={onCardKeydown}
>
  <div class="card-image">
    {#if imageBroken}
      <div class="broken" role="img" aria-label="Image failed to load">
        <span aria-hidden="true">!</span>
      </div>
    {:else}
      <img
        src={item.url}
        alt={item.alt}
        draggable="false"
        onerror={() => (imageBroken = true)}
      />
    {/if}
  </div>
  {#if onremove}
    <button
      type="button"
      class="remove-handle"
      class:destructive
      aria-label={onremoveLabel}
      title={onremoveLabel}
      onclick={remove}
    ><X size={14} strokeWidth={2.5} aria-hidden="true" /></button>
  {/if}
  {#if onresize}
    <button
      bind:this={resizeHandleEl}
      type="button"
      class="resize-handle"
      aria-label="Resize image"
      title="Resize"
      aria-haspopup="menu"
      aria-expanded={popoverOpen}
      onclick={togglePopover}
    ><Maximize2 size={13} aria-hidden="true" /></button>
  {/if}
  {#if popoverOpen}
    <div
      bind:this={popoverEl}
      class="resize-sheet"
      role="menu"
      aria-label="Resize image"
      tabindex="-1"
      onkeydown={onPopoverKeydown}
      transition:fade={{ duration: 120 }}
    >
      {#each sizes as s (s)}
        {@const spx = DISPLAY_SIZE_PX[s]}
        <button
          type="button"
          class="size-option"
          class:active={item.displaySize === s}
          role="menuitemradio"
          aria-checked={item.displaySize === s}
          onclick={(e) => pick(s, e)}
        >
          <span class="size-preview" style:width="{Math.min(spx, 60)}px" style:height="{Math.min(spx, 60)}px"></span>
          <span class="size-label">{s}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--ink-08);
    box-shadow: var(--elevation-1);
    background: var(--surface-panel);
    flex-shrink: 0;
    cursor: grab;
    transition: box-shadow var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard);
  }

  .card:hover {
    box-shadow: var(--elevation-2);
    border-color: var(--ink-16);
  }

  .card.has-popover {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }

  .card-image {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: inherit;
  }

  .broken {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-neutral-200);
    color: var(--on-surface-secondary);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 24px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--ink-75);
    color: white;
    font-size: 13px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
    z-index: 2;
  }

  .card:hover .resize-handle,
  .card:focus-within .resize-handle,
  .card.has-popover .resize-handle {
    opacity: 1;
  }

  .resize-handle:hover {
    background: var(--color-secondary);
  }

  .remove-handle {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--ink-75);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard);
    z-index: 2;
  }

  .card:hover .remove-handle,
  .card:focus-within .remove-handle,
  .remove-handle:focus-visible {
    opacity: 1;
  }

  .remove-handle:hover {
    background: var(--on-surface-primary);
    transform: scale(1.1);
  }

  .remove-handle.destructive:hover {
    background: var(--color-error-fill);
  }

  @media (hover: none) {
    .resize-handle,
    .remove-handle {
      opacity: 1;
      width: 24px;
      height: 24px;
    }
  }

  .resize-sheet {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    background: var(--surface-panel);
    border: 1.5px solid var(--color-neutral-200);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-3);
    padding: var(--space-2);
    display: flex;
    gap: var(--space-1);
  }

  .size-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-secondary);
    font-size: 11px;
    font-weight: 600;
    min-width: 64px;
    transition: background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .size-option:hover {
    background: var(--color-neutral-100);
    color: var(--on-surface-primary);
  }

  .size-option.active {
    background: var(--color-secondary-subtle);
    color: var(--color-secondary);
  }

  .size-preview {
    background: var(--color-neutral-200);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .size-option.active .size-preview {
    background: var(--color-secondary);
  }

  .size-label {
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
  }
</style>
