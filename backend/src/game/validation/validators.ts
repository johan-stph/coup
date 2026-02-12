import { IGameState, ActionType } from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { getActionConfig } from '../config/actionConfigs';
import { CardType } from '../../constants/cardTypes';

export class ValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates if it's the player's turn
 */
export function validateTurn(gameState: IGameState, uid: string): void {
  const helper = new GameStateHelper(gameState);
  if (!helper.isPlayerTurn(uid)) {
    throw new ValidationError('It is not your turn', 403);
  }
}

/**
 * Validates if the player is still alive (has unrevealed cards)
 */
export function validatePlayerAlive(gameState: IGameState, uid: string): void {
  const helper = new GameStateHelper(gameState);
  if (helper.isPlayerEliminated(uid)) {
    throw new ValidationError('You have been eliminated', 403);
  }
}

/**
 * Validates if the player has enough coins for the action
 */
export function validateResources(
  actionType: ActionType,
  gameState: IGameState,
  uid: string
): void {
  const config = getActionConfig(actionType);
  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(uid);

  if (!player) {
    throw new ValidationError('Player not found', 404);
  }

  // Check if player must coup at 10+ coins
  if (player.coins >= 10 && actionType !== 'coup') {
    throw new ValidationError(
      'You must coup when you have 10 or more coins',
      400
    );
  }

  // Check if player has enough coins for the action
  if (config.minCoinsForAction && player.coins < config.minCoinsForAction) {
    throw new ValidationError(
      `Insufficient coins for this action. Required: ${config.minCoinsForAction}, You have: ${player.coins}`,
      400
    );
  }
}

/**
 * Validates the target for targeted actions
 */
export function validateTarget(
  actionType: ActionType,
  gameState: IGameState,
  actorUid: string,
  targetUid?: string
): void {
  const config = getActionConfig(actionType);

  if (config.requiresTarget && !targetUid) {
    throw new ValidationError('This action requires a target', 400);
  }

  if (!config.requiresTarget && targetUid) {
    throw new ValidationError('This action does not accept a target', 400);
  }

  if (targetUid) {
    // Cannot target yourself
    if (targetUid === actorUid) {
      throw new ValidationError('You cannot target yourself', 400);
    }

    const helper = new GameStateHelper(gameState);
    const target = helper.getPlayerByUid(targetUid);

    if (!target) {
      throw new ValidationError('Target player not found', 404);
    }

    // Target must be alive
    if (helper.isPlayerEliminated(targetUid)) {
      throw new ValidationError('Target player has been eliminated', 400);
    }

    // For steal, target must have coins
    if (actionType === 'steal' && target.coins === 0) {
      throw new ValidationError('Target has no coins to steal', 400);
    }
  }
}

/**
 * Validates that there is no pending action
 */
export function validateNoPendingAction(gameState: IGameState): void {
  if (gameState.pendingAction) {
    throw new ValidationError('Another action is pending resolution', 409);
  }
}

/**
 * Validates that there is a pending action (for challenges/blocks)
 */
export function validatePendingAction(gameState: IGameState): void {
  if (!gameState.pendingAction) {
    throw new ValidationError('No action to challenge or block', 409);
  }
}

/**
 * Validates challenge timing
 */
export function validateChallengeTiming(gameState: IGameState): void {
  if (!gameState.actionResolvesAt) {
    throw new ValidationError('No active challenge window', 400);
  }

  if (new Date() > gameState.actionResolvesAt) {
    throw new ValidationError('Challenge window has closed', 400);
  }
}

/**
 * Validates that the action can be challenged
 */
export function validateCanChallenge(actionType: ActionType): void {
  const config = getActionConfig(actionType);
  if (!config.canBeChallenged) {
    throw new ValidationError('This action cannot be challenged', 400);
  }
}

/**
 * Validates that the action can be blocked
 */
export function validateCanBlock(actionType: ActionType): void {
  const config = getActionConfig(actionType);
  if (!config.canBeBlocked) {
    throw new ValidationError('This action cannot be blocked', 400);
  }
}

/**
 * Validates that the blocking card is valid for the action
 */
export function validateBlockingCard(
  actionType: ActionType,
  blockingCard: CardType
): void {
  const config = getActionConfig(actionType);

  if (!config.blockingCards || !config.blockingCards.includes(blockingCard)) {
    throw new ValidationError(
      `${blockingCard} cannot block ${actionType}`,
      400
    );
  }
}

/**
 * Validates that the player is not the actor (for challenges/blocks)
 */
export function validateNotActor(gameState: IGameState, uid: string): void {
  if (gameState.pendingAction && gameState.pendingAction.actorUid === uid) {
    throw new ValidationError(
      'You cannot challenge or block your own action',
      400
    );
  }
}

/**
 * Validates the game is in progress
 */
export function validateGameInProgress(status: string): void {
  if (status !== 'in_progress') {
    if (status === 'waiting') {
      throw new ValidationError('Game has not started yet', 400);
    } else if (status === 'finished') {
      throw new ValidationError('Game has already ended', 400);
    }
  }
}
