<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import { TEMPLATES, type Template } from '../lib/templates';
  import { listStore } from '../lib/list.svelte';

  let {
    open,
    onclose,
    onapplied
  }: {
    open: boolean;
    onclose: () => void;
    onapplied?: () => void;
  } = $props();

  let applying = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function applyTemplate(template: Template) {
    if (applying) return;
    applying = template.id;
    error = null;
    try {
      const id = await listStore.createFromTemplate(template);
      await listStore.loadList(id);
      onapplied?.();
      onclose();
    } catch (e) {
      error = `Could not apply template: ${(e as Error).message}`;
    } finally {
      applying = null;
    }
  }
</script>

<Modal {open} {onclose} title="Templates" size="lg">
  <p class="modal-intro">
    Pick a starting point. We will create a new list with preset tiers and a few sample
    items so you can see how it works. Replace the samples with your own.
  </p>

  {#if error}
    <div class="modal-error">{error}</div>
  {/if}

  <div class="template-grid">
    {#each TEMPLATES as template (template.id)}
      {@const isLoading = applying === template.id}
      <button
        type="button"
        class="template-card"
        class:loading={isLoading}
        disabled={!!applying}
        onclick={() => applyTemplate(template)}
      >
        <div class="template-header">
          <span class="template-emoji">{template.emoji}</span>
          <span class="template-name">{template.name}</span>
        </div>
        <p class="template-desc">{template.description}</p>
        <div class="tier-preview">
          {#each template.tiers as tier (tier.label)}
            <span class="tier-pill" style:background={tier.color}>{tier.label}</span>
          {/each}
        </div>
        {#if isLoading}
          <div class="template-loading">Creating…</div>
        {:else}
          <div class="template-cta">Use template <ArrowRight size={12} aria-hidden="true" /></div>
        {/if}
      </button>
    {/each}
  </div>
</Modal>

<style>
  .modal-intro {
    color: var(--on-surface-secondary);
    font-size: 14px;
    margin: 0 0 var(--space-4);
  }

  .modal-error {
    background: var(--color-error-subtle);
    color: var(--color-error-fill);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 13px;
    margin-bottom: var(--space-3);
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
  }

  .template-card {
    text-align: left;
    background: var(--surface-panel);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    transition: border-color var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .template-card:hover:not(:disabled) {
    border-color: var(--color-secondary);
    transform: translateY(-2px);
    box-shadow: var(--elevation-2);
  }

  .template-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .template-card.loading {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }

  .template-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .template-emoji {
    font-size: 24px;
    line-height: 1;
  }

  .template-name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--on-surface-primary);
  }

  .template-desc {
    font-size: 13px;
    color: var(--on-surface-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .tier-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: var(--space-1);
  }

  .tier-pill {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 11px;
    color: white;
    padding: 3px 8px;
    border-radius: 6px;
    min-width: 28px;
    text-align: center;
  }

  .template-cta {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-secondary);
    margin-top: auto;
    padding-top: var(--space-2);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .template-loading {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-secondary);
    margin-top: auto;
    padding-top: var(--space-2);
  }

  @media (max-width: 640px) {
    .template-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
