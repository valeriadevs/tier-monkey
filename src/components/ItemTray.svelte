<script lang="ts">
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { ClipboardPaste } from '@lucide/svelte';
  import type { Item } from '../lib/types';
  import { DND_TYPE_ITEMS } from '../lib/types';
  import { listStore } from '../lib/list.svelte';
  import { processBlob } from '../lib/upload';
  import ImageCard from './ImageCard.svelte';

  let { items, onerror }: { items: Item[]; onerror?: (msg: string) => void } = $props();

  let localItems = $state<Item[]>([]);
  let urlInputOpen = $state(false);
  let urlInput = $state('');
  let urlLoading = $state(false);
  let urlInputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    localItems = items;
  });

  $effect(() => {
    if (urlInputOpen && urlInputEl) {
      urlInputEl.focus();
    }
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

  function toggleUrlInput() {
    urlInputOpen = !urlInputOpen;
    if (!urlInputOpen) urlInput = '';
  }

  async function submitUrl(e: Event) {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw || urlLoading) return;
    const urls = raw.split(/\s+/).filter((u) => /^https?:\/\//i.test(u));
    if (urls.length === 0) {
      onerror?.('No valid URLs in paste');
      return;
    }
    urlLoading = true;
    let ok = 0;
    try {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) {
            throw new Error(`Not an image (${blob.type || 'unknown type'})`);
          }
          const path = url.split('?')[0];
          const filename = path.split('/').pop() || 'pasted-image';
          const processed = await processBlob(blob, filename);
          await listStore.addItemFromUpload(processed);
          ok++;
        } catch (err) {
          onerror?.(`Paste failed (${url}): ${(err as Error).message}`);
        }
      }
      urlInput = '';
      if (ok > 0) urlInputOpen = false;
    } finally {
      urlLoading = false;
    }
  }

  async function onPaste(e: ClipboardEvent) {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((i) => i.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const blob = imageItem.getAsFile();
    if (!blob) return;
    urlLoading = true;
    try {
      const processed = await processBlob(blob, 'Pasted image');
      await listStore.addItemFromUpload(processed);
    } catch (err) {
      onerror?.(`Paste failed: ${(err as Error).message}`);
    } finally {
      urlLoading = false;
    }
  }
</script>

<div class="tray">
  <div class="tray-header">
    <div class="tray-title-block">
      <span class="tray-title">Item tray</span>
      <span class="tray-count">{localItems.length}</span>
    </div>
    <div class="tray-actions">
      <button
        class="header-btn"
        onclick={toggleUrlInput}
        aria-expanded={urlInputOpen}
      ><ClipboardPaste size={14} aria-hidden="true" /> {urlInputOpen ? 'Cancel' : 'Paste URL'}</button>
      {#if localItems.length > 0}
        <button class="header-btn" onclick={() => listStore.clearAll()}>Clear all</button>
      {/if}
    </div>
  </div>
  {#if urlInputOpen}
    <form class="url-form" onsubmit={submitUrl}>
      <input
        bind:this={urlInputEl}
        bind:value={urlInput}
        type="url"
        class="url-input"
        placeholder="https://example.com/image.png (paste image or URLs)"
        spellcheck="false"
        autocomplete="off"
        disabled={urlLoading}
        onpaste={onPaste}
      />
      <button type="submit" class="url-submit" disabled={urlLoading || !urlInput.trim()}>
        {urlLoading ? 'Fetching…' : 'Add'}
      </button>
    </form>
  {/if}
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
          onremoveLabel="Remove image"
          destructive
        />
      {/each}
    </div>
    {#if localItems.length === 0}
      <div class="empty-state">
        <span class="empty-emoji" aria-hidden="true">🐵</span>
        <span class="empty-text">Nothing to judge yet.</span>
        <span class="empty-sub">Feed the monkey — drag images anywhere, click <strong>Upload</strong> above, or paste an image URL below.</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .tray {
    background: var(--surface-sunken);
    border-top: 1.5px solid var(--color-neutral-200);
    padding: var(--space-3) var(--space-6) var(--space-4);
    box-shadow: 0 -2px 8px var(--ink-04);
  }

  .tray-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
    gap: var(--space-2);
  }

  .tray-title-block {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .tray-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
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

  .header-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 12px;
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .header-btn:hover {
    background: var(--color-neutral-200);
    color: var(--on-surface-primary);
  }

  .url-form {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .url-input {
    flex: 1;
    min-width: 0;
    height: 32px;
    padding: 0 var(--space-2);
    background: var(--surface-panel);
    border: 1.5px solid var(--color-neutral-300);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--on-surface-primary);
    outline: none;
  }

  .url-input:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }

  .url-input:disabled {
    opacity: 0.6;
  }

  .url-submit {
    height: 32px;
    padding: 0 var(--space-3);
    background: var(--color-secondary);
    color: var(--color-on-secondary);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 12px;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .url-submit:hover:not(:disabled) {
    background: var(--color-secondary-hover);
  }

  .url-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
