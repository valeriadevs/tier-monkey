export type Tier = {
  id: string;
  label: string;
  color: string;
};

export type Item = {
  id: string;
  assetId: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  tierId: string | null;
};

export type ProcessedImage = {
  masterBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  alt: string;
};

export type ListSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
};

export const TIER_PALETTE = [
  '#FF6B6B',
  '#FFA94D',
  '#FFD43B',
  '#69DB7C',
  '#74C0FC',
  '#9775FA',
  '#F783AC'
] as const;

export const DEFAULT_TIERS: Tier[] = [
  { id: 't-s', label: 'S', color: TIER_PALETTE[0] },
  { id: 't-a', label: 'A', color: TIER_PALETTE[1] },
  { id: 't-b', label: 'B', color: TIER_PALETTE[2] },
  { id: 't-c', label: 'C', color: TIER_PALETTE[3] },
  { id: 't-d', label: 'D', color: TIER_PALETTE[4] },
  { id: 't-e', label: 'E', color: TIER_PALETTE[5] },
  { id: 't-f', label: 'F', color: TIER_PALETTE[6] }
];

export const CURRENT_SCHEMA_VERSION = 1;

export const DND_TYPE_ITEMS = 'tier-monkey-items';
