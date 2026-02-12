import GameState from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { CardType } from '../../constants/cardTypes';
import {
  validatePendingAction,
  validateChallengeTiming,
  validateCanBlock,
  validateBlockingCard,
  validatePlayerAlive,
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
  validateChallengeTiming(gameState);

  const pendingAction = gameState.pendingAction!;

  // Validate phase
  if (pendingAction.phase !== 'awaiting_block') {
    throw new Error('Not in blocking phase');
  }

  // Validate action can be blocked
  validateCanBlock(pendingAction.actionType);

  // Validate blocking card
  validateBlockingCard(pendingAction.actionType, blockingCard);

  // Actor cannot block their own action (but other players can block)
  if (blockerUid === pendingAction.actorUid) {
    throw new Error('You cannot block your own action');
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
