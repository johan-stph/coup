import { describe, it, expect } from 'vitest';
import { IGameState } from '../../db/models/GameState.model';
import {
  ValidationError,
  validateTurn,
  validatePlayerAlive,
  validateResources,
  validateTarget,
  validateNoPendingAction,
} from './validators';

describe('Validation Layer', () => {
  describe('validateTurn', () => {
    it("should allow action when it is player's turn", () => {
      const gameState = {
        players: [
          { uid: 'player1', userName: 'Alice', coins: 2, cards: [] },
          { uid: 'player2', userName: 'Bob', coins: 2, cards: [] },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validateTurn(gameState, 'player1')).not.toThrow();
    });

    it("should throw error when it is not player's turn", () => {
      const gameState = {
        players: [
          { uid: 'player1', userName: 'Alice', coins: 2, cards: [] },
          { uid: 'player2', userName: 'Bob', coins: 2, cards: [] },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validateTurn(gameState, 'player2')).toThrow(ValidationError);
      expect(() => validateTurn(gameState, 'player2')).toThrow(
        'It is not your turn'
      );
    });
  });

  describe('validatePlayerAlive', () => {
    it('should allow action when player has unrevealed cards', () => {
      const gameState = {
        players: [
          {
            uid: 'player1',
            userName: 'Alice',
            coins: 2,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'assassin', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validatePlayerAlive(gameState, 'player1')).not.toThrow();
    });

    it('should throw error when player has all cards revealed', () => {
      const gameState = {
        players: [
          {
            uid: 'player1',
            userName: 'Alice',
            coins: 2,
            cards: [
              { card: 'duke', revealed: true },
              { card: 'assassin', revealed: true },
            ],
          },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validatePlayerAlive(gameState, 'player1')).toThrow(
        ValidationError
      );
      expect(() => validatePlayerAlive(gameState, 'player1')).toThrow(
        'You have been eliminated'
      );
    });
  });

  describe('validateResources', () => {
    it('should allow income with any coin amount', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 0, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateResources('income', gameState, 'player1')
      ).not.toThrow();
    });

    it('should enforce forced coup at 10+ coins', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 10, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validateResources('income', gameState, 'player1')).toThrow(
        ValidationError
      );
      expect(() => validateResources('income', gameState, 'player1')).toThrow(
        'You must coup when you have 10 or more coins'
      );
    });

    it('should allow coup at 10+ coins', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 10, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateResources('coup', gameState, 'player1')
      ).not.toThrow();
    });

    it('should require 7 coins for coup', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 6, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() => validateResources('coup', gameState, 'player1')).toThrow(
        ValidationError
      );
      expect(() => validateResources('coup', gameState, 'player1')).toThrow(
        'Insufficient coins'
      );
    });

    it('should require 3 coins for assassinate', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 2, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateResources('assassinate', gameState, 'player1')
      ).toThrow(ValidationError);
      expect(() =>
        validateResources('assassinate', gameState, 'player1')
      ).toThrow('Insufficient coins');
    });
  });

  describe('validateTarget', () => {
    it('should require target for coup', () => {
      const gameState = {
        players: [
          { uid: 'player1', userName: 'Alice', coins: 7, cards: [] },
          { uid: 'player2', userName: 'Bob', coins: 2, cards: [] },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateTarget('coup', gameState, 'player1', undefined)
      ).toThrow(ValidationError);
      expect(() =>
        validateTarget('coup', gameState, 'player1', undefined)
      ).toThrow('This action requires a target');
    });

    it('should reject self-targeting', () => {
      const gameState = {
        players: [{ uid: 'player1', userName: 'Alice', coins: 7, cards: [] }],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateTarget('coup', gameState, 'player1', 'player1')
      ).toThrow(ValidationError);
      expect(() =>
        validateTarget('coup', gameState, 'player1', 'player1')
      ).toThrow('You cannot target yourself');
    });

    it('should reject targeting eliminated players', () => {
      const gameState = {
        players: [
          {
            uid: 'player1',
            userName: 'Alice',
            coins: 7,
            cards: [{ card: 'duke', revealed: false }],
          },
          {
            uid: 'player2',
            userName: 'Bob',
            coins: 2,
            cards: [
              { card: 'assassin', revealed: true },
              { card: 'captain', revealed: true },
            ],
          },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateTarget('coup', gameState, 'player1', 'player2')
      ).toThrow(ValidationError);
      expect(() =>
        validateTarget('coup', gameState, 'player1', 'player2')
      ).toThrow('Target player has been eliminated');
    });

    it('should reject stealing from player with no coins', () => {
      const gameState = {
        players: [
          {
            uid: 'player1',
            userName: 'Alice',
            coins: 2,
            cards: [{ card: 'captain', revealed: false }],
          },
          {
            uid: 'player2',
            userName: 'Bob',
            coins: 0,
            cards: [{ card: 'duke', revealed: false }],
          },
        ],
        currentPlayerIndex: 0,
      } as unknown as IGameState;

      expect(() =>
        validateTarget('steal', gameState, 'player1', 'player2')
      ).toThrow(ValidationError);
      expect(() =>
        validateTarget('steal', gameState, 'player1', 'player2')
      ).toThrow('Target has no coins to steal');
    });
  });

  describe('validateNoPendingAction', () => {
    it('should allow action when no pending action', () => {
      const gameState = {
        pendingAction: undefined,
      } as unknown as IGameState;

      expect(() => validateNoPendingAction(gameState)).not.toThrow();
    });

    it('should throw error when pending action exists', () => {
      const gameState = {
        pendingAction: {
          actionType: 'tax',
          actorUid: 'player1',
          phase: 'awaiting_challenge',
          canBeChallenged: true,
          canBeBlocked: false,
          timestamp: new Date(),
        },
      } as unknown as IGameState;

      expect(() => validateNoPendingAction(gameState)).toThrow(ValidationError);
      expect(() => validateNoPendingAction(gameState)).toThrow(
        'Another action is pending resolution'
      );
    });
  });
});
