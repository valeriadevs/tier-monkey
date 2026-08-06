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
</style>