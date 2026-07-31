<script lang="ts">
  import { listStore } from './lib/list.svelte';
  import { themeStore } from './lib/theme.svelte';
  import { uploadFiles, type UploadResult } from './lib/upload';
  import TierRow from './components/TierRow.svelte';
  import ItemTray from './components/ItemTray.svelte';
  import Dashboard from './components/Dashboard.svelte';

  type View = 'dashboard' | 'editor';
  let view = $state<View>('dashboard');

  let uploadError = $state<string | null>(null);
  let isWindowDragOver = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();

  themeStore.load();

  const themeIcon = $derived(
    themeStore.mode === 'auto' ? '🌓' : themeStore.mode === 'light' ? '☀' : '🌙'
  );
  const themeLabel = $derived(
    themeStore.mode === 'auto' ? 'Auto theme' : themeStore.mode === 'light' ? 'Light theme' : 'Dark theme'
  );

  function handleResult(result: UploadResult) {
    if (result.image) {
      void listStore.addItemFromUpload(result.image);
    } else if (result.error) {
      uploadError = `${result.error.filename}: ${result.error.reason}`;
      setTimeout(() => {
        uploadError = null;
      }, 5000);
    }
  }

  function pickFiles() {
    fileInputEl?.click();
  }

  function onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    void uploadFiles(input.files, handleResult);
    input.value = '';
  }

  function isFileDrag(e: DragEvent): boolean {
    return !!e.dataTransfer?.types.includes('Files');
  }

  function onWindowDragEnter(e: DragEvent) {
    if (isFileDrag(e)) {
      isWindowDragOver = true;
    }
  }

  function onWindowDragOver(e: DragEvent) {
    if (isFileDrag(e)) {
      e.preventDefault();
    }
  }

  function onWindowDragLeave(e: DragEvent) {
    if (e.relatedTarget === null) {
      isWindowDragOver = false;
    }
  }

  function onWindowDrop(e: DragEvent) {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      isWindowDragOver = false;
      if (view !== 'editor') return;
      void uploadFiles(e.dataTransfer.files, handleResult);
    }
  }

  function addTierAtEnd() {
    listStore.addTier();
  }

  function addTierAbove(index: number) {
    listStore.addTier(index);
  }

  function addTierBelow(index: number) {
    listStore.addTier(index + 1);
  }

  async function gotoDashboard() {
    await listStore.flushPendingSave();
    listStore.unload();
    view = 'dashboard';
  }

  const totalItems = $derived(listStore.items.length);
  const rankedItems = $derived(listStore.items.filter((i) => i.tierId !== null).length);
</script>

<svelte:window
  ondragenter={onWindowDragEnter}
  ondragover={onWindowDragOver}
  ondragleave={onWindowDragLeave}
  ondrop={onWindowDrop}
/>

<input
  bind:this={fileInputEl}
  type="file"
  accept="image/*"
  multiple
  hidden
  onchange={onFileInputChange}
/>

<header class="toolbar">
  <div class="brand">
    {#if view === 'editor'}
      <button class="back-btn" onclick={gotoDashboard} aria-label="Back to dashboard" title="Back to dashboard">
        ←
      </button>
    {/if}
    <span class="logo">🐵</span>
    <span class="brand-name">Tier <span class="brand-accent">Monkey</span></span>
  </div>
  <div class="toolbar-spacer"></div>
  {#if view === 'editor'}
    <button class="btn-secondary" onclick={pickFiles}>⬆ Upload</button>
    <button class="btn-secondary">Templates</button>
    <button class="btn-secondary">Share</button>
  {/if}
  <button
    class="btn-icon"
    onclick={() => themeStore.cycle()}
    title={themeLabel}
    aria-label={themeLabel}
  >
    {themeIcon}
  </button>
  {#if view === 'editor'}
    <button class="btn-primary">⬇ Export</button>
  {/if}
</header>

<main class="canvas">
  {#if view === 'dashboard'}
    <Dashboard onopeneditor={() => (view = 'editor')} />
  {:else}
    <div class="tier-list">
      {#each listStore.tiers as tier, index (tier.id)}
        <TierRow
          {tier}
          {index}
          items={listStore.itemsInTier(tier.id)}
          onaddtierabove={() => addTierAbove(index)}
          onaddtierbelow={() => addTierBelow(index)}
        />
      {/each}

      <button class="add-tier-btn" onclick={addTierAtEnd}>+ Add tier</button>
    </div>
  {/if}
</main>

{#if view === 'editor'}
  <ItemTray items={listStore.trayItems()} />
{/if}

{#if isWindowDragOver && view === 'editor'}
  <div class="drop-overlay">
    <div class="drop-overlay-text">📥 Drop images anywhere to upload</div>
  </div>
{/if}

{#if uploadError}
  <div class="toast" role="alert">
    <span class="toast-icon">⚠</span>
    <span class="toast-text">{uploadError}</span>
  </div>
{/if}

{#if view === 'editor'}
  <footer class="status-bar">
    <span class="status-text">
      {rankedItems} ranked · {totalItems - rankedItems} in tray · {totalItems} total
    </span>
  </footer>
{/if}

<style>
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 56px;
    padding: 0 var(--space-6);
    background: var(--surface-panel);
    border-bottom: 1.5px solid var(--color-neutral-200);
    box-shadow: 0 1px 3px rgba(36, 30, 23, 0.04);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .logo {
    font-size: 26px;
    line-height: 1;
  }

  .brand-name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 20px;
    letter-spacing: -0.01em;
    color: var(--on-surface-primary);
  }

  .brand-accent {
    color: var(--color-primary-active);
  }

  .back-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-secondary);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--space-1);
    transition: background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .back-btn:hover {
    background: var(--color-neutral-100);
    color: var(--on-surface-primary);
  }

  .toolbar-spacer {
    flex: 1;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding: 0 var(--space-4);
    height: 40px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 14px;
    box-shadow: var(--shadow-sticker);
    transition: transform var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: 4px 4px 0 #241E17;
  }

  .btn-primary:active {
    transform: translateY(2px);
    box-shadow: 1px 1px 0 #241E17;
  }

  .btn-secondary {
    background: var(--surface-panel);
    color: var(--on-surface-primary);
    border: 1.5px solid var(--color-neutral-300);
    padding: 0 var(--space-3);
    height: 36px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    font-size: 14px;
    transition: border-color var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
  }

  .btn-secondary:hover {
    border-color: var(--color-neutral-500);
    background: var(--color-neutral-50);
  }

  .btn-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-primary);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .btn-icon:hover {
    background: var(--color-neutral-100);
  }

  .canvas {
    flex: 1;
    padding: var(--space-6);
    overflow-y: auto;
    background:
      radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0);
    background-size: 16px 16px;
  }

  .tier-list {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .add-tier-btn {
    align-self: center;
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-5);
    color: var(--color-neutral-500);
    background: var(--surface-panel);
    border: 1.5px dashed var(--color-neutral-300);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 14px;
    transition: color var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard);
  }

  .add-tier-btn:hover {
    color: var(--color-on-primary);
    background: var(--color-primary);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sticker);
  }

  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    background: color-mix(in srgb, var(--color-secondary) 8%, transparent);
    border: 4px dashed var(--color-secondary);
    border-radius: 12px;
    margin: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }

  .drop-overlay-text {
    background: var(--surface-panel);
    padding: var(--space-4) var(--space-6);
    border-radius: var(--radius-md);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    box-shadow: var(--shadow-sticker);
    color: var(--color-secondary);
  }

  .toast {
    position: fixed;
    bottom: 220px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-neutral-900);
    color: white;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-2);
    font-size: 14px;
    max-width: 480px;
  }

  .toast-icon {
    font-size: 18px;
  }

  .status-bar {
    position: fixed;
    bottom: var(--space-2);
    right: var(--space-4);
    z-index: 5;
    pointer-events: none;
  }

  .status-text {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-neutral-500);
    background: var(--surface-panel);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 2px rgba(36, 30, 23, 0.04);
  }
</style>
