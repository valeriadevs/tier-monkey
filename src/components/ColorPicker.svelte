<script lang="ts">
  import { TIER_PALETTE } from '../lib/types';

  let {
    value,
    onchange,
    onclose
  }: {
    value: string;
    onchange: (color: string) => void;
    onclose: () => void;
  } = $props();

  let hexInput = $state('');

  $effect(() => {
    hexInput = value;
  });

  function pickSwatch(color: string) {
    onchange(color);
    onclose();
  }

  function commitHex() {
    const normalized = hexInput.trim().toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      onchange(normalized);
      onclose();
    } else {
      hexInput = value;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    if (e.key === 'Enter') commitHex();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="picker" role="dialog" aria-label="Choose tier color">
  <div class="picker-title">Tier color</div>

  <div class="swatch-grid">
    {#each TIER_PALETTE as color (color)}
      <button
        class="swatch"
        class:selected={value.toUpperCase() === color.toUpperCase()}
        style:background={color}
        aria-label={`Set tier color to ${color}`}
        onclick={() => pickSwatch(color)}
      ></button>
    {/each}
  </div>

  <div class="hex-row">
    <label class="hex-label" for="hex-input">Custom</label>
    <input
      id="hex-input"
      class="hex-input"
      type="text"
      bind:value={hexInput}
      onblur={commitHex}
      onkeydown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      placeholder="#RRGGBB"
      maxlength="7"
      spellcheck="false"
    />
  </div>
</div>

<style>
  .picker {
    width: 232px;
    padding: var(--space-3);
    background: var(--surface-panel);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-2);
    border: 1.5px solid var(--color-neutral-200);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .picker-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--on-surface-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-1);
  }

  .swatch {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(36, 30, 23, 0.15);
    cursor: pointer;
    padding: 0;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  .swatch:hover {
    transform: scale(1.1);
  }

  .swatch.selected {
    box-shadow: 0 0 0 2px var(--color-on-primary);
  }

  .hex-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .hex-label {
    font-size: 13px;
    color: var(--on-surface-secondary);
  }

  .hex-input {
    flex: 1;
    height: 32px;
    padding: 0 var(--space-2);
    border: 1.5px solid var(--color-neutral-300);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 13px;
    background: var(--surface-panel);
    color: var(--on-surface-primary);
  }

  .hex-input:focus {
    outline: none;
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-subtle);
  }
</style>
