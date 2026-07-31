<script lang="ts">
  import { dashboardStore, formatRelativeTime } from '../lib/dashboard.svelte';
  import { listStore } from '../lib/list.svelte';

  let { onopeneditor }: { onopeneditor: () => void } = $props();

  let creating = $state(false);

  $effect(() => {
    if (!dashboardStore.loaded) {
      void dashboardStore.load();
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
    await listStore.loadList(id);
    onopeneditor();
  }

  async function handleDelete(id: string, title: string, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await dashboardStore.deleteList(id);
  }
</script>

<div class="dashboard">
  <section class="hero">
    <div class="hero-brand">
      <span class="hero-logo">🐵</span>
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
            <button
              type="button"
              class="draft-open"
              onclick={() => handleOpen(list.id)}
            >
              <div class="draft-title">{list.title}</div>
              <div class="draft-meta">
                <span class="draft-count">{list.itemCount} item{list.itemCount === 1 ? '' : 's'}</span>
                <span class="draft-time">{formatRelativeTime(list.updatedAt)}</span>
              </div>
            </button>
            <button
              type="button"
              class="delete-btn"
              aria-label={`Delete ${list.title}`}
              onclick={(e) => handleDelete(list.id, list.title, e)}
            >×</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2 class="section-title">Templates</h2>
    <div class="empty-card">
      <p class="empty-text">Coming soon.</p>
      <p class="empty-sub">Curated starter lists ship in a follow-up.</p>
    </div>
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
    box-shadow: 4px 4px 0 #241E17;
  }

  .new-btn:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 1px 1px 0 #241E17;
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
    min-height: 92px;
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

  .draft-open {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    height: 100%;
    padding: var(--space-4);
    padding-right: var(--space-8);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
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

  .delete-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard),
                background-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }

  .draft-card:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: var(--color-error-subtle);
    color: var(--color-error-fill);
  }
</style>
