import GameState from '../../db/models/GameState.model';
import { broadcast } from '../../sse/lobbySSEManager';
import { executeAction, advanceTurn } from './actionHandler';

// Store active timeout handles to prevent duplicate scheduling
const activeTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Schedule automatic resolution of a pending action
 */
export function scheduleAutoResolution(
  gameCode: string,
  delayMs: number
): void {
  // Clear any existing timeout for this game
  const existingTimeout = activeTimeouts.get(gameCode);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule new timeout
  const timeoutHandle = setTimeout(async () => {
    await autoResolveAction(gameCode);
    activeTimeouts.delete(gameCode);
  }, delayMs);

  activeTimeouts.set(gameCode, timeoutHandle);
}

/**
 * Automatically resolve a pending action when timeout expires
 */
export async function autoResolveAction(gameCode: string): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });

  if (!gameState || !gameState.pendingAction) {
    return; // No pending action
  }

  if (!gameState.actionResolvesAt) {
    return; // No timeout set
  }

  // Check if timeout has actually expired (in case of race conditions)
  if (new Date() < gameState.actionResolvesAt) {
    return; // Not ready yet
  }

  const { pendingAction } = gameState;

  switch (pendingAction.phase) {
    case 'awaiting_challenge':
      // No challenge received, proceed to block phase or execute
      if (pendingAction.canBeBlocked) {
        // Move to block phase
        pendingAction.phase = 'awaiting_block';
        gameState.actionResolvesAt = new Date(Date.now() + 8000);
        await gameState.save();

        broadcast(gameCode, 'challenge_window_closed', {});
        broadcast(gameCode, 'block_window_open', {
          action: pendingAction.actionType,
          resolvesAt: gameState.actionResolvesAt,
        });

        // Schedule next resolution
        scheduleAutoResolution(gameCode, 8000);
      } else {
        // Execute action immediately
        broadcast(gameCode, 'challenge_window_closed', {});

        await executeAction(
          gameState,
          pendingAction.actionType,
          pendingAction.actorUid,
          pendingAction.targetUid
        );

        if (!gameState.waitingForCardReveal && !gameState.waitingForExchange) {
          await advanceTurn(gameState);
        }

        await gameState.save();

        broadcast(gameCode, 'action_completed', {
          actorUid: pendingAction.actorUid,
          action: pendingAction.actionType,
        });
      }
      break;

    case 'awaiting_block':
      // No block received, execute action
      broadcast(gameCode, 'block_window_closed', {});

      await executeAction(
        gameState,
        pendingAction.actionType,
        pendingAction.actorUid,
        pendingAction.targetUid
      );

      if (!gameState.waitingForCardReveal && !gameState.waitingForExchange) {
        await advanceTurn(gameState);
      }

      await gameState.save();

      broadcast(gameCode, 'action_completed', {
        actorUid: pendingAction.actorUid,
        action: pendingAction.actionType,
      });
      break;

    case 'awaiting_block_challenge':
      // No challenge to block, block succeeds
      broadcast(gameCode, 'block_succeeded', {
        blockingPlayer: pendingAction.blockingPlayerUid,
      });

      broadcast(gameCode, 'action_blocked', {
        action: pendingAction.actionType,
        blockingPlayer: pendingAction.blockingPlayerUid,
      });

      await advanceTurn(gameState);
      await gameState.save();
      break;
  }
}

/**
 * Cancel all scheduled resolutions (useful for cleanup/testing)
 */
export function cancelAllResolutions(): void {
  for (const [gameCode, timeoutHandle] of activeTimeouts.entries()) {
    clearTimeout(timeoutHandle);
    activeTimeouts.delete(gameCode);
  }
}
