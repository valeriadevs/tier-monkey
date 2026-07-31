export interface TemplateTier {
  label: string;
  color: string;
}

export interface TemplateSampleItem {
  label: string;
  bg: string;
  fg: string;
}

export interface Template {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tiers: TemplateTier[];
  sampleItems: TemplateSampleItem[];
}

const SAMPLE_COLORS = [
  { bg: '#FF6B6B', fg: '#FFFFFF' },
  { bg: '#FFA94D', fg: '#FFFFFF' },
  { bg: '#FFD43B', fg: '#241E17' },
  { bg: '#69DB7C', fg: '#FFFFFF' },
  { bg: '#74C0FC', fg: '#FFFFFF' },
  { bg: '#9775FA', fg: '#FFFFFF' },
  { bg: '#F783AC', fg: '#FFFFFF' }
];

export const TEMPLATES: Template[] = [
  {
    id: 'anime',
    name: 'Anime',
    emoji: '✨',
    description: 'Rate your favorite shows with classic tier labels.',
    tiers: [
      { label: 'SSS', color: '#FF6B6B' },
      { label: 'SS', color: '#FF8FB1' },
      { label: 'S', color: '#FFA94D' },
      { label: 'A', color: '#FFD43B' },
      { label: 'B', color: '#69DB7C' },
      { label: 'C', color: '#74C0FC' },
      { label: 'D', color: '#9775FA' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  },
  {
    id: 'movies',
    name: 'Movies',
    emoji: '🎬',
    description: 'Star-rating tiers for everything you have watched.',
    tiers: [
      { label: '5★', color: '#FF6B6B' },
      { label: '4★', color: '#FFA94D' },
      { label: '3★', color: '#FFD43B' },
      { label: '2★', color: '#69DB7C' },
      { label: '1★', color: '#74C0FC' },
      { label: 'Skip', color: '#A89E8C' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  },
  {
    id: 'music',
    name: 'Music',
    emoji: '🎵',
    description: 'Sort songs by how often you come back to them.',
    tiers: [
      { label: 'Hyperfix', color: '#FF6B6B' },
      { label: 'Loved', color: '#FFA94D' },
      { label: 'Liked', color: '#FFD43B' },
      { label: 'Mid', color: '#69DB7C' },
      { label: 'Skip', color: '#74C0FC' },
      { label: 'Nope', color: '#A89E8C' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  },
  {
    id: 'food',
    name: 'Food',
    emoji: '🍔',
    description: 'Snacks, restaurants, and meals ranked by love.',
    tiers: [
      { label: 'Love', color: '#FF6B6B' },
      { label: 'Like', color: '#FFA94D' },
      { label: 'OK', color: '#FFD43B' },
      { label: 'Pass', color: '#69DB7C' },
      { label: 'Avoid', color: '#74C0FC' },
      { label: 'Yikes', color: '#A89E8C' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  },
  {
    id: 'games',
    name: 'Games',
    emoji: '🎮',
    description: 'Backlog triage with the classic S/A/B/C/D/F framework.',
    tiers: [
      { label: 'S', color: '#FF6B6B' },
      { label: 'A', color: '#FFA94D' },
      { label: 'B', color: '#FFD43B' },
      { label: 'C', color: '#69DB7C' },
      { label: 'D', color: '#74C0FC' },
      { label: 'F', color: '#9775FA' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  },
  {
    id: 'books',
    name: 'Books',
    emoji: '📚',
    description: 'Star ratings + a DNF bucket for what you abandoned.',
    tiers: [
      { label: '5★', color: '#FF6B6B' },
      { label: '4★', color: '#FFA94D' },
      { label: '3★', color: '#FFD43B' },
      { label: '2★', color: '#69DB7C' },
      { label: '1★', color: '#74C0FC' },
      { label: 'DNF', color: '#A89E8C' }
    ],
    sampleItems: SAMPLE_COLORS.slice(0, 6).map((c, i) => ({ label: `${i + 1}`, bg: c.bg, fg: c.fg }))
  }
];

export function makeTemplateBadgeSvg(label: string, bg: string, fg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="${bg}"/>
  <text x="100" y="130" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" font-size="110" font-weight="700" fill="${fg}" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
