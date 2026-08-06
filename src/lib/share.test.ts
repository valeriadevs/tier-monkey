import { describe, expect, it } from 'vitest';
import { buildShareSnapshotFromList, decodeShare, encodeShare, type ShareSnapshot } from './share';

const sampleSnapshot: ShareSnapshot = {
  v: 1,
  title: 'Best snacks',
  tiers: [
    { label: 'S', color: '#FF6B6B' },
    { label: 'A', color: '#FFA94D' },
    { label: 'B', color: '#FFD43B' }
  ],
  items: [
    { imgIdx: 0, tierIdx: 0, displaySize: 'M' },
    { imgIdx: 1, tierIdx: 1, displaySize: 'M' },
    { imgIdx: 0, tierIdx: 2, displaySize: 'S' }
  ],
  images: ['YWJj', 'ZGVm'] // "abc" and "def" in base64
};

describe('share round-trip', () => {
  it('encodeShare → decodeShare preserves a snapshot', async () => {
    const encoded = await encodeShare(sampleSnapshot);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = await decodeShare(encoded);
    expect(decoded).toEqual(sampleSnapshot);
  });

  it('encodeShare output is URL-safe (no "+", "/", "=")', async () => {
    const encoded = await encodeShare(sampleSnapshot);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('decodeShare rejects payloads larger than the cap', async () => {
    const huge = 'A'.repeat(3 * 1024 * 1024);
    await expect(decodeShare(huge)).rejects.toThrow(/too large/i);
  });

  it('decodeShare rejects zip-bomb-style payloads that decompress past the cap', async () => {
    // 10 MB of zeros compresses to ~10 KB — well under the 2 MB input cap,
    // but the decompressed stream blows past the 8 MB decompression guard.
    const original = new Uint8Array(10 * 1024 * 1024);
    const compressedStream = new Blob([original])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
    let binary = '';
    for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
    const payload = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await expect(decodeShare(payload)).rejects.toThrow(/exceeds/i);
  });

  it('decodeShare surfaces invalid base64 as a typed error', async () => {
    await expect(decodeShare('!!!not-base64!!!')).rejects.toThrow(/Invalid share encoding/i);
  });

  it('decodeShare rejects malformed payloads', async () => {
    await expect(decodeShare('not-real-base64-at-all')).rejects.toThrow();
  });

  it('buildShareSnapshotFromList dedupes by assetId', async () => {
    const seen = new Map<string, number>();
    let calls = 0;
    const getAssetBlob = async (assetId: string) => {
      seen.set(assetId, (seen.get(assetId) ?? 0) + 1);
      calls++;
      return new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    };
    const resizeImageForShare = async (blob: Blob) => blob;

    const result = await buildShareSnapshotFromList(
      {
        title: 't',
        tiers: [{ id: 't1', label: 'S', color: '#000' }],
        items: [
          { id: 'i1', assetId: 'a1', tierId: 't1', displaySize: 'M' },
          { id: 'i2', assetId: 'a1', tierId: null, displaySize: 'M' },
          { id: 'i3', assetId: 'a2', tierId: null, displaySize: 'M' }
        ]
      },
      getAssetBlob,
      resizeImageForShare
    );

    // Only 2 unique assetIds, so getAssetBlob called twice total.
    expect(calls).toBe(2);
    expect(seen.get('a1')).toBe(1);
    expect(seen.get('a2')).toBe(1);
    expect(result.images.length).toBe(2);
    // Both items referencing 'a1' should share imgIdx.
    expect(result.items[0].imgIdx).toBe(result.items[1].imgIdx);
    expect(result.items[2].imgIdx).not.toBe(result.items[0].imgIdx);
  });
});
