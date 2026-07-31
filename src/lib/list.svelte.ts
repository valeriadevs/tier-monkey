import type { Item, ProcessedImage, Tier } from './types';
import { CURRENT_SCHEMA_VERSION, DEFAULT_TIERS, TIER_PALETTE } from './types';
import { db, type ItemRecord, type ListRecord, deleteListCascade } from './db';
import {
  cacheAssetUrls,
  clearAllCachedUrls,
  deleteAsset,
  getAssetUrls,
  resolveAssetUrls,
  saveAsset
} from './assets';

const PERSIST_DEBOUNCE_MS = 300;

function createListStore() {
  let tiers = $state<Tier[]>([]);
  let items = $state<Item[]>([]);
  let paletteIndex = $state(0);
  let currentListId = $state<string | null>(null);
  let currentTitle = $state<string>('');
  let isLoaded = $state(false);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingZones = new Map<string | null, Item[]>();
  let zonesDirty = false;

  function itemsInTier(tierId: string): Item[] {
    return items.filter((i) => i.tierId === tierId);
  }

  function trayItems(): Item[] {
    return items.filter((i) => i.tierId === null);
  }

  function tierItemCount(tierId: string): number {
    return items.reduce((n, i) => (i.tierId === tierId ? n + 1 : n), 0);
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
    schedulePersist();
    return tier;
  }

  function deleteTier(tierId: string) {
    const idx = tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) return;
    tiers.splice(idx, 1);
    for (const item of items) {
      if (item.tierId === tierId) item.tierId = null;
    }
    schedulePersist();
  }

  function renameTier(tierId: string, label: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier && tier.label !== label) {
      tier.label = label;
      schedulePersist();
    }
  }

  function setTierColor(tierId: string, color: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier && tier.color !== color) {
      tier.color = color;
      schedulePersist();
    }
  }

  function setItemsTier(tierId: string | null, newZoneItems: Item[]) {
    pendingZones.set(tierId, newZoneItems);
    if (zonesDirty) return;
    zonesDirty = true;
    queueMicrotask(() => {
      zonesDirty = false;
      applyPendingZones();
      pendingZones.clear();
      schedulePersist();
    });
  }

  function applyPendingZones() {
    for (const [tid, nzi] of pendingZones) {
      for (const incoming of nzi) {
        const existing = items.find((i) => i.id === incoming.id);
        if (existing) existing.tierId = tid;
      }
    }

    const tierIds = new Set<string | null>();
    for (const item of items) tierIds.add(item.tierId);
    for (const tid of pendingZones.keys()) tierIds.add(tid);

    const reordered: Item[] = [];
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const tid of tierIds) {
      const nzi = pendingZones.get(tid);
      if (nzi) {
        for (const incoming of nzi) {
          const existing = byId.get(incoming.id);
          if (existing) reordered.push(existing);
        }
      } else {
        for (const item of items) {
          if (item.tierId === tid) reordered.push(item);
        }
      }
    }

    if (reordered.length > 0) {
      items.splice(0, items.length, ...reordered);
    }
  }

  async function addItemFromUpload(image: ProcessedImage): Promise<Item> {
    const asset = await saveAsset(image.masterBlob, image.thumbBlob);
    const urls = await resolveAssetUrls(asset.id);
    cacheAssetUrls(asset.id, urls);
    const item: Item = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      url: urls.url,
      thumbUrl: urls.thumbUrl,
      width: image.width,
      height: image.height,
      alt: image.alt,
      tierId: null
    };
    items.push(item);
    schedulePersist();
    return item;
  }

  async function removeItem(id: string) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [removed] = items.splice(idx, 1);
    await deleteAsset(removed.assetId);
    schedulePersist();
  }

  async function clearAll() {
    const assetIds = items.map((i) => i.assetId);
    items.splice(0, items.length);
    for (const aid of assetIds) {
      await deleteAsset(aid);
    }
    schedulePersist();
  }

  function renameCurrentList(title: string) {
    const trimmed = title.trim().slice(0, 80);
    if (trimmed && trimmed !== currentTitle) {
      currentTitle = trimmed;
      schedulePersist();
    }
  }

  function unload() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    pendingZones.clear();
    zonesDirty = false;
    tiers.splice(0, tiers.length);
    items.splice(0, items.length);
    paletteIndex = 0;
    currentListId = null;
    currentTitle = '';
    isLoaded = false;
    clearAllCachedUrls();
  }

  async function createNewList(title?: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const record: ListRecord = {
      id,
      title: title ?? 'Untitled list',
      createdAt: now,
      updatedAt: now,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tiers: structuredClone(DEFAULT_TIERS),
      paletteIndex: 0
    };
    await db.lists.put(record);

    tiers.splice(0, tiers.length, ...structuredClone(DEFAULT_TIERS));
    items.splice(0, items.length);
    paletteIndex = 0;
    currentListId = id;
    currentTitle = record.title;
    isLoaded = true;
    return id;
  }

  async function loadList(id: string): Promise<boolean> {
    const record = await db.lists.get(id);
    if (!record) return false;

    tiers.splice(0, tiers.length);
    items.splice(0, items.length);
    clearAllCachedUrls();

    tiers.push(...structuredClone(record.tiers));
    paletteIndex = record.paletteIndex;

    const itemRecords = await db.items.where('listId').equals(id).toArray();

    const assetIds = [...new Set(itemRecords.map((r) => r.assetId))];
    await Promise.all(assetIds.map((aid) => resolveAssetUrls(aid)));

    const hydrated: Item[] = itemRecords.map((r) => {
      const urls = getAssetUrls(r.assetId)!;
      return {
        id: r.id,
        assetId: r.assetId,
        url: urls.url,
        thumbUrl: urls.thumbUrl,
        width: r.width,
        height: r.height,
        alt: r.alt,
        tierId: r.tierId
      };
    });

    items.push(...hydrated);

    currentListId = id;
    currentTitle = record.title;
    isLoaded = true;
    return true;
  }

  async function deleteCurrentList(): Promise<void> {
    if (!currentListId) return;
    const id = currentListId;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await deleteListCascade(id);
    unload();
  }

  async function renameList(id: string, title: string): Promise<string | null> {
    const trimmed = title.trim().slice(0, 80);
    if (!trimmed) return null;
    const existing = await db.lists.get(id);
    if (!existing || existing.title === trimmed) return null;
    const updated: ListRecord = {
      ...existing,
      title: trimmed,
      updatedAt: Date.now()
    };
    await db.lists.put(updated);
    if (id === currentListId) {
      currentTitle = trimmed;
      schedulePersist();
    }
    return trimmed;
  }

  function schedulePersist() {
    if (!currentListId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persistCurrentList();
    }, PERSIST_DEBOUNCE_MS);
  }

  async function persistCurrentList(): Promise<void> {
    if (!currentListId) return;
    const id = currentListId;
    const now = Date.now();

    const listRecord: ListRecord = {
      id,
      title: currentTitle,
      createdAt: now,
      updatedAt: now,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tiers: structuredClone(tiers),
      paletteIndex
    };

    const existing = await db.lists.get(id);
    if (existing) listRecord.createdAt = existing.createdAt;

    const groups = new Map<string | null, Item[]>();
    for (const item of items) {
      const arr = groups.get(item.tierId) ?? [];
      arr.push(item);
      groups.set(item.tierId, arr);
    }
    const itemRecords: ItemRecord[] = [];
    for (const [tierId, arr] of groups) {
      arr.forEach((item, i) => {
        itemRecords.push({
          id: item.id,
          listId: id,
          assetId: item.assetId,
          tierId,
          position: i,
          width: item.width,
          height: item.height,
          alt: item.alt
        });
      });
    }

    await db.transaction('rw', db.lists, db.items, async () => {
      await db.lists.put(listRecord);
      await db.items.where('listId').equals(id).delete();
      if (itemRecords.length > 0) {
        await db.items.bulkPut(itemRecords);
      }
    });
  }

  async function flushPendingSave(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await persistCurrentList();
    }
  }

  return {
    get tiers() {
      return tiers;
    },
    get items() {
      return items;
    },
    get paletteIndex() {
      return paletteIndex;
    },
    get currentListId() {
      return currentListId;
    },
    get currentTitle() {
      return currentTitle;
    },
    get isLoaded() {
      return isLoaded;
    },
    itemsInTier,
    trayItems,
    tierItemCount,
    addTier,
    deleteTier,
    renameTier,
    setTierColor,
    setItemsTier,
    addItemFromUpload,
    removeItem,
    clearAll,
    renameCurrentList,
    unload,
    createNewList,
    loadList,
    deleteCurrentList,
    renameList,
    flushPendingSave
  };
}

export type ListStore = ReturnType<typeof createListStore>;
export const listStore = createListStore();
