import { db, type AssetRecord } from './db';

type AssetUrls = { url: string; thumbUrl: string };

const urlCache = new Map<string, AssetUrls>();

export function cacheAssetUrls(assetId: string, urls: AssetUrls): void {
  urlCache.set(assetId, urls);
}

export function getAssetUrls(assetId: string): AssetUrls | null {
  return urlCache.get(assetId) ?? null;
}

export async function resolveAssetUrls(assetId: string): Promise<AssetUrls> {
  const cached = urlCache.get(assetId);
  if (cached) return cached;
  const asset = await db.assets.get(assetId);
  if (!asset) throw new Error(`Asset ${assetId} not found`);
  const urls = {
    url: URL.createObjectURL(asset.masterBlob),
    thumbUrl: URL.createObjectURL(asset.thumbBlob)
  };
  urlCache.set(assetId, urls);
  return urls;
}

export function revokeAssetUrls(assetId: string): void {
  const cached = urlCache.get(assetId);
  if (cached) {
    URL.revokeObjectURL(cached.url);
    URL.revokeObjectURL(cached.thumbUrl);
    urlCache.delete(assetId);
  }
}

export async function saveAsset(masterBlob: Blob, thumbBlob: Blob): Promise<AssetRecord> {
  const id = crypto.randomUUID();
  const record: AssetRecord = { id, masterBlob, thumbBlob };
  await db.assets.put(record);
  return record;
}

export async function deleteAsset(assetId: string): Promise<void> {
  revokeAssetUrls(assetId);
  await db.assets.delete(assetId);
}

export function clearAllCachedUrls(): void {
  for (const { url, thumbUrl } of urlCache.values()) {
    URL.revokeObjectURL(url);
    URL.revokeObjectURL(thumbUrl);
  }
  urlCache.clear();
}
