import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import GameState, { IGameState } from '../../db/models/GameState.model';
import { processChallenge, revealCard } from './challengeHandler';
import * as lobbySSEManager from '../../sse/lobbySSEManager';

// Mock the SSE manager
vi.mock('../../sse/lobbySSEManager', () => ({
  broadcast: vi.fn(),
  broadcastToPlayer: vi.fn(),
}));

// Mock the resolutionHandler
vi.mock('./resolutionHandler', () => ({
  scheduleAutoResolution: vi.fn(),
}));

describe('Challenge Card Reveal', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await GameState.deleteMany({});
  });

  describe('processChallenge - Action Challenge', () => {
    it('should set waitingForCardReveal when actor loses challenge', async () => {
      // Setup: Actor claims Duke but doesn't have it
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'tax',
          actorUid: 'actor',
          claimedCard: 'duke',
          canBeChallenged: true,
          canBeBlocked: false,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        actionResolvesAt: new Date(Date.now() + 8000),
      });

      await processChallenge('TEST123', 'challenger', false);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.waitingForCardReveal).toBeTruthy();
      expect(updatedState!.waitingForCardReveal!.playerUid).toBe('actor');
      expect(updatedState!.waitingForCardReveal!.reason).toBe('challenge_lost');
    });

    it('should set waitingForCardReveal when challenger loses challenge', async () => {
      // Setup: Actor claims Duke and DOES have it
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'ambassador', 'captain'],
        pendingAction: {
          actionType: 'tax',
          actorUid: 'actor',
          claimedCard: 'duke',
          canBeChallenged: true,
          canBeBlocked: false,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        actionResolvesAt: new Date(Date.now() + 8000),
      });

      await processChallenge('TEST123', 'challenger', false);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.waitingForCardReveal).toBeTruthy();
      expect(updatedState!.waitingForCardReveal!.playerUid).toBe('challenger');
      expect(updatedState!.waitingForCardReveal!.reason).toBe('challenge_lost');
    });
  });

  describe('processChallenge - Block Challenge', () => {
    it('should set waitingForCardReveal when blocker loses challenge', async () => {
      // Setup: Blocker claims Duke but doesn't have it
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'blocker',
            userName: 'Blocker',
            coins: 3,
            cards: [
              { card: 'contessa', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'foreign_aid',
          actorUid: 'actor',
          canBeChallenged: false,
          canBeBlocked: true,
          blockingPlayerUid: 'blocker',
          blockClaimedCard: 'duke',
          phase: 'awaiting_block_challenge',
          timestamp: new Date(),
        },
        actionResolvesAt: new Date(Date.now() + 8000),
      });

      await processChallenge('TEST123', 'challenger', true);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.waitingForCardReveal).toBeTruthy();
      expect(updatedState!.waitingForCardReveal!.playerUid).toBe('blocker');
      expect(updatedState!.waitingForCardReveal!.reason).toBe('challenge_lost');
    });

    it('should set waitingForCardReveal when block challenger loses', async () => {
      // Setup: Blocker claims Duke and DOES have it
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'blocker',
            userName: 'Blocker',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'contessa', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'assassin', 'captain'],
        pendingAction: {
          actionType: 'foreign_aid',
          actorUid: 'actor',
          canBeChallenged: false,
          canBeBlocked: true,
          blockingPlayerUid: 'blocker',
          blockClaimedCard: 'duke',
          phase: 'awaiting_block_challenge',
          timestamp: new Date(),
        },
        actionResolvesAt: new Date(Date.now() + 8000),
      });

      await processChallenge('TEST123', 'challenger', true);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.waitingForCardReveal).toBeTruthy();
      expect(updatedState!.waitingForCardReveal!.playerUid).toBe('challenger');
      expect(updatedState!.waitingForCardReveal!.reason).toBe('challenge_lost');
    });
  });

  describe('revealCard - After Challenge Loss', () => {
    it('should cancel action and advance turn when actor loses challenge', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'tax',
          actorUid: 'actor',
          claimedCard: 'duke',
          canBeChallenged: true,
          canBeBlocked: false,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'actor',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'actor', 0);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[0].cards[0].revealed).toBe(true);
      expect(updatedState!.waitingForCardReveal).toBeFalsy();
      expect(updatedState!.pendingAction).toBeFalsy();
      expect(updatedState!.currentPlayerIndex).toBe(1);

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'action_cancelled',
        expect.objectContaining({ action: 'tax' })
      );
    });

    it('should continue to block phase when challenger loses and action is blockable', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'foreign_aid',
          actorUid: 'actor',
          canBeChallenged: false,
          canBeBlocked: true,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'challenger',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'challenger', 1);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[1].cards[1].revealed).toBe(true);
      expect(updatedState!.waitingForCardReveal).toBeFalsy();
      expect(updatedState!.pendingAction).toBeTruthy();
      expect(updatedState!.pendingAction!.phase).toBe('awaiting_block');
      expect(updatedState!.actionResolvesAt).toBeTruthy();

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'block_window_open',
        expect.any(Object)
      );
    });

    it('should execute action when challenger loses and action is not blockable', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'tax',
          actorUid: 'actor',
          claimedCard: 'duke',
          canBeChallenged: true,
          canBeBlocked: false,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'challenger',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'challenger', 0);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[1].cards[0].revealed).toBe(true);
      expect(updatedState!.players[0].coins).toBe(8); // 5 + 3 from tax
      expect(updatedState!.waitingForCardReveal).toBeFalsy();
      expect(updatedState!.pendingAction).toBeFalsy();
      expect(updatedState!.currentPlayerIndex).toBe(1);

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'action_completed',
        expect.objectContaining({ action: 'tax' })
      );
    });

    it('should execute action when blocker loses block challenge', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'blocker',
            userName: 'Blocker',
            coins: 3,
            cards: [
              { card: 'contessa', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'foreign_aid',
          actorUid: 'actor',
          canBeChallenged: false,
          canBeBlocked: true,
          blockingPlayerUid: 'blocker',
          blockClaimedCard: 'duke',
          phase: 'awaiting_block_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'blocker',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'blocker', 0);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[1].cards[0].revealed).toBe(true);
      expect(updatedState!.players[0].coins).toBe(7); // 5 + 2 from foreign_aid
      expect(updatedState!.waitingForCardReveal).toBeFalsy();
      expect(updatedState!.pendingAction).toBeFalsy();
      expect(updatedState!.currentPlayerIndex).toBe(1);

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'action_completed',
        expect.objectContaining({ action: 'foreign_aid' })
      );
    });

    it('should block action and advance turn when block challenger loses', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'blocker',
            userName: 'Blocker',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'contessa', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'assassin', 'captain'],
        pendingAction: {
          actionType: 'foreign_aid',
          actorUid: 'actor',
          canBeChallenged: false,
          canBeBlocked: true,
          blockingPlayerUid: 'blocker',
          blockClaimedCard: 'duke',
          phase: 'awaiting_block_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'challenger',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'challenger', 1);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[2].cards[1].revealed).toBe(true);
      expect(updatedState!.players[0].coins).toBe(5); // No change, blocked
      expect(updatedState!.waitingForCardReveal).toBeFalsy();
      expect(updatedState!.pendingAction).toBeFalsy();
      expect(updatedState!.currentPlayerIndex).toBe(1);

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'action_blocked',
        expect.objectContaining({ blockingPlayer: 'blocker' })
      );
    });

    it('should detect player elimination when all cards revealed', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: true }, // Already revealed
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        pendingAction: {
          actionType: 'tax',
          actorUid: 'actor',
          claimedCard: 'duke',
          canBeChallenged: true,
          canBeBlocked: false,
          phase: 'awaiting_challenge',
          timestamp: new Date(),
        },
        waitingForCardReveal: {
          playerUid: 'actor',
          reason: 'challenge_lost',
        },
      });

      await revealCard('TEST123', 'actor', 0);

      const updatedState = await GameState.findOne({ gameCode: 'TEST123' });
      expect(updatedState!.players[0].cards[0].revealed).toBe(true);
      expect(updatedState!.players[0].cards[1].revealed).toBe(true);

      expect(lobbySSEManager.broadcast).toHaveBeenCalledWith(
        'TEST123',
        'player_eliminated',
        expect.objectContaining({
          playerUid: 'actor',
          userName: 'Actor',
        })
      );
    });

    it('should reject revealing already revealed card', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: true },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'challenger',
            userName: 'Challenger',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        waitingForCardReveal: {
          playerUid: 'actor',
          reason: 'challenge_lost',
        },
      });

      await expect(revealCard('TEST123', 'actor', 0)).rejects.toThrow(
        'Card already revealed'
      );
    });

    it('should reject invalid card index', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        waitingForCardReveal: {
          playerUid: 'actor',
          reason: 'challenge_lost',
        },
      });

      await expect(revealCard('TEST123', 'actor', 2)).rejects.toThrow(
        'Invalid card index'
      );
      await expect(revealCard('TEST123', 'actor', -1)).rejects.toThrow(
        'Invalid card index'
      );
    });

    it('should reject reveal from wrong player', async () => {
      const gameState = await GameState.create({
        gameCode: 'TEST123',
        players: [
          {
            uid: 'actor',
            userName: 'Actor',
            coins: 5,
            cards: [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
          {
            uid: 'other',
            userName: 'Other',
            coins: 3,
            cards: [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        deck: ['ambassador', 'duke', 'captain'],
        waitingForCardReveal: {
          playerUid: 'actor',
          reason: 'challenge_lost',
        },
      });

      await expect(revealCard('TEST123', 'other', 0)).rejects.toThrow(
        'Not your turn to reveal'
      );
    });
  });
});
