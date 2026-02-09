// Game types matching backend implementation

export type Role = 'duke' | 'assassin' | 'captain' | 'ambassador' | 'contessa';

export type GameAction =
  | 'income'
  | 'foreign_aid'
  | 'tax'
  | 'assassinate'
  | 'steal'
  | 'exchange'
  | 'coup';

export type BlockAction =
  | 'block_foreign_aid'
  | 'block_steal'
  | 'block_assassinate';

export type TurnPhase = 'action' | 'challenge' | 'block' | 'resolve';

export interface PlayerState {
  uid: string;
  coins: number;
  influenceCount: number;
  influences: Role[] | null; // null for other players' cards
  revealedInfluences: Role[];
}

export interface PendingAction {
  type: GameAction;
  actorUid: string;
  targetUid?: string;
  claimedRole?: Role;
  timestamp: string;
  respondedPlayers: string[];
}

export interface PendingBlock {
  type: BlockAction;
  blockerUid: string;
  claimedRole: Role;
  timestamp: string;
  respondedPlayers: string[];
}

export interface PendingInfluenceLoss {
  playerUid: string;
  reason:
    | 'challenge_failed'
    | 'challenge_succeeded'
    | 'assassinated'
    | 'couped';
}

export interface ActionHistoryEntry {
  type: 'action' | 'challenge' | 'block' | 'resolve';
  actorUid: string;
  targetUid?: string;
  action?: GameAction;
  blockAction?: BlockAction;
  claimedRole?: Role;
  successful: boolean;
  revealedCard?: Role;
  timestamp: string;
  description: string;
}

export interface GameState {
  gameCode: string;
  name: string;
  status: 'waiting' | 'in_progress' | 'finished';
  players: Array<{ uid: string; userName: string }>;
  currentTurnUid?: string;
  turnPhase?: TurnPhase;
  deckSize: number;
  playerStates?: PlayerState[];
  pendingAction?: PendingAction;
  pendingBlock?: PendingBlock;
  pendingInfluenceLoss?: PendingInfluenceLoss;
  actionHistory?: ActionHistoryEntry[];
}

// Action metadata for UI
export interface ActionMetadata {
  name: string;
  displayName: string;
  cost: number;
  requiresTarget: boolean;
  description: string;
  role?: Role;
}

export const ACTION_CONFIG: Record<GameAction, ActionMetadata> = {
  income: {
    name: 'income',
    displayName: 'INCOME',
    cost: 0,
    requiresTarget: false,
    description: 'Take 1 coin from the treasury',
  },
  foreign_aid: {
    name: 'foreign_aid',
    displayName: 'FOREIGN AID',
    cost: 0,
    requiresTarget: false,
    description: 'Take 2 coins (blockable by Duke)',
  },
  tax: {
    name: 'tax',
    displayName: 'TAX',
    cost: 0,
    requiresTarget: false,
    description: 'Take 3 coins (Duke)',
    role: 'duke',
  },
  assassinate: {
    name: 'assassinate',
    displayName: 'ASSASSINATE',
    cost: 3,
    requiresTarget: true,
    description: 'Pay 3 coins to kill an influence (Assassin)',
    role: 'assassin',
  },
  steal: {
    name: 'steal',
    displayName: 'STEAL',
    cost: 0,
    requiresTarget: true,
    description: 'Take 2 coins from another player (Captain)',
    role: 'captain',
  },
  exchange: {
    name: 'exchange',
    displayName: 'EXCHANGE',
    cost: 0,
    requiresTarget: false,
    description: 'Exchange cards with the deck (Ambassador)',
    role: 'ambassador',
  },
  coup: {
    name: 'coup',
    displayName: 'COUP',
    cost: 7,
    requiresTarget: true,
    description: 'Pay 7 coins to force player to lose influence',
  },
};

export const ROLE_DISPLAY: Record<Role, string> = {
  duke: 'DUKE',
  assassin: 'ASSASSIN',
  captain: 'CAPTAIN',
  ambassador: 'AMBASSADOR',
  contessa: 'CONTESSA',
};
