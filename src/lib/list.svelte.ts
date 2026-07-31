import type { Item, Tier } from './types';
import { DEFAULT_TIERS, TIER_PALETTE } from './types';

function createListStore() {
  let tiers = $state<Tier[]>(structuredClone(DEFAULT_TIERS));
  let items = $state<Item[]>([]);
  let paletteIndex = $state(0);

  function itemsInTier(tierId: string): Item[] {
    return items.filter((i) => i.tierId === tierId);
  }

  function trayItems(): Item[] {
    return items.filter((i) => i.tierId === null);
  }

  function setItemsTier(tierId: string | null, newZoneItems: Item[]) {
    for (const incoming of newZoneItems) {
      const existing = items.find((i) => i.id === incoming.id);
      if (existing) {
        existing.tierId = tierId;
      }
    }
  }

  function addItem(item: Item) {
    items.push(item);
  }

  function removeItem(id: string) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [removed] = items.splice(idx, 1);
    URL.revokeObjectURL(removed.url);
    URL.revokeObjectURL(removed.thumbUrl);
  }

  function clearAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.url);
      URL.revokeObjectURL(item.thumbUrl);
    }
    items.splice(0, items.length);
  }

  function addTier(atIndex?: number): Tier {
    const color = TIER_PALETTE[paletteIndex % TIER_PALETTE.length];
    paletteIndex++;
    const tier: Tier = {
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      label: 'New Tier',
      color
    };
    if (atIndex === undefined || atIndex >= tiers.length) {
      tiers.push(tier);
    } else {
      tiers.splice(atIndex, 0, tier);
    }
    return tier;
  }

  function deleteTier(tierId: string) {
    const idx = tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) return;
    tiers.splice(idx, 1);
    for (const item of items) {
      if (item.tierId === tierId) item.tierId = null;
    }
  }

  function renameTier(tierId: string, label: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier) tier.label = label;
  }

  function setTierColor(tierId: string, color: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier) tier.color = color;
  }

  function tierItemCount(tierId: string): number {
    return items.reduce((n, i) => (i.tierId === tierId ? n + 1 : n), 0);
  }

  return {
    get tiers() {
      return tiers;
    },
    get items() {
      return items;
    },
    itemsInTier,
    trayItems,
    setItemsTier,
    addItem,
    removeItem,
    clearAll,
    addTier,
    deleteTier,
    renameTier,
    setTierColor,
    tierItemCount
  };
}

export type ListStore = ReturnType<typeof createListStore>;

export const listStore = createListStore();
