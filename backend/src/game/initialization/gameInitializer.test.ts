import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  initializeGameState,
} from '../initialization/gameInitializer';
import { IGame } from '../../db/models/Game.model';

describe('Game Initialization', () => {
  describe('createDeck', () => {
    it('should create a deck with 15 cards (3 of each type)', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(15);
    });

    it('should have exactly 3 of each card type', () => {
      const deck = createDeck();
      const cardCounts = deck.reduce(
        (acc, card) => {
          acc[card] = (acc[card] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(cardCounts['duke']).toBe(3);
      expect(cardCounts['assassin']).toBe(3);
      expect(cardCounts['ambassador']).toBe(3);
      expect(cardCounts['captain']).toBe(3);
      expect(cardCounts['contessa']).toBe(3);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle the deck (statistical test)', () => {
      const originalDeck = createDeck();
      const shuffledDeck = [...originalDeck];
      shuffleDeck(shuffledDeck);

      // Deck should still have same cards
      expect(shuffledDeck).toHaveLength(originalDeck.length);
      expect([...shuffledDeck].sort()).toEqual([...originalDeck].sort());

      // Deck should be in different order (this might occasionally fail due to randomness)
      // But statistically it's extremely unlikely to be in the same order
      const sameOrder = shuffledDeck.every(
        (card, idx) => card === originalDeck[idx]
      );
      expect(sameOrder).toBe(false);
    });
  });

  describe('initializeGameState', () => {
    it('should deal 2 cards to each player', () => {
      const mockGame = {
        players: [
          { uid: 'player1', userName: 'Alice' },
          { uid: 'player2', userName: 'Bob' },
          { uid: 'player3', userName: 'Charlie' },
        ],
      } as unknown as IGame;

      const { players } = initializeGameState(mockGame);

      expect(players).toHaveLength(3);
      expect(players[0].cards).toHaveLength(2);
      expect(players[1].cards).toHaveLength(2);
      expect(players[2].cards).toHaveLength(2);
    });

    it('should give each player 2 coins', () => {
      const mockGame = {
        players: [
          { uid: 'player1', userName: 'Alice' },
          { uid: 'player2', userName: 'Bob' },
        ],
      } as unknown as IGame;

      const { players } = initializeGameState(mockGame);

      expect(players[0].coins).toBe(2);
      expect(players[1].coins).toBe(2);
    });

    it('should have 9 cards remaining in deck for 3 players', () => {
      const mockGame = {
        players: [
          { uid: 'player1', userName: 'Alice' },
          { uid: 'player2', userName: 'Bob' },
          { uid: 'player3', userName: 'Charlie' },
        ],
      } as unknown as IGame;

      const { deck } = initializeGameState(mockGame);

      // 15 total cards - 6 dealt (3 players × 2 cards) = 9 remaining
      expect(deck).toHaveLength(9);
    });

    it('should mark all cards as not revealed', () => {
      const mockGame = {
        players: [{ uid: 'player1', userName: 'Alice' }],
      } as unknown as IGame;

      const { players } = initializeGameState(mockGame);

      expect(players[0].cards[0].revealed).toBe(false);
      expect(players[0].cards[1].revealed).toBe(false);
    });
  });
});
