import GameState from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { broadcast } from '../../sse/lobbySSEManager';
import { shuffleDeck } from '../initialization/gameInitializer';
import { advanceTurn } from './actionHandler';
import { ValidationError } from '../validation/validators';

/**
 * Handle Ambassador card exchange selection
 */
export async function processExchangeCards(
  gameCode: string,
  playerUid: string,
  chosenCardIndices: number[]
): Promise<void> {
  const gameState = await GameState.findOne({ gameCode });
  if (!gameState) {
    throw new ValidationError('Game state not found', 404);
  }

  if (!gameState.waitingForExchange) {
    throw new ValidationError('Not in exchange phase', 409);
  }

  if (gameState.waitingForExchange.playerUid !== playerUid) {
    throw new ValidationError('Not your turn to exchange', 403);
  }

  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(playerUid)!;

  // Get all available cards (current cards + drawn cards)
  const currentCards = player.cards.filter((c) => !c.revealed);
  const drawnCards = gameState.waitingForExchange.drawnCards;
  const allAvailableCards = [...currentCards.map((c) => c.card), ...drawnCards];

  // Validate player chose exactly as many cards as they currently hold
  const mustKeep = currentCards.length;
  if (chosenCardIndices.length !== mustKeep) {
    throw new ValidationError(
      `Must choose exactly ${mustKeep} card${mustKeep !== 1 ? 's' : ''}`,
      400
    );
  }

  // Validate indices
  for (const index of chosenCardIndices) {
    if (index < 0 || index >= allAvailableCards.length) {
      throw new ValidationError('Invalid card index', 400);
    }
  }

  // Check for duplicates
  if (new Set(chosenCardIndices).size !== chosenCardIndices.length) {
    throw new ValidationError('Cannot choose the same card twice', 400);
  }

  // Get chosen cards
  const chosenCards = chosenCardIndices.map((i) => allAvailableCards[i]);

  // Get remaining cards to return to deck
  const remainingCards = allAvailableCards.filter(
    (_, i) => !chosenCardIndices.includes(i)
  );

  // Update player's cards
  let cardIndex = 0;
  for (const card of player.cards) {
    if (!card.revealed) {
      if (cardIndex < chosenCards.length) {
        card.card = chosenCards[cardIndex];
        cardIndex++;
      }
    }
  }

  // Return remaining cards to deck and shuffle
  gameState.deck.push(...remainingCards);
  shuffleDeck(gameState.deck);

  // Clear waiting state
  gameState.waitingForExchange = undefined;

  // Broadcast exchange completed
  broadcast(gameCode, 'exchange_completed', {
    playerUid,
  });

  // Advance turn
  await advanceTurn(gameState);
  await gameState.save();
}
