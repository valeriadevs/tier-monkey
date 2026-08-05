import type { DisplaySize } from './types';

const SHARE_VERSION = 1 as const;

// Hard upper bound on the encoded payload size we'll accept. Browsers
// truncate URLs around 32–80 KB; a 2 MB ceiling stops us from feeding
// absurdly large or zip-bomb payloads into atob + DecompressionStream
// and also keeps the produced share URL honest about what's shareable.
const MAX_SHARE_BYTES = 2 * 1024 * 1024;

export interface ShareSnapshot {
  v: 1;
  title: string;
  tiers: { label: string; color: string }[];
  items: { imgIdx: number; tierIdx: number | null; displaySize: DisplaySize }[];
  images: string[];
}

export async function encodeShare(snapshot: ShareSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = new Blob([await new Response(stream).arrayBuffer()]);
  const dataUrl = await blobToDataUrl(compressed);
  return dataUrl
    .slice(dataUrl.indexOf(',') + 1)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function decodeShare(payload: string): Promise<ShareSnapshot> {
  if (payload.length > MAX_SHARE_BYTES) {
    throw new Error(
      `Share link too large (${(payload.length / 1024 / 1024).toFixed(1)} MB > 2 MB limit)`
    );
  }
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payload.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  const obj = JSON.parse(text);
  if (obj.v !== SHARE_VERSION) throw new Error(`Unsupported share version: ${obj.v}`);
  if (!Array.isArray(obj.tiers) || !Array.isArray(obj.items) || !Array.isArray(obj.images)) {
    throw new Error('Malformed share payload');
  }
  return obj as ShareSnapshot;
}

export async function buildShareSnapshotFromList(
  list: {
    title: string;
    tiers: { id: string; label: string; color: string }[];
    items: { id: string; assetId: string; tierId: string | null; displaySize: DisplaySize }[];
  },
  getAssetBlob: (assetId: string) => Promise<Blob | null>,
  resizeImageForShare: (blob: Blob) => Promise<Blob>
): Promise<ShareSnapshot> {
  const tierIndexById = new Map<string, number>();
  list.tiers.forEach((t, i) => tierIndexById.set(t.id, i));

  const imageIndexByAssetId = new Map<string, number>();
  const images: string[] = [];
  const items: ShareSnapshot['items'] = [];

  for (const item of list.items) {
    let imgIdx = imageIndexByAssetId.get(item.assetId);
    if (imgIdx === undefined) {
      const blob = await getAssetBlob(item.assetId);
      if (!blob) continue;
      const small = await resizeImageForShare(blob);
      const buf = await small.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const imgBase64 = btoa(binary);
      imgIdx = images.length;
      images.push(imgBase64);
      imageIndexByAssetId.set(item.assetId, imgIdx);
    }
    items.push({
      imgIdx,
      tierIdx: item.tierId === null ? null : tierIndexById.get(item.tierId) ?? null,
      displaySize: item.displaySize
    });
  }

  return {
    v: SHARE_VERSION,
    title: list.title,
    tiers: list.tiers.map((t) => ({ label: t.label, color: t.color })),
    items,
    images
  };
}

export function shareUrl(encoded: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#share=${encoded}`;
}

export function readShareFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  return hash.slice(7);
}

export function clearShareHash(): void {
  if (window.location.hash.startsWith('#share=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

