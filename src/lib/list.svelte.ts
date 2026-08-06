import type { DisplaySize, Item, ProcessedImage, Tier } from './types';
import { CURRENT_SCHEMA_VERSION, DEFAULT_TIERS, TIER_PALETTE } from './types';
import { db, type ItemRecord, type ListRecord, deleteListCascade } from './db';
import {
  cacheAssetUrls,
  clearAllCachedUrls,
  getAssetUrls,
  resolveAssetUrls,
  revokeAssetUrls,
  saveAsset
} from './assets';
import { processBlob } from './upload';
import { makeTemplateBadgeSvg, svgToPngBlob, type Template } from './templates';
import { announcer } from './announcer.svelte';
import type { ShareSnapshot } from './share';

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
    tiers: [...tiers],
    items: [...items],
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
    const evicted = undoStack.length >= HISTORY_LIMIT ? undoStack.shift() : null;
    undoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (redoStack.length > 0) redoStack.splice(0, redoStack.length);
    if (evicted) evictAssetUrls(evicted);
  }

  function evictAssetUrls(snap: Snapshot) {
    const liveIds = new Set(items.map((i) => i.assetId));
    for (const item of snap.items) {
      if (!liveIds.has(item.assetId)) revokeAssetUrls(item.assetId);
    }
  }

  function restoreSnapshot(snap: Snapshot) {
    tiers.splice(0, tiers.length, ...snap.tiers);
    items.splice(0, items.length, ...snap.items);
    paletteIndex = snap.paletteIndex;
    currentTitle = snap.currentTitle;
    schedulePersist();
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (redoStack.length > HISTORY_LIMIT) redoStack.shift();
    const snap = undoStack.pop();
    if (snap) {
      restoreSnapshot(snap);
      announcer.say('Undid last action');
    }
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(snapshotNow(tiers, items, paletteIndex, currentTitle));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    const snap = redoStack.pop();
    if (snap) {
      restoreSnapshot(snap);
      announcer.say('Redid action');
    }
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
    announcer.say(`Added tier ${tier.label}`);
    return tier;
  }

  function deleteTier(tierId: string) {
    const idx = tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) return;
    const tier = tiers[idx];
    pushHistory();
    tiers.splice(idx, 1);
    let returned = 0;
    for (const item of items) {
      if (item.tierId === tierId) {
        item.tierId = null;
        returned++;
      }
    }
    schedulePersist();
    announcer.say(
      returned > 0
        ? `Deleted tier ${tier.label}. ${returned} item${returned === 1 ? '' : 's'} returned to tray.`
        : `Deleted tier ${tier.label}`
    );
  }

  function renameTier(tierId: string, label: string) {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier || tier.label === label) return;
    pushHistory();
    const oldLabel = tier.label;
    tier.label = label;
    schedulePersist();
    announcer.say(`Renamed tier from ${oldLabel} to ${label}`);
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

  async function persistImage(
    image: ProcessedImage,
    tierId: string | null,
    displaySize: DisplaySize
  ): Promise<Item> {
    const asset = await saveAsset(image.masterBlob, image.thumbBlob);
    const urls = await resolveAssetUrls(asset.id);
    cacheAssetUrls(asset.id, urls);
    return {
      id: crypto.randomUUID(),
      assetId: asset.id,
      url: urls.url,
      thumbUrl: urls.thumbUrl,
      width: image.width,
      height: image.height,
      alt: image.alt,
      tierId,
      displaySize
    };
  }

  async function addItemFromUpload(image: ProcessedImage): Promise<Item> {
    pushHistory();
    const item = await persistImage(image, null, 'M');
    items.push(item);
    schedulePersist();
    announcer.say(`Added ${item.alt || 'image'} to tray`);
    return item;
  }

  async function addItemToTier(
    processed: ProcessedImage,
    tierId: string | null,
    displaySize: DisplaySize = 'M'
  ): Promise<Item> {
    pushHistory();
    const item = await persistImage(processed, tierId, displaySize);
    items.push(item);
    schedulePersist();
    return item;
  }

  function setTiers(newTiers: { label: string; color: string }[]): void {
    pushHistory();
    const tiersWithId: Tier[] = newTiers.map((t) => ({
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      label: t.label,
      color: t.color
    }));
    tiers.splice(0, tiers.length, ...tiersWithId);
    paletteIndex = newTiers.length;
    const validIds = new Set(tiersWithId.map((t) => t.id));
    for (const item of items) {
      if (item.tierId !== null && !validIds.has(item.tierId)) {
        item.tierId = null;
      }
    }
    schedulePersist();
  }

  async function createFromTemplate(template: Template): Promise<string> {
    await flushPendingSave();
    const id = await createNewList(template.name);
    setTiers(template.tiers);
    for (const sample of template.sampleItems) {
      const svg = makeTemplateBadgeSvg(sample.label, sample.bg, sample.fg);
      const pngBlob = await svgToPngBlob(svg, 200);
      const processed = await processBlob(pngBlob, `${template.name} ${sample.label}`);
      await addItemToTier(processed, null, 'M');
    }
    return id;
  }

  async function importShareSnapshot(snap: ShareSnapshot): Promise<string> {
    await flushPendingSave();
    const id = await createNewList(snap.title);
    pushHistory();
    const newTiers: Tier[] = snap.tiers.map((t) => ({
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      label: t.label,
      color: t.color
    }));
    tiers.splice(0, tiers.length, ...newTiers);
    paletteIndex = newTiers.length;

    // Decode + process images in parallel (bounded); persist sequentially to
    // avoid db.assets contention.
    const processedEntries = await mapWithLimit(
      snap.items,
      3,
      async (item) => {
        const base64 = snap.images[item.imgIdx];
        if (!base64) return null;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/webp' });
        const processed = await processBlob(blob, 'Shared');
        return { item, processed };
      }
    );

    for (const entry of processedEntries) {
      if (!entry) continue;
      const { item, processed } = entry;
      const asset = await saveAsset(processed.masterBlob, processed.thumbBlob);
      const urls = await resolveAssetUrls(asset.id);
      cacheAssetUrls(asset.id, urls);
      const tierId = item.tierIdx === null ? null : newTiers[item.tierIdx]?.id ?? null;
      items.push({
        id: crypto.randomUUID(),
        assetId: asset.id,
        url: urls.url,
        thumbUrl: urls.thumbUrl,
        width: processed.width,
        height: processed.height,
        alt: processed.alt,
        tierId,
        displaySize: item.displaySize
      });
    }
    schedulePersist();
    return id;
  }

  function removeItem(id: string) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    pushHistory();
    items.splice(idx, 1);
    schedulePersist();
    announcer.say('Removed item');
  }

  function moveItemToTray(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || item.tierId === null) return;
    const tier = tiers.find((t) => t.id === item.tierId);
    pushHistory();
    item.tierId = null;
    schedulePersist();
    announcer.say(`Moved ${item.alt || 'item'} to tray${tier ? ` from ${tier.label}` : ''}`);
  }

  function clearAll() {
    if (items.length === 0) return;
    pushHistory();
    const n = items.length;
    items.splice(0, items.length);
    schedulePersist();
    announcer.say(`Cleared ${n} item${n === 1 ? '' : 's'} from tray`);
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
    announcer.say(`Created new list ${record.title}`);
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
      const urls = getAssetUrls(r.assetId);
      if (!urls) throw new Error(`Asset ${r.assetId} missing from cache`);
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
    setTiers,
    addItemFromUpload,
    addItemToTier,
    removeItem,
    moveItemToTray,
    clearAll,
    setItemDisplaySize,
    renameCurrentList,
    undo,
    redo,
    unload,
    createNewList,
    createFromTemplate,
    importShareSnapshot,
    loadList,
    deleteCurrentList,
    renameList,
    flushPendingSave
  };
}

export type ListStore = ReturnType<typeof createListStore>;
export const listStore = createListStore();

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}
