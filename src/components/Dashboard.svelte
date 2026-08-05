<script lang="ts">
  import { Pencil, X } from '@lucide/svelte';
  import { dashboardStore, formatRelativeTime } from '../lib/dashboard.svelte';
  import { listStore } from '../lib/list.svelte';
  import { TEMPLATES } from '../lib/templates';

  let {
    onopeneditor,
    onopenTemplates
  }: {
    onopeneditor: () => void;
    onopenTemplates: () => void;
  } = $props();

  let creating = $state(false);
  let editingId = $state<string | null>(null);
  let editValue = $state('');
  let editInputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (!dashboardStore.loaded) {
      void dashboardStore.load();
    }
  });

  $effect(() => {
    if (editingId && editInputEl) {
      editInputEl.focus();
      editInputEl.select();
    }
  });

  async function handleNew() {
    if (creating) return;
    creating = true;
    try {
      await listStore.createNewList();
      onopeneditor();
    } finally {
      creating = false;
    }
  }

  async function handleOpen(id: string) {
    if (editingId) return;
    await listStore.loadList(id);
    onopeneditor();
  }

  async function handleDelete(id: string, title: string, e: Event) {
    e.stopPropagation();
    if (editingId === id) cancelRename();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await dashboardStore.deleteList(id);
  }

  function startRename(id: string, currentTitle: string) {
    editingId = id;
    editValue = currentTitle;
  }

  function cancelRename() {
    editingId = null;
    editValue = '';
  }

  async function commitRename() {
    if (!editingId) return;
    const id = editingId;
    const newTitle = await listStore.renameList(id, editValue);
    if (newTitle) {
      const idx = dashboardStore.lists.findIndex((l) => l.id === id);
      if (idx !== -1) {
        dashboardStore.lists[idx].title = newTitle;
      }
    }
    editingId = null;
    editValue = '';
  }

  function onRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }
</script>

<div class="dashboard">
  <section class="hero">
    <div class="hero-brand">
      <span class="hero-logo" aria-hidden="true">🐵</span>
      <h1 class="hero-title">
        Tier <span class="hero-accent">Monkey</span>
      </h1>
    </div>
    <p class="hero-tagline">A tier list app for memes, snacks, and other important things.</p>
    <button class="new-btn" onclick={handleNew} disabled={creating}>
      {creating ? 'Creating…' : '+ New list'}
    </button>
  </section>

  <section class="section">
    <h2 class="section-title">Your drafts</h2>
    {#if dashboardStore.loading && dashboardStore.lists.length === 0}
      <p class="empty">Loading…</p>
    {:else if dashboardStore.lists.length === 0}
      <div class="empty-card">
        <p class="empty-text">No drafts yet.</p>
        <p class="empty-sub">Click <strong>New list</strong> to start your first tier list.</p>
      </div>
    {:else}
      <ul class="draft-grid">
        {#each dashboardStore.lists as list (list.id)}
          <li class="draft-card">
            <div class="card-body">
              {#if editingId === list.id}
                <input
                  bind:this={editInputEl}
                  bind:value={editValue}
                  class="draft-rename-input"
                  onblur={() => void commitRename()}
                  onkeydown={onRenameKeydown}
                  onclick={(e) => e.stopPropagation()}
                  maxlength="80"
                  spellcheck="false"
                  placeholder="List title"
                />
              {:else}
                <button
                  type="button"
                  class="draft-open"
                  onclick={() => handleOpen(list.id)}
                  disabled={editingId !== null}
                >
                  <div class="draft-title">{list.title}</div>
                </button>
              {/if}
              <div class="draft-meta">
                <span class="draft-count">{list.itemCount} item{list.itemCount === 1 ? '' : 's'}</span>
                <span class="draft-time">{formatRelativeTime(list.updatedAt)}</span>
              </div>
            </div>
            <div class="card-actions">
              {#if editingId !== list.id}
                <button
                  type="button"
                  class="icon-btn rename-btn"
                  aria-label={`Rename ${list.title}`}
                  title="Rename"
                  onclick={() => startRename(list.id, list.title)}
                ><Pencil size={14} aria-hidden="true" /></button>
              {/if}
              <button
                type="button"
                class="icon-btn delete-btn"
                aria-label={`Delete ${list.title}`}
                title="Delete"
                onclick={(e) => handleDelete(list.id, list.title, e)}
              ><X size={16} aria-hidden="true" /></button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2 class="section-title">Templates</h2>
    <div class="template-preview">
      {#each TEMPLATES.slice(0, 3) as template (template.id)}
        <button
          type="button"
          class="template-preview-card"
          onclick={onopenTemplates}
        >
          <span class="template-preview-emoji" aria-hidden="true">{template.emoji}</span>
          <span class="template-preview-name">{template.name}</span>
        </button>
      {/each}
    </div>
    <button
      type="button"
      class="browse-templates-btn"
      onclick={onopenTemplates}
    >Browse all templates →</button>
  </section>
</div>

<style>
  .dashboard {
    max-width: 880px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .hero-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .hero-logo {
    font-size: 56px;
    line-height: 1;
  }

  .hero-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 44px;
    letter-spacing: -0.02em;
    color: var(--on-surface-primary);
    margin: 0;
  }

  .hero-accent {
    color: var(--color-primary-active);
  }

  .hero-tagline {
    font-size: 16px;
    color: var(--on-surface-secondary);
    margin: 0;
  }

  .new-btn {
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding: var(--space-3) var(--space-5);
    height: 48px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 16px;
    box-shadow: var(--shadow-sticker);
    transition: transform var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .new-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sticker-hover);
  }

  .new-btn:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: var(--shadow-sticker-active);
  }

  .new-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 20px;
    color: var(--on-surface-primary);
    margin: 0;
  }

  .empty {
    color: var(--color-neutral-500);
    font-size: 14px;
    margin: 0;
    padding: var(--space-3) 0;
  }

  .empty-card {
    background: var(--surface-panel);
    border: 1.5px dashed var(--color-neutral-300);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    align-items: center;
    text-align: center;
  }

  .empty-text {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--on-surface-primary);
    margin: 0;
  }

  .empty-sub {
    font-size: 13px;
    color: var(--color-neutral-500);
    margin: 0;
  }

  .draft-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
  }

  .draft-card {
    position: relative;
    background: var(--surface-panel);
    border: 1.5px solid var(--color-neutral-200);
    border-radius: var(--radius-md);
    min-height: 110px;
    box-shadow: var(--elevation-1);
    transition: transform var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .draft-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-neutral-300);
    box-shadow: var(--elevation-2);
  }

  .card-body {
    padding: var(--space-4);
    padding-right: var(--space-10);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    height: 100%;
  }

  .draft-open {
    display: block;
    width: 100%;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .draft-open:disabled {
    cursor: default;
  }

  .draft-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--on-surface-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .draft-rename-input {
    width: 100%;
    background: var(--surface-sunken);
    border: 1.5px solid var(--color-secondary);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--on-surface-primary);
    outline: none;
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }

  .draft-meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-neutral-500);
    margin-top: auto;
  }

  .draft-count {
    font-weight: 500;
  }

  .card-actions {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: flex;
    gap: var(--space-1);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .draft-card:hover .card-actions,
  .draft-card:focus-within .card-actions {
    opacity: 1;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 15px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .icon-btn:hover {
    background: var(--color-neutral-100);
    color: var(--on-surface-primary);
  }

  .delete-btn:hover {
    background: var(--color-error-subtle);
    color: var(--color-error-fill);
  }

  .template-preview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .template-preview-card {
    background: var(--surface-panel);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    transition: border-color var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .template-preview-card:hover {
    border-color: var(--color-secondary);
    transform: translateY(-2px);
    box-shadow: var(--elevation-2);
  }

  .template-preview-emoji {
    font-size: 32px;
    line-height: 1;
  }

  .template-preview-name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 14px;
    color: var(--on-surface-primary);
  }

  .browse-templates-btn {
    align-self: flex-start;
    color: var(--color-secondary);
    font-size: 13px;
    font-weight: 600;
    padding: var(--space-2) 0;
    transition: color var(--duration-fast) var(--ease-standard);
  }

  .browse-templates-btn:hover {
    color: var(--color-secondary-hover);
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: var(--space-5) var(--space-3);
      gap: var(--space-5);
    }

    .hero-title {
      font-size: 32px;
    }

    .hero-tagline {
      font-size: 14px;
    }

    .hero-logo {
      font-size: 44px;
    }

    .new-btn {
      height: 44px;
      font-size: 15px;
      padding: 0 var(--space-4);
    }

    .draft-grid {
      grid-template-columns: 1fr;
    }

    .card-actions {
      opacity: 1;
    }

    .template-preview {
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-2);
    }

    .template-preview-card {
      padding: var(--space-3) var(--space-2);
    }

    .template-preview-emoji {
      font-size: 26px;
    }

    .template-preview-name {
      font-size: 12px;
    }
  }

  @media (max-width: 640px) {
    .template-preview {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 400px) {
    .template-preview {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .hero-title {
      font-size: 28px;
    }
    .hero-logo {
      font-size: 36px;
    }
  }
</style>
