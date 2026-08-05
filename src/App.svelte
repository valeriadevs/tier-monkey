<script lang="ts">
  import {
    ArrowLeft,
    Check,
    Download,
    Moon,
    Monitor,
    Sun,
    TriangleAlert,
    Undo2,
    Redo2,
    Upload,
    ImageDown
  } from '@lucide/svelte';
  import { listStore } from './lib/list.svelte';
  import { themeStore } from './lib/theme.svelte';
  import { uploadFiles, type UploadResult } from './lib/upload';
  import { exportListToPng, downloadBlob, sanitizeFilename } from './lib/export';
  import { db } from './lib/db';
  import {
    buildShareSnapshotFromList,
    clearShareHash,
    decodeShare,
    encodeShare,
    readShareFromHash,
    shareUrl,
    type ShareSnapshot
  } from './lib/share';
  import TierRow from './components/TierRow.svelte';
  import ItemTray from './components/ItemTray.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import TemplatesModal from './components/TemplatesModal.svelte';
  import ShareImportModal from './components/ShareImportModal.svelte';
  import ShareLinkModal from './components/ShareLinkModal.svelte';

  type View = 'dashboard' | 'editor';
  let view = $state<View>('dashboard');

  let uploadError = $state<string | null>(null);
  let infoToast = $state<string | null>(null);
  let isWindowDragOver = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let isExporting = $state(false);
  let isSharing = $state(false);

  let templatesModalOpen = $state(false);
  let shareImportSnapshot = $state<ShareSnapshot | null>(null);
  let shareImportError = $state<string | null>(null);
  let isImportingShare = $state(false);
  let shareLinkUrl = $state<string | null>(null);
  let shareLinkSizeKb = $state(0);

  themeStore.load();

  const themeLabel = $derived(
    themeStore.mode === 'auto' ? 'Auto theme' : themeStore.mode === 'light' ? 'Light theme' : 'Dark theme'
  );

  function showToast(msg: string, durationMs = 4000) {
    infoToast = msg;
    setTimeout(() => {
      infoToast = null;
    }, durationMs);
  }

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

  function openTemplatesModal() {
    if (templatesModalOpen) return;
    templatesModalOpen = true;
  }

  function closeTemplatesModal() {
    templatesModalOpen = false;
  }

  function handleTemplateApplied() {
    if (view === 'dashboard') {
      view = 'editor';
    }
  }

  async function handleExport() {
    if (isExporting) return;
    if (listStore.tiers.length === 0) return;
    isExporting = true;
    try {
      const blob = await exportListToPng({
        title: listStore.currentTitle,
        tiers: listStore.tiers,
        items: listStore.items
      });
      downloadBlob(blob, `${sanitizeFilename(listStore.currentTitle)}.png`);
    } catch (e) {
      uploadError = `Export failed: ${(e as Error).message}`;
      setTimeout(() => {
        uploadError = null;
      }, 5000);
    } finally {
      isExporting = false;
    }
  }

  async function resizeImageForShare(blob: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const targetSize = 80;
    const scale = Math.min(1, targetSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.6 });
  }

  async function getAssetBlob(assetId: string): Promise<Blob | null> {
    const asset = await db.assets.get(assetId);
    return asset?.masterBlob ?? null;
  }

  async function handleShare() {
    if (isSharing) return;
    if (listStore.tiers.length === 0) {
      uploadError = 'Add some tiers before sharing.';
      setTimeout(() => {
        uploadError = null;
      }, 4000);
      return;
    }
    isSharing = true;
    try {
      const snapshot = await buildShareSnapshotFromList(
        {
          title: listStore.currentTitle,
          tiers: listStore.tiers,
          items: listStore.items
        },
        getAssetBlob,
        resizeImageForShare
      );
      const encoded = await encodeShare(snapshot);
      const url = shareUrl(encoded);
      const sizeKb = Math.round(encoded.length / 1024);
      shareLinkUrl = url;
      shareLinkSizeKb = sizeKb;
      try {
        await navigator.clipboard.writeText(url);
        showToast(`Link copied (${sizeKb} KB)`);
      } catch {
        showToast(`Share link ready (${sizeKb} KB) — see dialog`);
      }
    } catch (e) {
      uploadError = `Share failed: ${(e as Error).message}`;
      setTimeout(() => {
        uploadError = null;
      }, 5000);
    } finally {
      isSharing = false;
    }
  }

  function closeShareLinkModal() {
    shareLinkUrl = null;
  }

  async function initShareImport() {
    const encoded = readShareFromHash();
    if (!encoded) return;
    try {
      const snap = await decodeShare(encoded);
      shareImportSnapshot = snap;
    } catch (e) {
      shareImportError = `Bad share link: ${(e as Error).message}`;
      clearShareHash();
    }
  }

  async function acceptShareImport() {
    if (!shareImportSnapshot || isImportingShare) return;
    isImportingShare = true;
    try {
      await listStore.importShareSnapshot(shareImportSnapshot);
      view = 'editor';
      shareImportSnapshot = null;
      clearShareHash();
    } catch (e) {
      uploadError = `Import failed: ${(e as Error).message}`;
      setTimeout(() => {
        uploadError = null;
      }, 5000);
    } finally {
      isImportingShare = false;
    }
  }

  function cancelShareImport() {
    shareImportSnapshot = null;
    clearShareHash();
  }

  function onKeydown(e: KeyboardEvent) {
    if (templatesModalOpen || shareImportSnapshot) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      listStore.undo();
    } else if ((key === 'z' && e.shiftKey) || key === 'y') {
      e.preventDefault();
      listStore.redo();
    }
  }

  $effect(() => {
    void initShareImport();
  });

  function onHashChange() {
    void initShareImport();
  }

  const totalItems = $derived(listStore.items.length);
  const rankedItems = $derived(listStore.items.filter((i) => i.tierId !== null).length);
</script>

<svelte:window
  onkeydown={onKeydown}
  onhashchange={onHashChange}
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
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
    {/if}
    <span class="logo" aria-hidden="true">🐵</span>
    <span class="brand-name">Tier <span class="brand-accent">Monkey</span></span>
  </div>
  <div class="toolbar-spacer"></div>
  {#if view === 'editor'}
    <button
      class="btn-icon"
      onclick={() => listStore.undo()}
      disabled={!listStore.canUndo}
      title="Undo (Ctrl+Z)"
      aria-label="Undo"
    ><Undo2 size={18} aria-hidden="true" /></button>
    <button
      class="btn-icon"
      onclick={() => listStore.redo()}
      disabled={!listStore.canRedo}
      title="Redo (Ctrl+Shift+Z)"
      aria-label="Redo"
    ><Redo2 size={18} aria-hidden="true" /></button>
    <button class="btn-secondary" onclick={pickFiles}><Upload size={16} aria-hidden="true" /> Upload</button>
    <button class="btn-secondary" onclick={openTemplatesModal}>Templates</button>
    <button class="btn-secondary" onclick={handleShare} disabled={isSharing}>
      {isSharing ? 'Sharing…' : 'Share'}
    </button>
  {/if}
  <button
    class="btn-icon"
    onclick={() => themeStore.cycle()}
    title={themeLabel}
    aria-label={themeLabel}
  >
    {#if themeStore.mode === 'auto'}
      <Monitor size={18} aria-hidden="true" />
    {:else if themeStore.mode === 'light'}
      <Sun size={18} aria-hidden="true" />
    {:else}
      <Moon size={18} aria-hidden="true" />
    {/if}
  </button>
  {#if view === 'editor'}
    <button class="btn-primary" onclick={handleExport} disabled={isExporting}>
      {#if isExporting}Exporting…{:else}<Download size={16} aria-hidden="true" /> Export{/if}
    </button>
  {/if}
</header>

<main class="canvas">
  {#if view === 'dashboard'}
    <Dashboard
      onopeneditor={() => (view = 'editor')}
      onopenTemplates={openTemplatesModal}
    />
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
    <div class="drop-overlay-text"><ImageDown size={20} aria-hidden="true" /> Drop images anywhere to upload</div>
  </div>
{/if}

{#if uploadError}
  <div class="toast" role="alert">
    <span class="toast-icon"><TriangleAlert size={18} aria-hidden="true" /></span>
    <span class="toast-text">{uploadError}</span>
  </div>
{/if}

{#if infoToast}
  <div class="toast info" role="status">
    <span class="toast-icon"><Check size={18} aria-hidden="true" /></span>
    <span class="toast-text">{infoToast}</span>
  </div>
{/if}

{#if view === 'editor'}
  <footer class="status-bar">
    <span class="status-text">
      {rankedItems} ranked · {totalItems - rankedItems} in tray · {totalItems} total
    </span>
  </footer>
{/if}

<TemplatesModal
  open={templatesModalOpen}
  onclose={closeTemplatesModal}
  onapplied={handleTemplateApplied}
/>

<ShareImportModal
  open={shareImportSnapshot !== null}
  snapshot={shareImportSnapshot}
  onaccept={acceptShareImport}
  oncancel={cancelShareImport}
  importing={isImportingShare}
/>

<ShareLinkModal
  open={shareLinkUrl !== null}
  url={shareLinkUrl ?? ''}
  sizeKb={shareLinkSizeKb}
  onclose={closeShareLinkModal}
/>

{#if shareImportError}
  <div class="toast" role="alert">
    <span class="toast-icon"><TriangleAlert size={18} aria-hidden="true" /></span>
    <span class="toast-text">{shareImportError}</span>
  </div>
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
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    transition: transform var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sticker-hover);
  }

  .btn-primary:active {
    transform: translateY(2px);
    box-shadow: var(--shadow-sticker-active);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-sticker);
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
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
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

  .btn-icon:hover:not(:disabled) {
    background: var(--color-neutral-100);
  }

  .btn-icon:disabled {
    color: var(--on-surface-disabled);
    cursor: not-allowed;
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
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
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

  .toast.info {
    background: var(--color-secondary);
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

  @media (max-width: 640px) {
    /* Status bar overlaps the item tray on small screens. Hide it there —
       the tray header already shows the same counts at a glance. */
    .status-bar {
      display: none;
    }
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

  @media (max-width: 768px) {
    .toolbar {
      padding: 0 var(--space-3);
      gap: var(--space-1);
      height: 52px;
    }

    .brand-name {
      font-size: 16px;
    }

    .logo {
      font-size: 22px;
    }

    .btn-secondary {
      padding: 0 var(--space-2);
      font-size: 12px;
      height: 32px;
    }

    .btn-primary {
      height: 36px;
      font-size: 13px;
      padding: 0 var(--space-3);
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }

    .canvas {
      padding: var(--space-3);
    }

    .tier-list {
      gap: var(--space-2);
    }

    .toast {
      max-width: calc(100vw - 32px);
      bottom: 180px;
      font-size: 13px;
    }

    .status-bar {
      right: var(--space-2);
      bottom: var(--space-1);
    }
  }

  @media (max-width: 540px) {
    .toolbar {
      flex-wrap: wrap;
      height: auto;
      padding: var(--space-2) var(--space-3);
      gap: var(--space-2);
    }

    .toolbar-spacer {
      flex: 1;
      min-width: 0;
    }

    .toast {
      bottom: 240px;
    }
  }

  @media (max-width: 480px) {
    .brand-name {
      display: none;
    }

    .back-btn {
      margin-right: 0;
    }
  }
</style>
