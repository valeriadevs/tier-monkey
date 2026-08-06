<script lang="ts">
  import Modal from './Modal.svelte';
  import type { ShareSnapshot } from '../lib/share';

  let {
    open,
    snapshot,
    onaccept,
    oncancel,
    importing
  }: {
    open: boolean;
    snapshot: ShareSnapshot | null;
    onaccept: () => void;
    oncancel: () => void;
    importing: boolean;
  } = $props();

  const tierCount = $derived(snapshot?.tiers.length ?? 0);
  const itemCount = $derived(snapshot?.items.length ?? 0);
  const rankedCount = $derived(snapshot?.items.filter((i) => i.tierIdx !== null).length ?? 0);
</script>

<Modal
  {open}
  title="Import shared list"
  onclose={oncancel}
  size="sm"
>
  <p class="modal-intro">
    Someone shared a tier list with you. Importing creates a new draft in your
    dashboard. Their original is not affected.
  </p>

  {#if snapshot}
    <div class="preview">
      <div class="preview-title">{snapshot.title}</div>
      <div class="preview-meta">
        <span>{tierCount} tier{tierCount === 1 ? '' : 's'}</span>
        <span class="dot">·</span>
        <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
        <span class="dot">·</span>
        <span>{rankedCount} ranked</span>
      </div>
      <div class="preview-tiers">
        {#each snapshot.tiers as tier, i (i)}
          <span class="tier-pill" style:background={tier.color}>{tier.label}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#snippet actions()}
    <button
      type="button"
      class="btn-secondary"
      onclick={oncancel}
      disabled={importing}
    >Cancel</button>
    <button
      type="button"
      class="btn-primary"
      onclick={onaccept}
      disabled={importing || !snapshot}
    >
      {importing ? 'Importing…' : 'Import'}
    </button>
  {/snippet}
</Modal>

<style>
  .preview {
    background: var(--surface-sunken);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .preview-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--on-surface-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-meta {
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--on-surface-secondary);
  }

  .dot {
    color: var(--color-neutral-400);
  }

  .preview-tiers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: var(--space-1);
  }

  :global(.btn-primary) {
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding: 0 var(--space-4);
    height: 36px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 14px;
  }

  :global(.btn-primary:hover:not(:disabled)) {
    background: var(--color-primary-hover);
  }

  :global(.btn-primary:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }

  :global(.btn-secondary) {
    background: var(--surface-panel);
    color: var(--on-surface-primary);
    border: 1.5px solid var(--color-neutral-300);
    padding: 0 var(--space-3);
    height: 36px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    font-size: 14px;
  }

  :global(.btn-secondary:hover:not(:disabled)) {
    border-color: var(--color-neutral-500);
    background: var(--color-neutral-50);
  }

  :global(.btn-secondary:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
