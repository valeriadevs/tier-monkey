import type { Item } from './types';

const SUPPORTED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MASTER_SIZE = 192;
const THUMB_SIZE = 64;

export type UploadError = {
  filename: string;
  reason: string;
};

export type UploadResult = {
  item: Item | null;
  error: UploadError | null;
};

async function processFile(file: File): Promise<UploadResult> {
  if (!SUPPORTED_MIME.has(file.type)) {
    return {
      item: null,
      error: { filename: file.name, reason: `Unsupported type: ${file.type || 'unknown'}` }
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      item: null,
      error: { filename: file.name, reason: `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 10 MB)` }
    };
  }

  try {
    const masterBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const masterBlob = await rasterizeToBlob(masterBitmap, MASTER_SIZE);

    const thumbBitmap = await createImageBitmap(masterBitmap, {
      resizeWidth: THUMB_SIZE,
      resizeHeight: THUMB_SIZE,
      resizeQuality: 'high'
    });
    const thumbBlob = await rasterizeToBlob(thumbBitmap, THUMB_SIZE);

    masterBitmap.close();
    thumbBitmap.close();

    const id = crypto.randomUUID();
    return {
      item: {
        id,
        masterBlob,
        thumbBlob,
        url: URL.createObjectURL(masterBlob),
        thumbUrl: URL.createObjectURL(thumbBlob),
        width: masterBitmap.width,
        height: masterBitmap.height,
        alt: file.name.replace(/\.[^.]+$/, ''),
        tierId: null
      },
      error: null
    };
  } catch (e) {
    return {
      item: null,
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
  onResult: (result: UploadResult) => void
): Promise<void> {
  const arr = Array.from(files);
  await Promise.all(arr.map((f) => processFile(f).then(onResult)));
}
