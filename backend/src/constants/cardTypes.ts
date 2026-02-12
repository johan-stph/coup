export const CARD_TYPES = [
  'duke',
  'assassin',
  'ambassador',
  'captain',
  'contessa',
] as const;

export type CardType = (typeof CARD_TYPES)[number];
