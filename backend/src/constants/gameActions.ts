export const GAME_ACTIONS = [
  'income',
  'foreign_aid',
  'coup',
  'tax',
  'assassinate',
  'exchange',
  'steal',
] as const;

export type GameAction = (typeof GAME_ACTIONS)[number];
