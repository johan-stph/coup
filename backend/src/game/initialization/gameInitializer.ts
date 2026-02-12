import { CARD_TYPES, CardType } from '../../constants/cardTypes';
import { GameStatePlayer } from '../../db/models/GameState.model';
import { IGame } from '../../db/models/Game.model';

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleDeck(deck: CardType[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/**
 * Create a full deck with 3 of each card type
 */
export function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const cardType of CARD_TYPES) {
    deck.push(cardType, cardType, cardType);
  }
  return deck;
}

/**
 * Initialize game state when game starts
 * - Creates and shuffles deck
 * - Deals 2 cards to each player
 * - Gives each player 2 coins
 */
export function initializeGameState(game: IGame): {
  players: GameStatePlayer[];
  deck: CardType[];
} {
  // Create and shuffle deck
  const deck = createDeck();
  shuffleDeck(deck);

  // Deal 2 cards to each player
  const players: GameStatePlayer[] = game.players.map((p) => ({
    uid: p.uid,
    userName: p.userName,
    coins: 2,
    cards: [
      { card: deck.pop()!, revealed: false },
      { card: deck.pop()!, revealed: false },
    ],
  }));

  return { players, deck };
}
