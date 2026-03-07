import GameState, {
  IGameState,
  ActionType,
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

  // Broadcast to all players that an action was declared (used by event log)
  broadcast(gameCode, 'action_declared', {
    actorUid: uid,
    actorUserName: actor.userName,
    action: actionType,
    targetUid,
    claimedCard: config.card,
    canBeChallenged: config.canBeChallenged,
    canBeBlocked: config.canBeBlocked,
  });

  // Check if action can be challenged or blocked
  if (config.canBeChallenged || config.canBeBlocked) {
    // For assassination, deduct coins upfront (like coup)
    if (actionType === 'assassinate') {
      actor.coins -= 3;
      broadcast(gameCode, 'coins_changed', {
        playerUid: uid,
        oldCoins: actor.coins + 3,
        newCoins: actor.coins,
        reason: 'assassinate',
      });
    }

    // Determine initial phase based on whether action can be challenged
    const initialPhase = config.canBeChallenged
      ? 'awaiting_challenge'
      : 'awaiting_block';

    // Only challenge phase is time-constrained; block phase waits for explicit allow/block
    if (initialPhase === 'awaiting_challenge') {
      gameState.actionResolvesAt = new Date(Date.now() + CHALLENGE_WINDOW_MS);
    } else {
      gameState.actionResolvesAt = undefined;
    }

    // Create pending action
    gameState.pendingAction = {
      actionType,
      actorUid: uid,
      targetUid,
      claimedCard: config.card,
      canBeBlocked: config.canBeBlocked,
      canBeChallenged: config.canBeChallenged,
      phase: initialPhase,
      timestamp: new Date(),
    };

    await gameState.save();

    // Schedule auto-resolution only for timed challenge phase
    if (initialPhase === 'awaiting_challenge') {
      scheduleAutoResolution(gameCode, CHALLENGE_WINDOW_MS);
    }
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
        // Coins already deducted in processAction
        // Target must reveal a card
        gameState.waitingForCardReveal = {
          playerUid: targetUid,
          reason: 'assassinated',
        };
      }
      break;

    case 'exchange':
      // Draw 2 cards from deck
      if (gameState.deck.length >= 2) {
        const drawnCards = [gameState.deck.pop()!, gameState.deck.pop()!];
        const mustKeep = actor.cards.filter((c) => !c.revealed).length;
        gameState.waitingForExchange = {
          playerUid: actorUid,
          drawnCards,
        };

        // Send drawn cards only to the actor
        broadcastToPlayer(
          gameState.gameCode,
          actorUid,
          'exchange_cards_drawn',
          {
            cards: drawnCards,
            mustChoose: mustKeep,
          }
        );
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
