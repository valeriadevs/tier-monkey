<script lang="ts">
  import { Check } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import { announcer } from '../lib/announcer.svelte';

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
      announcer.say('Link copied to clipboard');
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (e) {
      const msg = `Clipboard blocked: ${(e as Error).message}`;
      copyError = msg;
      announcer.say(msg);
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
      {#if copied}<Check size={14} aria-hidden="true" /> Copied{:else}Copy{/if}
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
  .url-row {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-caption);
    color: var(--on-surface-secondary);
  }

  .size-pill {
    font-family: var(--font-mono);
    background: var(--surface-sunken);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
  }

  .warn {
    color: var(--color-warning-fill);
  }
</style>
