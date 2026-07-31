<script lang="ts">
  import type { Item } from '../lib/types';

  let { item, size = 72 }: { item: Item; size?: number } = $props();
</script>

<div
  class="card"
  style:width="{size}px"
  style:height="{size}px"
  title={item.alt}
>
  <img src={item.url} alt={item.alt} draggable="false" />
</div>

<style>
  .card {
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(36, 30, 23, 0.08);
    box-shadow: var(--elevation-1);
    background: var(--surface-panel);
    overflow: hidden;
    flex-shrink: 0;
    cursor: grab;
    transition: box-shadow var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard);
  }

  .card:hover {
    box-shadow: var(--elevation-2);
    transform: scale(1.04);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
</style>
