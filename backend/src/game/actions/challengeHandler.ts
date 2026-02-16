import GameState, { IGameState } from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { CardType } from '../../constants/cardTypes';
import {
  validatePendingAction,
  validateChallengeTiming,
  validateCanChallenge,
  validateNotActor,
  validatePlayerAlive,
  ValidationError,
} from '../validation/validators';
import { broadcast } from '../../sse/lobbySSEManager';
import { shuffleDeck } from '../initialization/gameInitializer';
import { executeAction, advanceTurn } from './actionHandler';
import { scheduleAutoResolution } from './resolutionHandler';

/**
 * Handle a challenge to an action or block
 */
export async function processChallenge(
  gameCode: string,
  challengerUid: string,
  isBlockChallenge: boolean = false
): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new Error('Game state not found');
  }

  validatePendingAction(gameState);
  validatePlayerAlive(gameState, challengerUid);
  validateNotActor(gameState, challengerUid);
  validateChallengeTiming(gameState);

  const helper = new GameStateHelper(gameState);
  const challenger = helper.getPlayerByUid(challengerUid)!;

  if (isBlockChallenge) {
    // Challenge the block
    if (!gameState.pendingAction!.blockingPlayerUid) {
      throw new Error('No block to challenge');
    }

    const blockingPlayerUid = gameState.pendingAction!.blockingPlayerUid;
    const claimedCard = gameState.pendingAction!.blockClaimedCard!;

    broadcast(gameCode, 'challenge_declared', {
      challengerUid,
      challengerUserName: challenger.userName,
      targetUid: blockingPlayerUid,
      challengeType: 'block',
    });

    // Resolve challenge
    const result = await resolveChallenge(
      gameState,
      challengerUid,
      blockingPlayerUid,
      claimedCard
    );

    if (result.challengeSucceeded) {
      // Block failed, execute the original action after card reveal
      broadcast(gameCode, 'challenge_succeeded', {
        challengerUid,
        loserUid: blockingPlayerUid,
      });
    } else {
      // Block succeeded, action is blocked after card reveal
      broadcast(gameCode, 'challenge_failed', {
        challengerUid,
        loserUid: challengerUid,
      });
    }

    // Save state and wait for card reveal
    // The continuation will be handled in revealCard()
    await gameState.save();
  } else {
    // Challenge the action
    const pendingAction = gameState.pendingAction!;
    validateCanChallenge(pendingAction.actionType);

    const actorUid = pendingAction.actorUid;
    const claimedCard = pendingAction.claimedCard!;

    broadcast(gameCode, 'challenge_declared', {
      challengerUid,
      challengerUserName: challenger.userName,
      targetUid: actorUid,
      challengeType: 'action',
    });

    // Resolve challenge
    const result = await resolveChallenge(
      gameState,
      challengerUid,
      actorUid,
      claimedCard
    );

    if (result.challengeSucceeded) {
      // Action cancelled after card reveal
      broadcast(gameCode, 'challenge_succeeded', {
        challengerUid,
        loserUid: actorUid,
      });
    } else {
      // Action continues after card reveal
      broadcast(gameCode, 'challenge_failed', {
        challengerUid,
        loserUid: challengerUid,
      });
    }

    // Save state and wait for card reveal
    // The continuation will be handled in revealCard()
    await gameState.save();
  }
}

/**
 * Resolve a challenge - check if the challenged player has the claimed card
 */
async function resolveChallenge(
  gameState: IGameState,
  challengerUid: string,
  challengedUid: string,
  claimedCard: CardType
): Promise<{ challengeSucceeded: boolean }> {
  const helper = new GameStateHelper(gameState);
  const challenged = helper.getPlayerByUid(challengedUid)!;

  // Check if challenged player has the card
  const cardIndex = challenged.cards.findIndex(
    (c) => !c.revealed && c.card === claimedCard
  );
  const hasCard = cardIndex !== -1;

  if (hasCard) {
    // Challenge FAILED - challenged player has the card
    // 1. Shuffle card back and draw new one
    gameState.deck.push(claimedCard);
    shuffleDeck(gameState.deck);
    challenged.cards[cardIndex] = {
      card: gameState.deck.pop()!,
      revealed: false,
    };

    broadcast(gameState.gameCode, 'card_exchanged', {
      playerUid: challengedUid,
      reason: 'successful_defense',
    });

    // 2. Challenger must choose which card to reveal
    gameState.waitingForCardReveal = {
      playerUid: challengerUid,
      reason: 'challenge_lost',
    };

    return { challengeSucceeded: false };
  } else {
    // Challenge SUCCEEDED - challenged player doesn't have the card
    gameState.waitingForCardReveal = {
      playerUid: challengedUid,
      reason: 'challenge_lost',
    };

    return { challengeSucceeded: true };
  }
}

/**
 * Force a player to lose a card (reveal one)
 */
export async function loseCard(
  gameState: IGameState,
  playerUid: string
): Promise<void> {
  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(playerUid)!;

  // Find first unrevealed card
  const unrevealedCard = player.cards.find((c) => !c.revealed);

  if (unrevealedCard) {
    unrevealedCard.revealed = true;

    const remainingCards = player.cards.filter((c) => !c.revealed).length;

    broadcast(gameState.gameCode, 'card_revealed', {
      playerUid,
      card: unrevealedCard.card,
      cardsRemaining: remainingCards,
    });

    // Check if player is eliminated
    if (remainingCards === 0) {
      broadcast(gameState.gameCode, 'player_eliminated', {
        playerUid,
        userName: player.userName,
      });
    }
  }
}

/**
 * Handle manual card reveal (when player chooses which card to reveal)
 */
export async function revealCard(
  gameCode: string,
  playerUid: string,
  cardIndex: number
): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new ValidationError('Game state not found', 404);
  }

  if (!gameState.waitingForCardReveal) {
    throw new ValidationError('Not waiting for card reveal', 409);
  }

  if (gameState.waitingForCardReveal.playerUid !== playerUid) {
    throw new ValidationError('Not your turn to reveal', 403);
  }

  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(playerUid)!;

  // Validate card index
  if (cardIndex < 0 || cardIndex >= player.cards.length) {
    throw new ValidationError('Invalid card index', 400);
  }

  const card = player.cards[cardIndex];
  if (card.revealed) {
    throw new ValidationError('Card already revealed', 400);
  }

  // Reveal the card
  card.revealed = true;

  const remainingCards = player.cards.filter((c) => !c.revealed).length;

  broadcast(gameCode, 'card_revealed', {
    playerUid,
    card: card.card,
    cardsRemaining: remainingCards,
  });

  // Check if player is eliminated
  if (remainingCards === 0) {
    broadcast(gameCode, 'player_eliminated', {
      playerUid,
      userName: player.userName,
    });
  }

  const revealReason = gameState.waitingForCardReveal.reason;

  // Clear waiting state
  gameState.waitingForCardReveal = undefined;

  // Handle continuation based on reason
  if (revealReason === 'challenge_lost' && gameState.pendingAction) {
    // Determine what happened based on who lost the challenge
    const pendingAction = gameState.pendingAction;
    const loserIsActor = playerUid === pendingAction.actorUid;
    const loserIsBlocker =
      pendingAction.blockingPlayerUid &&
      playerUid === pendingAction.blockingPlayerUid;

    if (loserIsActor) {
      // Actor lost challenge - action is cancelled
      broadcast(gameCode, 'action_cancelled', {
        action: pendingAction.actionType,
      });

      await advanceTurn(gameState);
    } else if (loserIsBlocker) {
      // Blocker lost challenge - execute the original action
      await executeAction(
        gameState,
        pendingAction.actionType,
        pendingAction.actorUid,
        pendingAction.targetUid
      );

      if (!gameState.waitingForCardReveal && !gameState.waitingForExchange) {
        await advanceTurn(gameState);
      }

      broadcast(gameCode, 'action_completed', {
        actorUid: pendingAction.actorUid,
        action: pendingAction.actionType,
      });
    } else {
      // Challenger lost challenge - action continues
      if (pendingAction.blockingPlayerUid) {
        // This was a block challenge that failed - block succeeds
        broadcast(gameCode, 'action_blocked', {
          blockingPlayer: pendingAction.blockingPlayerUid,
        });

        await advanceTurn(gameState);
      } else {
        // This was an action challenge that failed - move to block phase or execute
        if (pendingAction.canBeBlocked) {
          pendingAction.phase = 'awaiting_block';
          const BLOCK_WINDOW_MS = 8000;
          gameState.actionResolvesAt = new Date(Date.now() + BLOCK_WINDOW_MS);

          await gameState.save();

          broadcast(gameCode, 'block_window_open', {
            action: pendingAction.actionType,
            resolvesAt: gameState.actionResolvesAt,
          });

          scheduleAutoResolution(gameCode, BLOCK_WINDOW_MS);
          return; // Don't save again or advance turn
        } else {
          // Execute action
          await executeAction(
            gameState,
            pendingAction.actionType,
            pendingAction.actorUid,
            pendingAction.targetUid
          );

          if (
            !gameState.waitingForCardReveal &&
            !gameState.waitingForExchange
          ) {
            await advanceTurn(gameState);
          }

          broadcast(gameCode, 'action_completed', {
            actorUid: pendingAction.actorUid,
            action: pendingAction.actionType,
          });
        }
      }
    }
  } else {
    // For couped/assassinated, just advance turn
    await advanceTurn(gameState);
  }

  await gameState.save();
}
