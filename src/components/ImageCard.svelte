<script lang="ts">
  import { Maximize2, X } from '@lucide/svelte';
  import type { DisplaySize, Item } from '../lib/types';
  import { DISPLAY_SIZE_PX } from '../lib/types';

  let {
    item,
    onresize,
    onremove
  }: {
    item: Item;
    onresize?: (size: DisplaySize) => void;
    onremove?: () => void;
  } = $props();

  let popoverOpen = $state(false);
  let cardEl: HTMLDivElement | undefined = $state();

  const px = $derived(DISPLAY_SIZE_PX[item.displaySize]);

  const sizes: DisplaySize[] = ['S', 'M', 'L'];

  function togglePopover(e: MouseEvent) {
    e.stopPropagation();
    popoverOpen = !popoverOpen;
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

  function onWindowClick(e: MouseEvent) {
    if (!popoverOpen || !cardEl) return;
    if (!cardEl.contains(e.target as Node)) {
      popoverOpen = false;
    }
  }
</script>

<svelte:window onclick={onWindowClick} />

<div
  bind:this={cardEl}
  class="card"
  class:has-popover={popoverOpen}
  class:has-actions={!!onresize || !!onremove}
  style:width="{px}px"
  style:height="{px}px"
  title={item.alt}
>
  <div class="card-image">
    <img src={item.url} alt={item.alt} draggable="false" />
  </div>
  {#if onremove}
    <button
      type="button"
      class="remove-handle"
      aria-label="Remove image"
      title="Remove"
      onclick={remove}
    ><X size={14} strokeWidth={2.5} aria-hidden="true" /></button>
  {/if}
  {#if onresize}
    <button
      type="button"
      class="resize-handle"
      aria-label="Resize image"
      title="Resize"
      onclick={togglePopover}
    ><Maximize2 size={13} aria-hidden="true" /></button>
  {/if}
  {#if popoverOpen}
    <div class="resize-sheet" role="menu">
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
    border: 1.5px solid rgba(36, 30, 23, 0.08);
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
    border-color: rgba(36, 30, 23, 0.16);
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
    background: rgba(36, 30, 23, 0.75);
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
    top: 2px;
    right: 2px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(36, 30, 23, 0.75);
    color: white;
    font-size: 16px;
    line-height: 1;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
    z-index: 2;
  }

  .card:hover .remove-handle,
  .card:focus-within .remove-handle {
    opacity: 1;
  }

  .remove-handle:hover {
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
