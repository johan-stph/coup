import { CardType } from '../../constants/cardTypes';
import { ActionType } from '../../db/models/GameState.model';

export interface ActionConfig {
  canBeChallenged: boolean;
  canBeBlocked: boolean;
  card?: CardType; // Card claimed when performing this action
  blockingCards?: CardType[]; // Cards that can block this action
  cost: number; // Coin cost
  requiresTarget: boolean;
  minCoinsForAction?: number; // Minimum coins needed
  forcedAtCoins?: number; // Must perform at this coin threshold
}

export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  income: {
    canBeChallenged: false,
    canBeBlocked: false,
    cost: 0,
    requiresTarget: false,
  },
  foreign_aid: {
    canBeChallenged: false,
    canBeBlocked: true,
    blockingCards: ['duke'],
    cost: 0,
    requiresTarget: false,
  },
  coup: {
    canBeChallenged: false,
    canBeBlocked: false,
    cost: 7,
    requiresTarget: true,
    minCoinsForAction: 7,
    forcedAtCoins: 10,
  },
  tax: {
    canBeChallenged: true,
    canBeBlocked: false,
    card: 'duke',
    cost: 0,
    requiresTarget: false,
  },
  assassinate: {
    canBeChallenged: true,
    canBeBlocked: true,
    blockingCards: ['contessa'],
    card: 'assassin',
    cost: 3,
    requiresTarget: true,
    minCoinsForAction: 3,
  },
  steal: {
    canBeChallenged: true,
    canBeBlocked: true,
    blockingCards: ['captain', 'ambassador'],
    card: 'captain',
    cost: 0,
    requiresTarget: true,
  },
  exchange: {
    canBeChallenged: true,
    canBeBlocked: false,
    card: 'ambassador',
    cost: 0,
    requiresTarget: false,
  },
};

export function getActionConfig(actionType: ActionType): ActionConfig {
  return ACTION_CONFIGS[actionType];
}

export function canBlockAction(
  actionType: ActionType,
  blockingCard: CardType
): boolean {
  const config = ACTION_CONFIGS[actionType];
  if (!config.canBeBlocked || !config.blockingCards) {
    return false;
  }
  return config.blockingCards.includes(blockingCard);
}
