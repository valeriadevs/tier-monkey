<script lang="ts">
  import Modal from './Modal.svelte';

  let {
    open,
    initialTitle,
    onclose,
    onconfirm
  }: {
    open: boolean;
    initialTitle: string;
    onclose: () => void;
    onconfirm: (next: string) => void;
  } = $props();

  let value = $state('');

  // Re-seed the field every time the modal opens so the input reflects the
  // current title rather than a stale value from a prior open.
  $effect(() => {
    if (open) value = initialTitle;
  });

  const trimmed = $derived(value.trim());

  function submit(e: Event) {
    e.preventDefault();
    if (trimmed) onconfirm(trimmed);
  }
</script>

<Modal {open} title="Rename list" onclose={onclose} size="sm">
  <form onsubmit={submit}>
    <label class="rename-label" for="rename-input">List name</label>
    <input
      id="rename-input"
      type="text"
      class="rename-input focus-ring"
      bind:value
      maxlength="80"
      spellcheck="false"
      autocomplete="off"
    />
    <p class="modal-intro">
      Up to 80 characters. Shown in the dashboard and on the share preview.
    </p>
  </form>

  {#snippet actions()}
    <button type="button" class="btn-secondary" onclick={onclose}>Cancel</button>
    <button
      type="button"
      class="btn-primary"
      disabled={trimmed === '' || trimmed === initialTitle}
      onclick={() => onconfirm(trimmed)}
    >Rename</button>
  {/snippet}
</Modal>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
  }

  .rename-label {
    font-size: var(--text-caption);
    font-weight: 600;
    color: var(--on-surface-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .rename-input {
    width: 100%;
    background: var(--surface-sunken);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-body);
    color: var(--on-surface-primary);
    outline: none;
    transition: border-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }

  .rename-input:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }
</style>
