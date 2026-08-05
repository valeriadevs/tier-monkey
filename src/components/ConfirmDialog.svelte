<script lang="ts">
  import Modal from './Modal.svelte';

  let {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onconfirm,
    oncancel
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  function handleConfirm() {
    onconfirm();
  }
</script>

<Modal {open} {title} onclose={oncancel} size="sm">
  <p class="confirm-message">{message}</p>

  {#snippet actions()}
    <button type="button" class="btn-secondary" onclick={oncancel}>{cancelLabel}</button>
    <button
      type="button"
      class="btn-primary confirm-btn"
      class:destructive
      onclick={handleConfirm}
    >{confirmLabel}</button>
  {/snippet}
</Modal>

<style>
  .confirm-message {
    margin: 0;
    color: var(--on-surface-primary);
    font-size: 15px;
    line-height: var(--leading-snug, 1.45);
  }

  /* Self-contained button styles so this dialog works without depending on
     the toolbar's per-component .btn-primary definitions. */
  :global(.modal-actions .btn-primary) {
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding: 0 var(--space-4);
    height: 36px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  :global(.modal-actions .btn-primary:hover:not(:disabled)) {
    background: var(--color-primary-hover);
  }

  :global(.modal-actions .btn-primary.destructive) {
    background: var(--color-error-fill, #D92D20);
    color: white;
  }

  :global(.modal-actions .btn-primary.destructive:hover:not(:disabled)) {
    background: var(--color-error-hover, #B42318);
  }

  :global(.modal-actions .btn-secondary) {
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

  :global(.modal-actions .btn-secondary:hover:not(:disabled)) {
    border-color: var(--color-neutral-500);
    background: var(--color-neutral-50);
  }
</style>