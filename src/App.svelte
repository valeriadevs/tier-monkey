<script lang="ts">
  import {
    ArrowLeft,
    Check,
    Copy,
    ChevronDown,
    Download,
    Ellipsis,
    ImageDown,
    Moon,
    Monitor,
    Palette,
    Pencil,
    Share2,
    Sun,
    TriangleAlert,
    Trash2,
    Undo2,
    Redo2,
    Upload,
    X
  } from '@lucide/svelte';
  import { listStore } from './lib/list.svelte';
  import { themeStore } from './lib/theme.svelte';
  import { uploadFiles, type UploadResult } from './lib/upload';
  import { popoverManager } from './lib/popovers.svelte';
  import { fade } from 'svelte/transition';
  import {
    copyBlobToClipboard,
    downloadBlob,
    exportListToBlob,
    sanitizeFilename
  } from './lib/export';
  import { db } from './lib/db';
  import { announcer } from './lib/announcer.svelte';
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
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import RenameListModal from './components/RenameListModal.svelte';
  import ShareLinkModal from './components/ShareLinkModal.svelte';

  type View = 'dashboard' | 'editor';
  let view = $state<View>('dashboard');

  type Toast = {
    id: string;
    kind: 'error' | 'info';
    message: string;
  };
  const MAX_TOASTS = 3;
  let toasts = $state<Toast[]>([]);
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

  let isWindowDragOver = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let isExporting = $state(false);
  let isSharing = $state(false);
  let exportMenuOpen = $state(false);
  let exportButtonEl: HTMLButtonElement | undefined = $state();
  let exportMenuEl: HTMLDivElement | undefined = $state();
  let listMenuOpen = $state(false);
  let listMenuButtonEl: HTMLButtonElement | undefined = $state();
  let listMenuEl: HTMLDivElement | undefined = $state();
  let confirmListDeleteOpen = $state(false);
  let renameModalOpen = $state(false);



  async function handleRenameList() {
    closeListMenu();
    renameModalOpen = true;
  }

  async function acceptRenameList(next: string) {
    const previous = listStore.currentTitle;
    listStore.renameCurrentList(next);
    renameModalOpen = false;
    if (listStore.currentTitle !== previous) {
      showToast(`Renamed to ${listStore.currentTitle}`);
    }
  }

  function requestDeleteList() {
    closeListMenu();
    confirmListDeleteOpen = true;
  }

  async function confirmDeleteList() {
    confirmListDeleteOpen = false;
    const title = listStore.currentTitle;
    await listStore.deleteCurrentList();
    showToast(`Deleted ${title}`);
    view = 'dashboard';
  }

  async function duplicateThisList() {
    closeListMenu();
    const id = await listStore.duplicateList();
    if (id) {
      showToast('List duplicated');
    } else {
      showToast('Nothing to duplicate', 'error');
    }
  }

  let templatesModalOpen = $state(false);
  let shareImportSnapshot = $state<ShareSnapshot | null>(null);
  let decodingShare = $state(false);
  let isImportingShare = $state(false);
  let shareLinkUrl = $state<string | null>(null);
  let shareLinkSizeKb = $state(0);

  themeStore.load();

  const themeLabel = $derived(
    themeStore.mode === 'auto' ? 'Auto theme' : themeStore.mode === 'light' ? 'Light theme' : 'Dark theme'
  );

  function showToast(message: string, kind: Toast['kind'] = 'info', durationMs = kind === 'error' ? 6000 : 4000) {
    const id = crypto.randomUUID().slice(0, 8);
    toasts.push({ id, kind, message });
    // Cap stack to MAX_TOASTS — oldest is dropped.
    while (toasts.length > MAX_TOASTS) toasts.shift();
    if (kind === 'error') announcer.say(message);
    if (durationMs > 0) {
      const timer = setTimeout(() => dismissToast(id), durationMs);
      toastTimers.set(id, timer);
    }
  }

  function dismissToast(id: string) {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }

  // Clear any in-flight toast timers when the app unmounts so HMR / navigation
  // doesn't leave dangling setTimeouts.
  $effect(() => {
    return () => {
      for (const t of toastTimers.values()) clearTimeout(t);
      toastTimers.clear();
    };
  });

  // Buffer results by file index so the user sees them in the picker order,
  // not the race-order the bounded uploader produces.
  let pendingResults: UploadResult[] = [];
  let nextResultCursor = 0;

  function handleResult(index: number, result: UploadResult) {
    pendingResults[index] = result;
    while (nextResultCursor < pendingResults.length && pendingResults[nextResultCursor]) {
      applyUploadResult(pendingResults[nextResultCursor]);
      nextResultCursor++;
    }
  }

  function applyUploadResult(result: UploadResult) {
    if (result.image) {
      void listStore.addItemFromUpload(result.image);
    } else if (result.error) {
      showToast(`${result.error.filename}: ${result.error.reason}`, 'error');
    }
  }

  function pickFiles() {
    fileInputEl?.click();
  }

  function onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    pendingResults = new Array(input.files.length);
    nextResultCursor = 0;
    void uploadFiles(input.files, handleResult);
    input.value = '';
  }

  function isFileDrag(e: DragEvent): boolean {
    return !!e.dataTransfer?.types.includes('Files');
  }

  // Use a counter rather than `e.relatedTarget === null` so the overlay
  // doesn't flicker when the cursor crosses between siblings inside the
  // window. The overlay only hides when the count drops back to zero
  // (i.e. the cursor has fully exited the window).
  let dragCounter = 0;

  function onWindowDragEnter(e: DragEvent) {
    if (!isFileDrag(e)) return;
    dragCounter++;
    isWindowDragOver = true;
  }

  function onWindowDragOver(e: DragEvent) {
    if (isFileDrag(e)) {
      e.preventDefault();
    }
  }

  function onWindowPointerDownExport(e: PointerEvent) {
    if (!exportMenuOpen && !listMenuOpen) return;
    const target = e.target as HTMLElement;
    if (exportMenuOpen && !target.closest('.export-cluster')) exportMenuOpen = false;
    if (listMenuOpen && !target.closest('.list-menu-cluster')) listMenuOpen = false;
  }

  function onWindowDragLeave(_e: DragEvent) {
    if (!isFileDrag(_e)) return;
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) isWindowDragOver = false;
  }

  function resetDragCounter() {
    dragCounter = 0;
    isWindowDragOver = false;
  }

  function onWindowDrop(e: DragEvent) {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      resetDragCounter();
      if (view !== 'editor') {
        const count = e.dataTransfer.files.length;
        showToast(
          `Open or create a list first to add ${count} image${count === 1 ? '' : 's'}.`,
          'error'
        );
        return;
      }
      const files = e.dataTransfer.files;
      pendingResults = new Array(files.length);
      nextResultCursor = 0;
      void uploadFiles(files, handleResult);
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

  async function handleExport(format: 'png' | 'jpeg' = 'png') {
    if (isExporting) return;
    if (listStore.tiers.length === 0) return;
    exportMenuOpen = false;
    isExporting = true;
    try {
      const blob = await exportListToBlob(
        {
          title: listStore.currentTitle,
          tiers: listStore.tiers,
          items: listStore.items
        },
        format
      );
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `${sanitizeFilename(listStore.currentTitle)}.${ext}`;
      downloadBlob(blob, filename);
      const sizeKb = Math.round(blob.size / 1024);
      showToast(`Exported ${filename} (${sizeKb} KB)`);
    } catch (e) {
      showToast(`Export failed: ${(e as Error).message}`, 'error');
    } finally {
      isExporting = false;
    }
  }

  async function handleCopyExport() {
    if (isExporting) return;
    if (listStore.tiers.length === 0) return;
    exportMenuOpen = false;
    isExporting = true;
    try {
      const blob = await exportListToBlob({
        title: listStore.currentTitle,
        tiers: listStore.tiers,
        items: listStore.items
      });
      await copyBlobToClipboard(blob);
      showToast('Image copied to clipboard');
    } catch (e) {
      showToast(`Copy failed: ${(e as Error).message}`, 'error');
    } finally {
      isExporting = false;
    }
  }

  function toggleExportMenu() {
    exportMenuOpen = !exportMenuOpen;
  }

  function closeExportMenu() {
    exportMenuOpen = false;
    exportButtonEl?.focus();
  }

  $effect(() => {
    if (exportMenuOpen && exportMenuEl) {
      queueMicrotask(() => {
        const first = exportMenuEl!.querySelector<HTMLElement>('.menu-item');
        first?.focus();
      });
    }
  });

  function onExportMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeExportMenu();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = Array.from(exportMenuEl?.querySelectorAll<HTMLElement>('.menu-item') ?? []);
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

  function toggleListMenu() {
    listMenuOpen = !listMenuOpen;
  }

  function closeListMenu() {
    listMenuOpen = false;
    listMenuButtonEl?.focus();
  }

  $effect(() => {
    if (listMenuOpen && listMenuEl) {
      queueMicrotask(() => {
        const first = listMenuEl!.querySelector<HTMLElement>('.menu-item');
        first?.focus();
      });
    }
  });

  function onListMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeListMenu();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = Array.from(listMenuEl?.querySelectorAll<HTMLElement>('.menu-item') ?? []);
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

  // Centralized keyboard handler for Escape-to-close on any open menu —
  // keeps the handlers above as fallback for menu-embedded arrow keys.
  function onGlobalKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (exportMenuOpen) { closeExportMenu(); e.preventDefault(); return; }
    if (listMenuOpen) { closeListMenu(); e.preventDefault(); return; }
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
      showToast('Add some tiers before sharing.', 'error');
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
      showToast(`Share failed: ${(e as Error).message}`, 'error');
    } finally {
      isSharing = false;
    }
  }

  function closeShareLinkModal() {
    shareLinkUrl = null;
  }

  async function initShareImport() {
    if (decodingShare || shareImportSnapshot) return;
    const encoded = readShareFromHash();
    if (!encoded) return;
    decodingShare = true;
    try {
      const snap = await decodeShare(encoded);
      shareImportSnapshot = snap;
    } catch (e) {
      showToast(`Bad share link: ${(e as Error).message}`, 'error');
      clearShareHash();
    } finally {
      decodingShare = false;
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
      showToast(`Import failed: ${(e as Error).message}`, 'error');
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

  // Flush any pending debounced save before the page goes away.
  // pagehide fires on both real unload and bfcache restoration; Dexie
  // writes initiated here still complete even after the page closes.
  function onPageHide() {
    void listStore.flushPendingSave();
  }

  // Belt-and-braces: if the tab is hidden and the user just made a
  // change, persist immediately rather than waiting on the debounce.
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      void listStore.flushPendingSave();
    }
  }

  const totalItems = $derived(listStore.items.length);
  const rankedItems = $derived(listStore.items.filter((i) => i.tierId !== null).length);
</script>

<svelte:window
  onkeydown={(e) => { onGlobalKeydown(e); onKeydown(e); }}
  onhashchange={onHashChange}
  onpagehide={onPageHide}
  onvisibilitychange={onVisibilityChange}
  onpointerdown={onWindowPointerDownExport}
  ondragenter={onWindowDragEnter}
  ondragover={onWindowDragOver}
  ondragleave={onWindowDragLeave}
  ondrop={onWindowDrop}
/>
<svelte:document onclick={(e) => popoverManager.closeOutside(e.target as Node)} />

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
    <button class="btn-secondary" onclick={openTemplatesModal}><Palette size={16} aria-hidden="true" /> Templates</button>
    <button class="btn-secondary" onclick={handleShare} disabled={isSharing}>
      <Share2 size={16} aria-hidden="true" /> {isSharing ? 'Sharing…' : 'Share'}
    </button>
    <div class="list-menu-cluster">
      <button
        bind:this={listMenuButtonEl}
        class="btn-icon"
        onclick={toggleListMenu}
        aria-label="List options"
        title="List options"
        aria-expanded={listMenuOpen}
        aria-haspopup="menu"
      ><Ellipsis size={18} aria-hidden="true" /></button>
      {#if listMenuOpen}
        <div
          bind:this={listMenuEl}
          class="list-menu"
          role="menu"
          aria-label="List options"
          tabindex="-1"
          onkeydown={onListMenuKeydown}
          transition:fade={{ duration: 100 }}
        >
          <button class="menu-item" onclick={handleRenameList}><Pencil size={15} aria-hidden="true" /> Rename list</button>
          <button class="menu-item" onclick={duplicateThisList}><Copy size={15} aria-hidden="true" /> Duplicate list</button>
          <div class="menu-divider" aria-hidden="true"></div>
          <button class="menu-item destructive" onclick={requestDeleteList}><Trash2 size={15} aria-hidden="true" /> Delete list</button>
        </div>
      {/if}
    </div>
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
    <div class="export-cluster">
      <button
        bind:this={exportButtonEl}
        class="btn-primary"
        onclick={toggleExportMenu}
        disabled={isExporting}
        aria-expanded={exportMenuOpen}
        aria-haspopup="menu"
      >
        {#if isExporting}Exporting…{:else}<Download size={16} aria-hidden="true" /> Export <ChevronDown size={14} aria-hidden="true" />{/if}
      </button>
      {#if exportMenuOpen}
        <div
          bind:this={exportMenuEl}
          class="export-menu"
          role="menu"
          aria-label="Export options"
          tabindex="-1"
          onkeydown={onExportMenuKeydown}
          transition:fade={{ duration: 100 }}
        >
          <button class="menu-item" onclick={() => handleExport('png')}><Download size={15} aria-hidden="true" /> Download PNG</button>
          <button class="menu-item" onclick={() => handleExport('jpeg')}><Download size={15} aria-hidden="true" /> Download JPEG</button>
          <div class="menu-divider" aria-hidden="true"></div>
          <button class="menu-item" onclick={handleCopyExport}><Copy size={15} aria-hidden="true" /> Copy to clipboard</button>
        </div>
      {/if}
    </div>
  {/if}
</header>

<main class="canvas">
  {#if view === 'dashboard'}
    <Dashboard
      onopeneditor={() => (view = 'editor')}
      onopenTemplates={openTemplatesModal}
      onerror={(msg) => showToast(msg, 'error')}
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
  <ItemTray items={listStore.trayItems()} onerror={(msg) => showToast(msg, 'error')} />
{/if}

<!-- Screen-reader live region for non-toast announcements (rename, undo, etc.) -->
<div class="sr-only" aria-live="polite" aria-atomic="true">{announcer.msg}</div>

{#if isWindowDragOver && view === 'editor'}
  <div class="drop-overlay">
    <div class="drop-overlay-text"><ImageDown size={20} aria-hidden="true" /> Drop images anywhere to upload</div>
  </div>
{/if}

{#if toasts.length > 0}
  <div class="toast-stack" aria-live="polite">
    {#each toasts as toast (toast.id)}
      <div
        class="toast"
        class:info={toast.kind === 'info'}
        role={toast.kind === 'error' ? 'alert' : 'status'}
      >
        <span class="toast-icon">
          {#if toast.kind === 'error'}
            <TriangleAlert size={18} aria-hidden="true" />
          {:else}
            <Check size={18} aria-hidden="true" />
          {/if}
        </span>
        <span class="toast-text">{toast.message}</span>
        <button
          type="button"
          class="toast-dismiss"
          onclick={() => dismissToast(toast.id)}
          aria-label="Dismiss notification"
        ><X size={14} aria-hidden="true" /></button>
      </div>
    {/each}
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

<RenameListModal
  open={renameModalOpen}
  initialTitle={listStore.currentTitle}
  onclose={() => (renameModalOpen = false)}
  onconfirm={acceptRenameList}
/>

<ConfirmDialog
  open={confirmListDeleteOpen}
  title="Delete this list?"
  message={`Delete "${listStore.currentTitle}"? This permanently removes the list and any images in it.`}
  confirmLabel="Delete"
  cancelLabel="Keep list"
  destructive
  onconfirm={confirmDeleteList}
  oncancel={() => (confirmListDeleteOpen = false)}
/>

<ShareLinkModal
  open={shareLinkUrl !== null}
  url={shareLinkUrl ?? ''}
  sizeKb={shareLinkSizeKb}
  onclose={closeShareLinkModal}
/>

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
    box-shadow: 0 1px 3px var(--ink-04);
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

  .toast-stack {
    position: fixed;
    bottom: 220px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: center;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--surface-toast);
    color: var(--ink-on-toast);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-2);
    font-size: var(--text-body-sm);
    max-width: 360px;
    min-width: 240px;
    animation: toastIn var(--duration-normal) var(--ease-spring);
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .toast.info {
    background: var(--color-secondary);
  }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
  }

  .toast-text {
    flex: 1;
    min-width: 0;
    line-height: 1.35;
  }

  .toast-dismiss {
    flex-shrink: 0;
    width: var(--space-5);
    height: var(--space-5);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-xs);
    color: var(--ink-on-toast-soft);
    background: transparent;
    transition: background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .toast-dismiss:hover {
    background: color-mix(in srgb, var(--ink-on-toast) 15%, transparent);
    color: var(--ink-on-toast);
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
    box-shadow: 0 1px 2px var(--ink-04);
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

    .toast-stack {
      bottom: 180px;
    }

    .toast {
      max-width: calc(100vw - 32px);
      min-width: 0;
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

    .toast-stack {
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

  .export-cluster {
    position: relative;
    display: inline-flex;
  }

  .list-menu-cluster {
    position: relative;
    display: inline-flex;
  }

  .list-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
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

  .export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
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

  .menu-divider {
    height: 1px;
    background: var(--color-neutral-200);
    margin: var(--space-1) 0;
  }
</style>
