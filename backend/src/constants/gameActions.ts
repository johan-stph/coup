export const GAME_ACTIONS = ['income', 'foreign_aid'] as const;
export type GameAction = (typeof GAME_ACTIONS)[number];
