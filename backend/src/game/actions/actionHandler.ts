import GameState, {
  IGameState,
  ActionType,
  GameStatePlayer,
} from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { getActionConfig } from '../config/actionConfigs';
import {
  validateTurn,
  validatePlayerAlive,
  validateNoPendingAction,
  validateResources,
  validateTarget,
} from '../validation/validators';
import { broadcast, broadcastToPlayer } from '../../sse/lobbySSEManager';
import { scheduleAutoResolution } from './resolutionHandler';

const CHALLENGE_WINDOW_MS = 8000; // 8 seconds

/**
 * Process a game action
 */
export async function processAction(
  gameCode: string,
  uid: string,
  actionType: ActionType,
  targetUid?: string
): Promise<void> {
  // Load game state
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new Error('Game state not found');
  }

  // Validate action
  validateTurn(gameState, uid);
  validatePlayerAlive(gameState, uid);
  validateNoPendingAction(gameState);
  validateResources(actionType, gameState, uid);
  validateTarget(actionType, gameState, uid, targetUid);

  const config = getActionConfig(actionType);
  const helper = new GameStateHelper(gameState);
  const actor = helper.getPlayerByUid(uid)!;

  // Check if action can be challenged or blocked
  if (config.canBeChallenged || config.canBeBlocked) {
    // Create pending action
    gameState.pendingAction = {
      actionType,
      actorUid: uid,
      targetUid,
      claimedCard: config.card,
      canBeBlocked: config.canBeBlocked,
      canBeChallenged: config.canBeChallenged,
      phase: 'awaiting_challenge',
      timestamp: new Date(),
    };
    gameState.actionResolvesAt = new Date(Date.now() + CHALLENGE_WINDOW_MS);

    await gameState.save();

    // Broadcast action declared
    broadcast(gameCode, 'action_declared', {
      actorUid: uid,
      actorUserName: actor.userName,
      action: actionType,
      targetUid,
      claimedCard: config.card,
      canBeChallenged: config.canBeChallenged,
      canBeBlocked: config.canBeBlocked,
      resolvesAt: gameState.actionResolvesAt,
    });

    // Schedule auto-resolution
    scheduleAutoResolution(gameCode, CHALLENGE_WINDOW_MS);
  } else {
    // Immediate execution for simple actions (income, coup without challenge)
    await executeActionImmediately(gameState, actionType, uid, targetUid);
  }
}

/**
 * Execute simple actions immediately (income, coup)
 */
async function executeActionImmediately(
  gameState: IGameState,
  actionType: ActionType,
  uid: string,
  targetUid?: string
): Promise<void> {
  const helper = new GameStateHelper(gameState);
  const actor = helper.getPlayerByUid(uid)!;

  if (actionType === 'income') {
    actor.coins += 1;
    broadcast(gameState.gameCode, 'coins_changed', {
      playerUid: uid,
      oldCoins: actor.coins - 1,
      newCoins: actor.coins,
      reason: 'income',
    });
  } else if (actionType === 'coup' && targetUid) {
    // Deduct coins
    actor.coins -= 7;
    broadcast(gameState.gameCode, 'coins_changed', {
      playerUid: uid,
      oldCoins: actor.coins + 7,
      newCoins: actor.coins,
      reason: 'coup',
    });

    // Set waiting for card reveal
    gameState.waitingForCardReveal = {
      playerUid: targetUid,
      reason: 'couped',
    };

    await gameState.save();

    broadcast(gameState.gameCode, 'action_completed', {
      actorUid: uid,
      action: actionType,
      targetUid,
    });

    // Note: Turn advances when target reveals card
    return;
  }

  // Advance turn
  await advanceTurn(gameState);
  await gameState.save();

  broadcast(gameState.gameCode, 'action_completed', {
    actorUid: uid,
    action: actionType,
    targetUid,
  });
}

/**
 * Execute an action after challenges/blocks are resolved
 */
export async function executeAction(
  gameState: IGameState,
  actionType: ActionType,
  actorUid: string,
  targetUid?: string
): Promise<void> {
  const helper = new GameStateHelper(gameState);
  const actor = helper.getPlayerByUid(actorUid)!;

  switch (actionType) {
    case 'income':
      actor.coins += 1;
      broadcast(gameState.gameCode, 'coins_changed', {
        playerUid: actorUid,
        newCoins: actor.coins,
        reason: 'income',
      });
      break;

    case 'foreign_aid':
      actor.coins += 2;
      broadcast(gameState.gameCode, 'coins_changed', {
        playerUid: actorUid,
        newCoins: actor.coins,
        reason: 'foreign_aid',
      });
      break;

    case 'tax':
      actor.coins += 3;
      broadcast(gameState.gameCode, 'coins_changed', {
        playerUid: actorUid,
        newCoins: actor.coins,
        reason: 'tax',
      });
      break;

    case 'steal':
      if (targetUid) {
        const target = helper.getPlayerByUid(targetUid)!;
        const stolen = Math.min(2, target.coins);
        target.coins -= stolen;
        actor.coins += stolen;

        broadcast(gameState.gameCode, 'coins_changed', {
          playerUid: targetUid,
          newCoins: target.coins,
          reason: 'stolen_from',
        });
        broadcast(gameState.gameCode, 'coins_changed', {
          playerUid: actorUid,
          newCoins: actor.coins,
          reason: 'steal',
        });
      }
      break;

    case 'assassinate':
      if (targetUid) {
        actor.coins -= 3;
        broadcast(gameState.gameCode, 'coins_changed', {
          playerUid: actorUid,
          newCoins: actor.coins,
          reason: 'assassinate',
        });

        // Target must reveal a card
        gameState.waitingForCardReveal = {
          playerUid: targetUid,
          reason: 'assassinated',
        };
        await gameState.save();
        return; // Don't advance turn yet
      }
      break;

    case 'exchange':
      // Draw 2 cards from deck
      if (gameState.deck.length >= 2) {
        const drawnCards = [gameState.deck.pop()!, gameState.deck.pop()!];
        gameState.waitingForExchange = {
          playerUid: actorUid,
          drawnCards,
        };
        await gameState.save();

        // Send drawn cards only to the actor
        broadcastToPlayer(
          gameState.gameCode,
          actorUid,
          'exchange_cards_drawn',
          {
            cards: drawnCards,
            mustChoose: 2,
          }
        );
        return; // Don't advance turn yet
      }
      break;

    case 'coup':
      // Handled in executeActionImmediately
      break;
  }

  await gameState.save();
}

/**
 * Advance to next player's turn
 */
export async function advanceTurn(gameState: IGameState): Promise<void> {
  const helper = new GameStateHelper(gameState);

  // Clear pending action
  gameState.pendingAction = undefined;
  gameState.actionResolvesAt = undefined;

  // Get next active player
  gameState.currentPlayerIndex = helper.getNextPlayerIndex();

  // Check game over
  if (helper.isGameOver()) {
    const winner = helper.getWinner();
    broadcast(gameState.gameCode, 'game_over', {
      winnerUid: winner?.uid,
      winnerUserName: winner?.userName,
    });

    // Update Game status to finished
    const Game = (await import('../../db/models/Game.model.js')).default;
    await Game.updateOne(
      { gameCode: gameState.gameCode },
      { status: 'finished' }
    );

    return;
  }

  // Broadcast new turn
  const currentPlayer = helper.getCurrentPlayer();
  broadcast(gameState.gameCode, 'turn_started', {
    currentPlayerUid: currentPlayer.uid,
    currentPlayerUserName: currentPlayer.userName,
    mustCoup: currentPlayer.coins >= 10,
  });
}
