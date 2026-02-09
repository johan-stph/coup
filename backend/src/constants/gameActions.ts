// Coup card roles
export const ROLES = [
  'duke',
  'assassin',
  'captain',
  'ambassador',
  'contessa',
] as const;
export type Role = (typeof ROLES)[number];

// All possible game actions
export const GAME_ACTIONS = [
  'income',
  'foreign_aid',
  'tax',
  'assassinate',
  'steal',
  'exchange',
  'coup',
] as const;
export type GameAction = (typeof GAME_ACTIONS)[number];

// Block actions
export const BLOCK_ACTIONS = [
  'block_foreign_aid',
  'block_steal',
  'block_assassinate',
] as const;
export type BlockAction = (typeof BLOCK_ACTIONS)[number];

// Action metadata
export interface ActionMetadata {
  cost: number;
  requiresTarget: boolean;
  claimedRole?: Role; // Role claimed when performing this action
  blockableBy?: Role[]; // Roles that can block this action
  challengeable: boolean; // Whether this action can be challenged
}

export const ACTION_METADATA: Record<GameAction, ActionMetadata> = {
  income: {
    cost: 0,
    requiresTarget: false,
    challengeable: false,
  },
  foreign_aid: {
    cost: 0,
    requiresTarget: false,
    blockableBy: ['duke'],
    challengeable: false,
  },
  tax: {
    cost: 0,
    requiresTarget: false,
    claimedRole: 'duke',
    challengeable: true,
  },
  assassinate: {
    cost: 3,
    requiresTarget: true,
    claimedRole: 'assassin',
    blockableBy: ['contessa'],
    challengeable: true,
  },
  steal: {
    cost: 0,
    requiresTarget: true,
    claimedRole: 'captain',
    blockableBy: ['captain', 'ambassador'],
    challengeable: true,
  },
  exchange: {
    cost: 0,
    requiresTarget: false,
    claimedRole: 'ambassador',
    challengeable: true,
  },
  coup: {
    cost: 7,
    requiresTarget: true,
    challengeable: false,
  },
};

// Block metadata
export interface BlockMetadata {
  claimedRole: Role;
  challengeable: boolean;
}

export const BLOCK_METADATA: Record<BlockAction, BlockMetadata> = {
  block_foreign_aid: {
    claimedRole: 'duke',
    challengeable: true,
  },
  block_steal: {
    claimedRole: 'captain', // or ambassador
    challengeable: true,
  },
  block_assassinate: {
    claimedRole: 'contessa',
    challengeable: true,
  },
};
