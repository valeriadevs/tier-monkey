<script lang="ts">
  import Modal from './Modal.svelte';

  let {
    open,
    url,
    sizeKb,
    onclose
  }: {
    open: boolean;
    url: string;
    sizeKb: number;
    onclose: () => void;
  } = $props();

  let copied = $state(false);
  let copyError = $state<string | null>(null);

  async function copy() {
    copied = false;
    copyError = null;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (e) {
      copyError = `Clipboard blocked: ${(e as Error).message}`;
    }
  }

  function selectInput(e: MouseEvent) {
    const input = e.currentTarget as HTMLInputElement;
    input.select();
  }
</script>

<Modal {open} title="Share link" onclose={onclose} size="sm">
  <p class="modal-intro">
    Send this link to share your list. The recipient will see a preview and can
    import it as a new draft in their dashboard.
  </p>

  <div class="url-row">
    <input
      type="text"
      readonly
      value={url}
      class="url-input"
      onclick={selectInput}
      spellcheck="false"
    />
    <button
      type="button"
      class="btn-primary"
      onclick={copy}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  </div>

  <div class="meta">
    <span class="size-pill">{sizeKb} KB</span>
    {#if sizeKb > 64}
      <span class="warn">Large link — some browsers may truncate.</span>
    {/if}
    {#if copyError}
      <span class="warn">{copyError}</span>
    {/if}
  </div>

  {#snippet actions()}
    <button type="button" class="btn-secondary" onclick={onclose}>Done</button>
  {/snippet}
</Modal>

<style>
  .modal-intro {
    color: var(--on-surface-secondary);
    font-size: 14px;
    margin: 0 0 var(--space-3);
    line-height: 1.4;
  }

  .url-row {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .url-input {
    flex: 1;
    min-width: 0;
    background: var(--surface-sunken);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--on-surface-primary);
    outline: none;
  }

  .url-input:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }

  :global(.btn-primary) {
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding: 0 var(--space-4);
    height: 36px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 14px;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  :global(.btn-primary:hover) {
    background: var(--color-primary-hover);
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

  :global(.btn-secondary:hover) {
    border-color: var(--color-neutral-500);
    background: var(--color-neutral-50);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    font-size: 12px;
    color: var(--on-surface-secondary);
  }

  .size-pill {
    font-family: var(--font-mono);
    background: var(--surface-sunken);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .warn {
    color: var(--color-warning-fill);
  }
</style>
