import { db } from './db';
import type { Item, Tier } from './types';

const DPR = 2;
const LABEL_W = 120;
const ITEM_SIZE = 96;
const ITEM_GAP = 8;
const ROW_GAP = 8;
const ROW_PAD_X = 16;
const OUTER_MARGIN = 32;
const TITLE_H = 64;
const TITLE_GAP = 20;
const MIN_CONTENT_W = 560;
const ROW_HEIGHT = 104;
const RADIUS = 10;
const BG = '#FFFFFF';
const PANEL = '#FAF7F2';
const ITEM_BORDER = '#E7E0D5';
const INK = '#241E17';
const PLACEHOLDER = '#E7E0D5';

const FONT_DISPLAY = '"Fredoka", system-ui, -apple-system, "Segoe UI", sans-serif';

export type ExportInput = {
  title: string;
  tiers: Tier[];
  items: Item[];
};

export async function exportListToPng(input: ExportInput): Promise<Blob> {
  const rankedItems = input.items.filter((i) => i.tierId !== null);

  const itemsByTier = new Map<string, Item[]>();
  for (const t of input.tiers) itemsByTier.set(t.id, []);
  for (const item of rankedItems) {
    const arr = itemsByTier.get(item.tierId!);
    if (arr) arr.push(item);
  }

  const bitmapEntries = await Promise.all(
    rankedItems.map(async (item) => {
      const asset = await db.assets.get(item.assetId);
      if (!asset) return null;
      try {
        const bitmap = await createImageBitmap(asset.masterBlob, {
          imageOrientation: 'from-image'
        });
        return { id: item.id, bitmap };
      } catch {
        return null;
      }
    })
  );
  const bitmapMap = new Map<string, ImageBitmap>();
  for (const entry of bitmapEntries) {
    if (entry) bitmapMap.set(entry.id, entry.bitmap);
  }

  try {
    let maxRowWidth = 0;
    for (const tier of input.tiers) {
      const tierItems = itemsByTier.get(tier.id) ?? [];
      const itemsWidth =
        tierItems.length === 0
          ? 0
          : tierItems.length * ITEM_SIZE + (tierItems.length - 1) * ITEM_GAP;
      const rowWidth = LABEL_W + ROW_PAD_X + itemsWidth + ROW_PAD_X;
      if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
    }
    const contentWidth = Math.max(MIN_CONTENT_W, maxRowWidth);
    const canvasWidth = contentWidth + 2 * OUTER_MARGIN;

    const titleBlock = input.title.trim() ? TITLE_H + TITLE_GAP : 0;
    const totalRowsHeight =
      input.tiers.length * ROW_HEIGHT + Math.max(0, input.tiers.length - 1) * ROW_GAP;
    const canvasHeight = titleBlock + totalRowsHeight + 2 * OUTER_MARGIN;

    const canvas = new OffscreenCanvas(canvasWidth * DPR, canvasHeight * DPR);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context');
    ctx.scale(DPR, DPR);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let y = OUTER_MARGIN;

    if (input.title.trim()) {
      ctx.fillStyle = INK;
      ctx.font = `600 32px ${FONT_DISPLAY}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(truncateForCanvas(input.title.trim(), ctx, contentWidth), OUTER_MARGIN, y + TITLE_H / 2);
      y += TITLE_H + TITLE_GAP;
    }

    for (const tier of input.tiers) {
      const tierItems = itemsByTier.get(tier.id) ?? [];

      ctx.fillStyle = PANEL;
      drawRoundRect(ctx, OUTER_MARGIN, y, contentWidth, ROW_HEIGHT, RADIUS);
      ctx.fill();

      ctx.fillStyle = tier.color;
      drawRoundRect(ctx, OUTER_MARGIN, y, LABEL_W, ROW_HEIGHT, RADIUS);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.rect(OUTER_MARGIN + LABEL_W - RADIUS, y, RADIUS, ROW_HEIGHT);
      ctx.clip();
      ctx.fillStyle = tier.color;
      ctx.fillRect(OUTER_MARGIN + LABEL_W - RADIUS, y, RADIUS, ROW_HEIGHT);
      ctx.restore();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 36px ${FONT_DISPLAY}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(tier.label, OUTER_MARGIN + LABEL_W / 2, y + ROW_HEIGHT / 2 + 1);

      const itemY = y + (ROW_HEIGHT - ITEM_SIZE) / 2;
      let itemX = OUTER_MARGIN + LABEL_W + ROW_PAD_X;
      for (const item of tierItems) {
        const bitmap = bitmapMap.get(item.id);
        ctx.save();
        drawRoundRect(ctx, itemX, itemY, ITEM_SIZE, ITEM_SIZE, RADIUS);
        ctx.clip();
        if (bitmap) {
          const scale = Math.max(ITEM_SIZE / bitmap.width, ITEM_SIZE / bitmap.height);
          const w = bitmap.width * scale;
          const h = bitmap.height * scale;
          const dx = itemX + (ITEM_SIZE - w) / 2;
          const dy = itemY + (ITEM_SIZE - h) / 2;
          ctx.drawImage(bitmap, dx, dy, w, h);
        } else {
          ctx.fillStyle = PLACEHOLDER;
          ctx.fillRect(itemX, itemY, ITEM_SIZE, ITEM_SIZE);
        }
        ctx.restore();

        ctx.strokeStyle = ITEM_BORDER;
        ctx.lineWidth = 1;
        drawRoundRect(ctx, itemX, itemY, ITEM_SIZE, ITEM_SIZE, RADIUS);
        ctx.stroke();

        itemX += ITEM_SIZE + ITEM_GAP;
      }

      y += ROW_HEIGHT + ROW_GAP;
    }

    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    for (const bitmap of bitmapMap.values()) {
      bitmap.close();
    }
  }
}

function drawRoundRect(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateForCanvas(text: string, ctx: OffscreenCanvasRenderingContext2D, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const slice = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(slice).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ellipsis;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(s: string): string {
  return (
    s
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'tier-list'
  );
}
