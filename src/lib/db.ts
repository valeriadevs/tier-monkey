import Dexie, { type Table } from 'dexie';
import type { DisplaySize, Tier } from './types';

export type ListRecord = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  tiers: Tier[];
  paletteIndex: number;
};

export type ItemRecord = {
  id: string;
  listId: string;
  assetId: string;
  tierId: string | null;
  position: number;
  width: number;
  height: number;
  alt: string;
  displaySize: DisplaySize;
};

export type AssetRecord = {
  id: string;
  masterBlob: Blob;
  thumbBlob: Blob;
};

class TierMonkeyDB extends Dexie {
  lists!: Table<ListRecord, string>;
  items!: Table<ItemRecord, string>;
  assets!: Table<AssetRecord, string>;

  constructor() {
    super('tier-monkey');
    this.version(1).stores({
      lists: 'id, updatedAt, createdAt',
      items: 'id, listId, [listId+tierId+position]',
      assets: 'id'
    });
  }
}

export const db = new TierMonkeyDB();

export async function deleteListCascade(listId: string): Promise<void> {
  await db.transaction('rw', db.lists, db.items, db.assets, async () => {
    const items = await db.items.where('listId').equals(listId).toArray();
    const assetIds = items.map((i) => i.assetId);
    await db.items.where('listId').equals(listId).delete();
    if (assetIds.length > 0) {
      await db.assets.bulkDelete(assetIds);
    }
    await db.lists.delete(listId);
  });
}
