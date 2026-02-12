import GameState from '../../db/models/GameState.model';
import { GameStateHelper } from '../gameState.schema';
import { CardType } from '../../constants/cardTypes';
import { broadcast } from '../../sse/lobbySSEManager';
import { shuffleDeck } from '../initialization/gameInitializer';
import { advanceTurn } from './actionHandler';

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
    throw new Error('Game state not found');
  }

  if (!gameState.waitingForExchange) {
    throw new Error('Not in exchange phase');
  }

  if (gameState.waitingForExchange.playerUid !== playerUid) {
    throw new Error('Not your turn to exchange');
  }

  // Validate player chose exactly 2 cards
  if (chosenCardIndices.length !== 2) {
    throw new Error('Must choose exactly 2 cards');
  }

  const helper = new GameStateHelper(gameState);
  const player = helper.getPlayerByUid(playerUid)!;

  // Get all available cards (current cards + drawn cards)
  const currentCards = player.cards.filter((c) => !c.revealed);
  const drawnCards = gameState.waitingForExchange.drawnCards;
  const allAvailableCards = [...currentCards.map((c) => c.card), ...drawnCards];

  // Validate indices
  for (const index of chosenCardIndices) {
    if (index < 0 || index >= allAvailableCards.length) {
      throw new Error('Invalid card index');
    }
  }

  // Check for duplicates
  if (new Set(chosenCardIndices).size !== chosenCardIndices.length) {
    throw new Error('Cannot choose the same card twice');
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
