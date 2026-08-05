<script lang="ts">
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import type { Item } from '../lib/types';
  import { DND_TYPE_ITEMS } from '../lib/types';
  import { listStore } from '../lib/list.svelte';
  import ImageCard from './ImageCard.svelte';

  let { items }: { items: Item[] } = $props();

  let localItems = $state<Item[]>([]);

  $effect(() => {
    localItems = items;
  });

  function handleConsider(e: CustomEvent<{ items: Item[] }>) {
    localItems = e.detail.items;
  }

  function handleFinalize(e: CustomEvent<{ items: Item[] }>) {
    const finalItems = e.detail.items;
    const realItems = finalItems.filter(
      (i) => !(i as unknown as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
    );
    localItems = finalItems;
    listStore.setItemsTier(null, realItems);
  }
</script>

<div class="tray">
  <div class="tray-header">
    <div class="tray-title-block">
      <span class="tray-title">Item tray</span>
      <span class="tray-count">{localItems.length}</span>
    </div>
    {#if localItems.length > 0}
      <button class="clear-btn" onclick={() => listStore.clearAll()}>Clear all</button>
    {/if}
  </div>
  <div
    class="tray-body"
    class:empty={localItems.length === 0}
    use:dndzone={{
      items: localItems,
      type: DND_TYPE_ITEMS,
      flipDurationMs: 200,
      dropTargetClasses: ['is-dragging-over']
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    <div class="tray-items">
      {#each localItems as item (item.id)}
        <ImageCard
          {item}
          onresize={(size) => listStore.setItemDisplaySize(item.id, size)}
          onremove={() => listStore.removeItem(item.id)}
        />
      {/each}
    </div>
    {#if localItems.length === 0}
      <div class="empty-state">
        <span class="empty-emoji" aria-hidden="true">🐵</span>
        <span class="empty-text">Nothing to judge yet.</span>
        <span class="empty-sub">Feed the monkey — drag images anywhere or click <strong>Upload</strong> above.</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .tray {
    background: var(--surface-sunken);
    border-top: 1.5px solid var(--color-neutral-200);
    padding: var(--space-3) var(--space-6) var(--space-4);
    box-shadow: 0 -2px 8px rgba(36, 30, 23, 0.04);
  }

  .tray-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .tray-title-block {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .tray-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--on-surface-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .tray-count {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-neutral-500);
    padding: 2px 8px;
    background: var(--color-neutral-200);
    border-radius: var(--radius-full, 999px);
  }

  .clear-btn {
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 13px;
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .clear-btn:hover {
    background: var(--color-neutral-200);
    color: var(--on-surface-primary);
  }

  .tray-body {
    position: relative;
    min-height: 140px;
    padding: var(--space-3);
    border: 1.5px dashed transparent;
    border-radius: var(--radius-md);
    touch-action: none;
    transition: background-color var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard);
  }

  .tray-body.empty {
    border-color: var(--color-neutral-300);
  }

  .tray-body:global(.is-dragging-over) {
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    border-color: var(--color-secondary);
    border-style: dashed;
  }

  .tray-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-3);
    color: var(--on-surface-secondary);
    pointer-events: none;
  }

  .empty-emoji {
    font-size: 32px;
    margin-bottom: var(--space-1);
  }

  .empty-text {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--on-surface-primary);
  }

  .empty-sub {
    font-size: 13px;
    color: var(--color-neutral-500);
    max-width: 380px;
    text-align: center;
  }

  @media (max-width: 768px) {
    .tray {
      padding: var(--space-2) var(--space-3) var(--space-3);
    }

    .tray-body {
      min-height: 120px;
      padding: var(--space-2);
    }

    .empty-emoji {
      font-size: 26px;
    }
    .empty-text {
      font-size: 16px;
    }
    .empty-sub {
      font-size: 12px;
    }
  }
</style>
