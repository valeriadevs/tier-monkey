import type { DisplaySize, Item, ProcessedImage, Tier } from './types';
import { CURRENT_SCHEMA_VERSION, DEFAULT_TIERS, TIER_PALETTE } from './types';
import { db, type ItemRecord, type ListRecord, deleteListCascade } from './db';
import {
  cacheAssetUrls,
  clearAllCachedUrls,
  getAssetUrls,
  resolveAssetUrls,
  saveAsset
} from './assets';

const PERSIST_DEBOUNCE_MS = 300;
const HISTORY_LIMIT = 50;

// Asset lifecycle note:
// removeItem() and clearAll() no longer delete from db.assets - they keep
// the blob records around so undo can restore removed items. Assets only
// leave the store when their owning list is deleted (deleteListCascade).
// This trades disk usage for trivial undo/redo of item removals.
// If asset bloat becomes a problem, add a deferred sweep.

type Snapshot = {
  tiers: Tier[];
  items: Item[];
  paletteIndex: number;
  currentTitle: string;
};

function snapshotNow(
  tiers: Tier[],
  items: Item[],
  paletteIndex: number,
  currentTitle: string
): Snapshot {
  return {
    tiers: structuredClone(tiers),
    items: structuredClone(items),
    paletteIndex,
    currentTitle
  };
}

function createListStore() {
  let tiers = $state<Tier[]>([]);
  let items = $state<Item[]>([]);
  let paletteIndex = $state(0);
  let currentListId = $state<string | null>(null);
  let currentTitle = $state<string>('');
  let isLoaded = $state(false);

  let undoStack = $state<Snapshot[]>([]);
  let redoStack = $state<Snapshot[]>([]);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingZones = new Map<string | null, Item[]>();
  let zonesDirty = false;

  function pushHistory() {
    undoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    if (redoStack.length > 0) redoStack.splice(0, redoStack.length);
  }

  function restoreSnapshot(snap: Snapshot) {
    tiers.splice(0, tiers.length, ...structuredClone(snap.tiers));
    items.splice(0, items.length, ...structuredClone(snap.items));
    paletteIndex = snap.paletteIndex;
    currentTitle = snap.currentTitle;
    schedulePersist();
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (redoStack.length > HISTORY_LIMIT) redoStack.shift();
    const snap = undoStack.pop();
    if (snap) restoreSnapshot(snap);
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    const snap = redoStack.pop();
    if (snap) restoreSnapshot(snap);
  }

  function resetHistory() {
    if (undoStack.length > 0) undoStack.splice(0, undoStack.length);
    if (redoStack.length > 0) redoStack.splice(0, redoStack.length);
  }

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
    pushHistory();
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
    pushHistory();
    tiers.splice(idx, 1);
    for (const item of items) {
      if (item.tierId === tierId) item.tierId = null;
    }
    schedulePersist();
  }

  function renameTier(tierId: string, label: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier || tier.label === label) return;
    pushHistory();
    tier.label = label;
    schedulePersist();
  }

  function setTierColor(tierId: string, color: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier || tier.color === color) return;
    pushHistory();
    tier.color = color;
    schedulePersist();
  }

  function setItemsTier(tierId: string | null, newZoneItems: Item[]) {
    pendingZones.set(tierId, newZoneItems);
    if (zonesDirty) return;
    zonesDirty = true;
    queueMicrotask(() => {
      zonesDirty = false;
      pushHistory();
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
    pushHistory();
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
      tierId: null,
      displaySize: 'M'
    };
    items.push(item);
    schedulePersist();
    return item;
  }

  function removeItem(id: string) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    pushHistory();
    items.splice(idx, 1);
    schedulePersist();
  }

  function clearAll() {
    if (items.length === 0) return;
    pushHistory();
    items.splice(0, items.length);
    schedulePersist();
  }

  function setItemDisplaySize(id: string, size: DisplaySize) {
    const item = items.find((i) => i.id === id);
    if (!item || item.displaySize === size) return;
    pushHistory();
    item.displaySize = size;
    schedulePersist();
  }

  function renameCurrentList(title: string) {
    const trimmed = title.trim().slice(0, 80);
    if (!trimmed || trimmed === currentTitle) return;
    pushHistory();
    currentTitle = trimmed;
    schedulePersist();
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
    resetHistory();
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
    resetHistory();
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

    itemRecords.sort((a, b) => {
      const aKey = a.tierId ?? '\uFFFF';
      const bKey = b.tierId ?? '\uFFFF';
      if (aKey !== bKey) return aKey < bKey ? -1 : 1;
      return a.position - b.position;
    });

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
        tierId: r.tierId,
        displaySize: r.displaySize
      };
    });

    items.push(...hydrated);

    currentListId = id;
    currentTitle = record.title;
    isLoaded = true;
    resetHistory();
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
          alt: item.alt,
          displaySize: item.displaySize
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
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
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
    setItemDisplaySize,
    renameCurrentList,
    undo,
    redo,
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
