<script lang="ts">
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { fade } from 'svelte/transition';
  import { ChevronUp, ChevronDown, Ellipsis, Palette, Pencil, Trash2 } from '@lucide/svelte';
  import type { Item, Tier } from '../lib/types';
  import { DND_TYPE_ITEMS } from '../lib/types';
  import { listStore } from '../lib/list.svelte';
  import ImageCard from './ImageCard.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let {
    tier,
    items,
    index,
    onaddtierabove,
    onaddtierbelow
  }: {
    tier: Tier;
    items: Item[];
    index: number;
    onaddtierabove: () => void;
    onaddtierbelow: () => void;
  } = $props();

  let localItems = $state<Item[]>([]);

  let isRenaming = $state(false);
  let renameValue = $state('');
  let renameInputEl: HTMLInputElement | undefined = $state();
  let colorPickerOpen = $state(false);
  let colorDotEl: HTMLButtonElement | undefined = $state();
  let menuOpen = $state(false);
  let menuButtonEl: HTMLButtonElement | undefined = $state();
  let menuEl: HTMLDivElement | undefined = $state();
  let confirmDeleteOpen = $state(false);

  $effect(() => {
    localItems = items;
  });

  $effect(() => {
    if (isRenaming && renameInputEl) {
      renameInputEl.focus();
      renameInputEl.select();
    }
  });

  // Focus the first menu item when the kebab opens, and close on Escape.
  $effect(() => {
    if (menuOpen && menuEl) {
      queueMicrotask(() => {
        const first = menuEl!.querySelector<HTMLElement>('.menu-item');
        first?.focus();
      });
    }
  });

  function onMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      menuOpen = false;
      menuButtonEl?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const items = Array.from(menuEl?.querySelectorAll<HTMLElement>('.menu-item') ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;
    let next = idx;
    if (e.key === 'ArrowDown') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    items[next]?.focus();
  }

  function closeMenu() {
    menuOpen = false;
    menuButtonEl?.focus();
  }

  function handleConsider(e: CustomEvent<{ items: Item[] }>) {
    localItems = e.detail.items;
  }

  function handleFinalize(e: CustomEvent<{ items: Item[] }>) {
    const finalItems = e.detail.items;
    const realItems = finalItems.filter(
      (i) => !(i as unknown as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
    );
    localItems = finalItems;
    listStore.setItemsTier(tier.id, realItems);
  }

  function startRename() {
    renameValue = tier.label;
    isRenaming = true;
  }

  function commitRename() {
    const trimmed = renameValue.trim().slice(0, 24);
    if (trimmed && trimmed !== tier.label) {
      listStore.renameTier(tier.id, trimmed);
    }
    isRenaming = false;
  }

  function cancelRename() {
    isRenaming = false;
    renameValue = tier.label;
  }

  function pickColor(color: string) {
    listStore.setTierColor(tier.id, color);
  }

  function deleteThisTier() {
    menuOpen = false;
    confirmDeleteOpen = true;
  }

  function confirmDelete() {
    listStore.deleteTier(tier.id);
    confirmDeleteOpen = false;
  }

  function cancelDelete() {
    confirmDeleteOpen = false;
  }

  function handleOutsideClick(e: MouseEvent) {
    if (!menuOpen && !colorPickerOpen) return;
    if (colorPickerOpen && colorDotEl && !colorDotEl.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (!target.closest('.picker')) colorPickerOpen = false;
    }
    if (menuOpen && menuButtonEl && !menuButtonEl.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (!target.closest('.tier-menu')) menuOpen = false;
    }
  }

  const deleteConfirmMessage = $derived.by(() => {
    const count = listStore.tierItemCount(tier.id);
    return count > 0
      ? `Delete this tier? ${count} item${count === 1 ? '' : 's'} will return to the tray.`
      : 'Delete this tier?';
  });
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="tier-row">
  <div class="tier-label" style:background={tier.color}>
    {#if isRenaming}
      <input
        bind:this={renameInputEl}
        bind:value={renameValue}
        class="rename-input"
        onblur={commitRename}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitRename();
          if (e.key === 'Escape') cancelRename();
        }}
        maxlength="24"
      />
    {:else}
      <button
        type="button"
        class="tier-label-text"
        onclick={startRename}
        title="Rename tier"
      >
        {tier.label}
      </button>
    {/if}
    <button
      bind:this={colorDotEl}
      type="button"
      class="color-dot"
      onclick={() => (colorPickerOpen = !colorPickerOpen)}
      aria-label="Change tier color"
    ></button>
    {#if colorPickerOpen}
      <div class="picker-anchor" transition:fade={{ duration: 120 }}>
        <ColorPicker
          value={tier.color}
          onchange={pickColor}
          onclose={() => (colorPickerOpen = false)}
        />
      </div>
    {/if}
  </div>
  <div
    class="tier-dropzone"
    use:dndzone={{
      items: localItems,
      type: DND_TYPE_ITEMS,
      flipDurationMs: 200,
      dropTargetClasses: ['is-dragging-over'],
      morphDisabled: true
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
      <div class="tier-items">
        {#each localItems as item (item.id)}
          <ImageCard
            {item}
            onresize={(size) => listStore.setItemDisplaySize(item.id, size)}
            onremove={() => listStore.moveItemToTray(item.id)}
            onremoveLabel="Return to tray"
          />
        {/each}
      </div>
    {#if localItems.length === 0}
      <span class="empty-hint">Drop items here</span>
    {/if}
  </div>
  <div class="tier-actions">
    <button
      bind:this={menuButtonEl}
      type="button"
      class="icon-btn tier-menu-btn"
      onclick={() => (menuOpen = !menuOpen)}
      aria-label="Tier options"
      title="Tier options"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
    >
      <Ellipsis size={18} aria-hidden="true" />
    </button>
    {#if menuOpen}
      <div
        bind:this={menuEl}
        class="tier-menu"
        role="menu"
        aria-label="Tier options"
        tabindex="-1"
        onkeydown={onMenuKeydown}
        transition:fade={{ duration: 120 }}
      >
        <button class="menu-item" role="menuitem" onclick={() => { startRename(); menuOpen = false; }}><Pencil size={15} aria-hidden="true" /> Rename</button>
        <button class="menu-item" role="menuitem" onclick={() => { colorPickerOpen = true; menuOpen = false; }}><Palette size={15} aria-hidden="true" /> Change color</button>
        <button class="menu-item" role="menuitem" onclick={() => { listStore.moveTier(tier.id, -1); menuOpen = false; }}><ChevronUp size={15} aria-hidden="true" /> Move up</button>
        <button class="menu-item" role="menuitem" onclick={() => { listStore.moveTier(tier.id, 1); menuOpen = false; }}><ChevronDown size={15} aria-hidden="true" /> Move down</button>
        <button class="menu-item" role="menuitem" onclick={() => { onaddtierabove(); menuOpen = false; }}><ChevronUp size={15} aria-hidden="true" /> Add tier above</button>
        <button class="menu-item" role="menuitem" onclick={() => { onaddtierbelow(); menuOpen = false; }}><ChevronDown size={15} aria-hidden="true" /> Add tier below</button>
        <div class="menu-divider" aria-hidden="true"></div>
        <button class="menu-item destructive" role="menuitem" onclick={deleteThisTier}><Trash2 size={15} aria-hidden="true" /> Delete tier</button>
      </div>
    {/if}
  </div>
</div>

<ConfirmDialog
  open={confirmDeleteOpen}
  title="Delete tier"
  message={deleteConfirmMessage}
  confirmLabel="Delete"
  cancelLabel="Keep tier"
  destructive
  onconfirm={confirmDelete}
  oncancel={cancelDelete}
/>

<style>
  .tier-row {
    display: flex;
    min-height: 88px;
    background: var(--surface-panel);
    border: 1.5px solid var(--color-neutral-200);
    border-radius: var(--radius-md);
    overflow: visible;
    box-shadow: var(--elevation-1);
    transition: border-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
    position: relative;
  }

  .tier-row:hover {
    border-color: var(--color-neutral-300);
    box-shadow: var(--elevation-2);
  }

  .tier-label {
    width: 120px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-on-primary);
    position: relative;
  }

  .tier-label-text {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    letter-spacing: 0.01em;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .tier-label-text:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .rename-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.95);
    color: var(--color-on-primary);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    text-align: center;
  }

  .rename-input:focus {
    outline: 2px solid var(--color-secondary);
    outline-offset: 1px;
  }

  .color-dot {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: 2px solid var(--ink-30);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard);
  }

  .tier-row:hover .color-dot,
  .tier-row:focus-within .color-dot,
  .color-dot:focus-visible {
    opacity: 1;
  }

  .color-dot:hover {
    transform: scale(1.15);
  }

  .picker-anchor {
    position: absolute;
    top: calc(100% + 6px);
    left: 8px;
    z-index: 50;
  }

  .tier-dropzone {
    flex: 1;
    padding: var(--space-2);
    position: relative;
    border-left: 1.5px dashed var(--color-neutral-300);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    min-height: 96px;
    touch-action: none;
    transition: background-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .tier-dropzone:global(.is-dragging-over) {
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    box-shadow: inset 0 0 0 2px var(--color-secondary);
  }

  .tier-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .empty-hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-neutral-500);
    font-size: 14px;
    font-style: italic;
    pointer-events: none;
  }

  .tier-actions {
    display: flex;
    align-items: flex-start;
    padding: var(--space-1);
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
  }

  .tier-row:hover .icon-btn,
  .tier-row:focus-within .icon-btn,
  .icon-btn:focus-visible {
    opacity: 1;
  }

  .icon-btn:hover {
    background: var(--color-neutral-100);
    color: var(--on-surface-primary);
  }

  .tier-menu {
    position: absolute;
    top: 40px;
    right: 8px;
    z-index: 50;
    min-width: 200px;
    background: var(--surface-panel);
    border: 1.5px solid var(--color-neutral-200);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-2);
    padding: var(--space-1);
    display: flex;
    flex-direction: column;
  }

  .menu-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-primary);
    font-size: 14px;
    font-weight: 500;
    width: 100%;
  }

  .menu-item:hover {
    background: var(--color-neutral-100);
  }

  .menu-item.destructive {
    color: var(--color-error-fill, #D92D20);
  }

  .menu-item.destructive:hover {
    background: var(--color-error-subtle, #FDE8E8);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-neutral-200);
    margin: var(--space-1) 0;
  }

  @media (max-width: 768px) {
    .tier-row {
      min-height: 72px;
    }

    .tier-label {
      width: 72px;
    }

    .tier-label-text {
      font-size: 18px;
      padding: var(--space-1);
    }

    .tier-dropzone {
      min-height: 64px;
      padding: var(--space-1) var(--space-2);
    }

    .tier-actions {
      padding: 2px;
    }

    .icon-btn {
      opacity: 1;
    }

    .menu-item {
      font-size: 15px;
      padding: var(--space-2) var(--space-3);
    }
  }

  @media (max-width: 480px) {
    .tier-row {
      flex-direction: column;
      min-height: 0;
    }

    .tier-label {
      width: 100%;
      height: 40px;
      padding: 0 var(--space-2);
    }

    .tier-label-text {
      font-size: 16px;
      padding: var(--space-1) var(--space-2);
      max-width: calc(100% - 56px);
    }

    .tier-dropzone {
      border-left: none;
      border-top: 1.5px dashed var(--color-neutral-300);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      min-height: 64px;
    }

    .tier-actions {
      position: absolute;
      top: 4px;
      right: 4px;
    }
  }
</style>
