import GameState from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { CardType } from '../../constants/cardTypes';
import {
  validatePendingAction,
  validateCanBlock,
  validateBlockingCard,
  validatePlayerAlive,
  ValidationError,
} from '../validation/validators';
import { broadcast } from '../../sse/lobbySSEManager';
import { scheduleAutoResolution } from './resolutionHandler';

const BLOCK_CHALLENGE_WINDOW_MS = 8000; // 8 seconds

/**
 * Handle a player blocking an action
 */
export async function processBlock(
  gameCode: string,
  blockerUid: string,
  blockingCard: CardType
): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new Error('Game state not found');
  }

  validatePendingAction(gameState);
  validatePlayerAlive(gameState, blockerUid);

  const pendingAction = gameState.pendingAction!;

  // Validate phase - allow blocking during challenge phase for actions that can be both challenged and blocked
  if (
    pendingAction.phase !== 'awaiting_block' &&
    pendingAction.phase !== 'awaiting_challenge'
  ) {
    throw new ValidationError('Not in blocking phase', 409);
  }

  // Validate action can be blocked
  validateCanBlock(pendingAction.actionType);

  // Validate blocking card
  validateBlockingCard(pendingAction.actionType, blockingCard);

  // Actor cannot block their own action (but other players can block)
  if (blockerUid === pendingAction.actorUid) {
    throw new ValidationError('You cannot block your own action', 400);
  }

  // For targeted actions, only the target can block
  if (pendingAction.targetUid && blockerUid !== pendingAction.targetUid) {
    throw new ValidationError('Only the target can block this action', 403);
  }

  const helper = new GameStateHelper(gameState);
  const blocker = helper.getPlayerByUid(blockerUid)!;

  // Update pending action
  pendingAction.blockingPlayerUid = blockerUid;
  pendingAction.blockClaimedCard = blockingCard;
  pendingAction.phase = 'awaiting_block_challenge';
  gameState.actionResolvesAt = new Date(Date.now() + BLOCK_CHALLENGE_WINDOW_MS);

  await gameState.save();

  // Broadcast block
  broadcast(gameCode, 'block_declared', {
    blockerUid,
    blockerUserName: blocker.userName,
    blockingCard,
    action: pendingAction.actionType,
    resolvesAt: gameState.actionResolvesAt,
  });

  // Schedule auto-resolution
  scheduleAutoResolution(gameCode, BLOCK_CHALLENGE_WINDOW_MS);
}
