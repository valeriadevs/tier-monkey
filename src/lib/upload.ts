import type { ProcessedImage } from './types';

const SUPPORTED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
// Master blob is the source of truth for export rasterization. Spec mandates
// ≤1024 so exported PNGs don't lose detail vs. the on-screen tile.
const MASTER_SIZE = 1024;
const THUMB_SIZE = 96;

export type UploadError = {
  filename: string;
  reason: string;
};

export type UploadResult = {
  image: ProcessedImage | null;
  error: UploadError | null;
};

export async function processBlob(blob: Blob, alt: string): Promise<ProcessedImage> {
  const masterBitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const masterBlob = await rasterizeToBlob(masterBitmap, MASTER_SIZE);
  const thumbBlob = await rasterizeToBlob(masterBitmap, THUMB_SIZE);

  const width = masterBitmap.width;
  const height = masterBitmap.height;

  masterBitmap.close();

  return { masterBlob, thumbBlob, width, height, alt };
}

async function processFile(file: File): Promise<UploadResult> {
  if (!SUPPORTED_MIME.has(file.type)) {
    return {
      image: null,
      error: { filename: file.name, reason: `Unsupported type: ${file.type || 'unknown'}` }
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      image: null,
      error: { filename: file.name, reason: `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 10 MB)` }
    };
  }

  try {
    const image = await processBlob(file, file.name.replace(/\.[^.]+$/, ''));
    return { image, error: null };
  } catch (e) {
    return {
      image: null,
      error: { filename: file.name, reason: `Decode failed: ${(e as Error).message}` }
    };
  }
}

async function rasterizeToBlob(source: ImageBitmap, targetSize: number): Promise<Blob> {
  const scale = Math.min(1, targetSize / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  return await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
}

export async function uploadFiles(
  files: FileList | File[],
  onResult: (index: number, result: UploadResult) => void
): Promise<void> {
  const arr = Array.from(files);
  await mapWithLimit(arr, MAX_CONCURRENT_UPLOADS, async (f, i) => {
    onResult(i, await processFile(f));
  });
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

const MAX_CONCURRENT_UPLOADS = 3;
