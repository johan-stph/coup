import GameState from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import {
  validatePendingAction,
  validatePlayerAlive,
  ValidationError,
} from '../validation/validators';
import { broadcast } from '../../sse/lobbySSEManager';
import { executeAction, advanceTurn } from './actionHandler';

/**
 * Handle a player explicitly allowing an action (choosing not to block)
 */
export async function processAllow(
  gameCode: string,
  playerUid: string
): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new Error('Game state not found');
  }

  validatePendingAction(gameState);
  validatePlayerAlive(gameState, playerUid);

  const pendingAction = gameState.pendingAction!;

  // Can only allow during block phase
  if (pendingAction.phase !== 'awaiting_block') {
    throw new ValidationError('Not in blocking phase', 409);
  }

  // For targeted actions, only the target can allow
  if (pendingAction.targetUid && playerUid !== pendingAction.targetUid) {
    throw new ValidationError('Only the target can allow this action', 403);
  }

  // For non-targeted blockable actions (like foreign_aid), anyone except the actor can block
  // So for "allow", we need to check if this player is eligible to have blocked
  if (!pendingAction.targetUid && playerUid === pendingAction.actorUid) {
    throw new ValidationError('You cannot allow your own action', 400);
  }

  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(playerUid)!;

  // Broadcast that player allowed the action
  broadcast(gameCode, 'action_allowed', {
    playerUid,
    playerUserName: player.userName,
    action: pendingAction.actionType,
  });

  // Execute the action immediately
  await executeAction(
    gameState,
    pendingAction.actionType,
    pendingAction.actorUid,
    pendingAction.targetUid
  );

  // Clear pending action
  gameState.pendingAction = undefined;
  gameState.actionResolvesAt = undefined;

  // Advance turn if not waiting for card reveal or exchange
  if (!gameState.waitingForCardReveal && !gameState.waitingForExchange) {
    await advanceTurn(gameState);
  }

  await gameState.save();

  broadcast(gameCode, 'action_completed', {
    actorUid: pendingAction.actorUid,
    action: pendingAction.actionType,
  });
}
