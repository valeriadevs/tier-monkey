<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  // Selector for elements eligible to receive keyboard focus inside the panel.
  const FOCUSABLE_SELECTOR =
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

  let {
    open,
    title,
    onclose,
    children,
    actions,
    size = 'md'
  }: {
    open: boolean;
    title: string;
    onclose: () => void;
    children?: Snippet;
    actions?: Snippet;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  let panelEl: HTMLDivElement | undefined = $state();
  let triggerEl: HTMLElement | null = null;
  let focusables: HTMLElement[] = $state([]);

  // On open: remember what had focus (so we can restore it on close) and
  // move focus into the modal. On close: hand focus back to the trigger.
  // Keep the focusable list cached and refreshed via MutationObserver so
  // the per-Tab handler doesn't re-query the DOM on every keypress.
  $effect(() => {
    if (open && panelEl) {
      const active = document.activeElement;
      triggerEl = active instanceof HTMLElement ? active : null;

      const refresh = () => {
        focusables = Array.from(panelEl!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      };
      refresh();
      const first = focusables[0];
      queueMicrotask(() => first?.focus());

      const observer = new MutationObserver(refresh);
      observer.observe(panelEl, { childList: true, subtree: true });
      return () => observer.disconnect();
    } else if (!open && triggerEl) {
      const el = triggerEl;
      triggerEl = null;
      focusables = [];
      queueMicrotask(() => el.focus());
    }
  });

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      onclose();
      return;
    }
    if (e.key !== 'Tab') return;
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    class="modal-backdrop"
    onclick={onBackdropClick}
    role="presentation"
  >
    <div
      bind:this={panelEl}
      class="modal-panel"
      class:sm={size === 'sm'}
      class:md={size === 'md'}
      class:lg={size === 'lg'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="modal-header">
        <h2 class="modal-title">{title}</h2>
        <button
          type="button"
          class="modal-close"
          onclick={onclose}
          aria-label="Close"
          title="Close"
        ><X size={18} aria-hidden="true" /></button>
      </div>
      <div class="modal-body">
        {#if children}{@render children()}{/if}
      </div>
      {#if actions}
        <div class="modal-actions">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--surface-overlay);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fadeIn var(--duration-fast) var(--ease-standard);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-panel {
    background: var(--surface-panel);
    border-radius: var(--radius-lg);
    box-shadow: var(--elevation-3);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2 * var(--space-4));
    width: 100%;
    animation: popIn var(--duration-normal) var(--ease-spring);
  }

  .modal-panel.sm {
    max-width: 440px;
  }
  .modal-panel.md {
    max-width: 640px;
  }
  .modal-panel.lg {
    max-width: 880px;
  }

  @keyframes popIn {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1.5px solid var(--border-default);
  }

  .modal-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 20px;
    letter-spacing: -0.01em;
    color: var(--on-surface-primary);
    margin: 0;
  }

  .modal-close {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-secondary);
    font-size: 22px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .modal-close:hover {
    background: var(--color-neutral-100);
    color: var(--on-surface-primary);
  }

  .modal-body {
    padding: var(--space-5);
    overflow-y: auto;
    flex: 1;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    padding: var(--space-3) var(--space-5);
  }

  @media (max-width: 640px) {
    .modal-backdrop {
      padding: 0;
      align-items: flex-end;
    }
    .modal-panel {
      max-height: 90vh;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
    .modal-panel.sm,
    .modal-panel.md,
    .modal-panel.lg {
      max-width: 100%;
    }
  }
</style>
