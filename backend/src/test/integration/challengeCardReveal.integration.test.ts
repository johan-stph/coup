import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTestApp } from '../testApp';
import User from '../../db/models/User.model';
import Game from '../../db/models/Game.model';
import GameState from '../../db/models/GameState.model';

describe('Challenge Card Reveal Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = createTestApp();

  const player1 = 'test-player-1';
  const player2 = 'test-player-2';
  const player3 = 'test-player-3';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Game.deleteMany({});
    await GameState.deleteMany({});

    await User.create({
      _id: player1,
      userName: 'Alice',
      email: 'alice@test.com',
    });
    await User.create({
      _id: player2,
      userName: 'Bob',
      email: 'bob@test.com',
    });
    await User.create({
      _id: player3,
      userName: 'Charlie',
      email: 'charlie@test.com',
    });
  });

  describe('Action Challenge - Actor Loses', () => {
    it('should require actor to choose card when challenged and loses', async () => {
      // Create and start game
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax (claims Duke)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' })
        .expect(200);

      // Player 2 challenges
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false })
        .expect(200);

      // Verify state: waiting for player 1 to reveal card
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player1);
      expect(gameState!.waitingForCardReveal!.reason).toBe('challenge_lost');

      // Player 1 reveals first card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 0 })
        .expect(200);

      // Verify outcome: card revealed, action cancelled, turn advanced
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].cards[0].revealed).toBe(true);
      expect(gameState!.players[0].coins).toBe(2); // No coins gained
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
    });

    it('should allow actor to choose which card to reveal', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to have specific cards
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax, player 2 challenges
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 1 chooses to reveal second card instead
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 1 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].cards[0].revealed).toBe(false);
      expect(gameState!.players[0].cards[1].revealed).toBe(true);
      expect(gameState!.players[0].cards[1].card).toBe('captain');
    });
  });

  describe('Action Challenge - Challenger Loses', () => {
    it('should require challenger to choose card when loses', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to HAVE Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax (claims Duke)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Player 2 challenges (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Verify state: waiting for player 2 to reveal card
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
      expect(gameState!.waitingForCardReveal!.reason).toBe('challenge_lost');

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 })
        .expect(200);

      // Verify outcome: card revealed, action executed (tax), turn advanced
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.players[0].coins).toBe(5); // 2 + 3 from tax
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
    });

    it('should move to block phase when challenger loses on blockable action', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Give player1 3+ coins and Captain card
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.coins': 3,
            'players.$.cards': [
              { card: 'captain', revealed: false },
              { card: 'duke', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares steal (claims Captain)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Player 2 challenges (will lose because player1 has Captain)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      // Verify state: moved to awaiting_block phase
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.phase).toBe('awaiting_block');
      expect(gameState!.actionResolvesAt).toBeTruthy();
    });
  });

  describe('Block Challenge - Blocker Loses', () => {
    it('should require blocker to choose card when loses block challenge', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 2 to NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'contessa', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks with Duke (doesn't have it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      // Player 3 challenges the block
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Verify state: waiting for player 2 to reveal card
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
      expect(gameState!.waitingForCardReveal!.reason).toBe('challenge_lost');

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 })
        .expect(200);

      // Verify outcome: card revealed, action executed (foreign_aid), turn advanced
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.players[0].coins).toBe(4); // 2 + 2 from foreign_aid
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
    });
  });

  describe('Block Challenge - Block Challenger Loses', () => {
    it('should require block challenger to choose card when loses', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 2 to HAVE Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks with Duke (has it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      // Player 3 challenges the block (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Verify state: waiting for player 3 to reveal card
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player3);
      expect(gameState!.waitingForCardReveal!.reason).toBe('challenge_lost');

      // Player 3 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 1 })
        .expect(200);

      // Verify outcome: card revealed, action blocked (no coins), turn advanced
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[2].cards[1].revealed).toBe(true);
      expect(gameState!.players[0].coins).toBe(2); // No change, blocked
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
    });
  });

  describe('Player Elimination', () => {
    it('should eliminate player when revealing last card', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to have one card already revealed
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: true },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax, player 2 challenges
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 1 reveals last card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 1 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].cards[0].revealed).toBe(true);
      expect(gameState!.players[0].cards[1].revealed).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should reject reveal when not waiting for card reveal', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Try to reveal card without any pending card reveal
      const response = await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 0 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Not waiting for card reveal');
    });

    it('should reject reveal from wrong player', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax, player 2 challenges
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Verify player 1 should reveal
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player1);

      // Player 2 tries to reveal card (but it's player 1's turn)
      const response = await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not your turn to reveal');
    });

    it('should reject invalid card index', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Try with invalid card index (out of bounds - caught by Zod validation)
      const response = await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 5 });

      expect(response.status).toBe(400);
      // Zod returns error as an array of issues
      expect(Array.isArray(response.body.error)).toBe(true);
    });

    it('should reject revealing already revealed card', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to have one revealed card and NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: true },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Try to reveal already revealed card
      const response = await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Card already revealed');
    });
  });

  describe('Assassination Card Reveal', () => {
    it('should still work for assassination (existing functionality)', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Give player 1 enough coins for assassination
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      // Player 1 assassinates player 2
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 });

      // Wait for challenge and block windows to auto-resolve (8s + 8s = 16s)
      // For testing, we can manually trigger resolution by updating the resolves time
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      // Import and call auto-resolution
      const { autoResolveAction } =
        await import('../../game/actions/resolutionHandler');

      // Resolve challenge window
      await autoResolveAction(gameCode);

      // Check if moved to block phase
      let gameState = await GameState.findOne({ gameCode });
      if (gameState!.pendingAction?.phase === 'awaiting_block') {
        // Update resolve time and resolve block window
        await GameState.updateOne(
          { gameCode },
          { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
        );
        await autoResolveAction(gameCode);
      }

      // Now check that waiting for card reveal
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
      expect(gameState!.waitingForCardReveal!.reason).toBe('assassinated');

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 })
        .expect(200);

      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
    });
  });

  describe('Duke Card Exchange Edge Cases', () => {
    it('should properly exchange card when actor successfully defends Duke tax claim', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to HAVE Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Save original deck state
      let gameState = await GameState.findOne({ gameCode });
      const originalDeckSize = gameState!.deck.length;

      // Player 1 declares tax (claims Duke)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Player 2 challenges (will lose because player1 has Duke)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Check that Duke was shuffled back and new card drawn
      gameState = await GameState.findOne({ gameCode });

      // Card might be different (unless drew Duke again from shuffled deck)
      expect(gameState!.deck.length).toBe(originalDeckSize); // Same size (removed one, added one)

      // Verify challenger must reveal
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
      expect(gameState!.waitingForCardReveal!.reason).toBe('challenge_lost');

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      // Verify action executed after card reveal
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].coins).toBe(5); // 2 + 3 from tax
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
    });

    it('should properly exchange card when blocker successfully defends Duke block claim', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 2 to HAVE Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
        }
      );

      // Save original deck state
      let gameState = await GameState.findOne({ gameCode });
      const originalDeckSize = gameState!.deck.length;

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks with Duke (has it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      // Player 3 challenges the block (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Check that Duke was shuffled back and new card drawn
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.deck.length).toBe(originalDeckSize);

      // Verify block challenger must reveal
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player3);

      // Player 3 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 1 });

      // Verify action was blocked (no coins gained)
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].coins).toBe(2); // No change, blocked
      expect(gameState!.players[2].cards[1].revealed).toBe(true);
    });
  });

  describe('Elimination Timing Edge Cases', () => {
    it('should eliminate blocker when revealing last card after losing Duke block challenge', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 2 to have one card revealed and NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'contessa', revealed: true },
              { card: 'ambassador', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks with Duke (doesn't have it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      // Player 3 challenges the block
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Player 2 reveals last card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 1 })
        .expect(200);

      // Verify player 2 is eliminated
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.players[1].cards[1].revealed).toBe(true);

      // Verify action executed (foreign_aid succeeded)
      expect(gameState!.players[0].coins).toBe(4); // 2 + 2 from foreign_aid
      expect(gameState!.currentPlayerIndex).toBe(2); // Skip eliminated player 1
    });

    it('should handle elimination when challenger loses and reveals last card', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to HAVE Duke and player 2 to have one card revealed
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: true },
              { card: 'contessa', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax (claims Duke)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Player 2 challenges (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 2 reveals last card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 1 })
        .expect(200);

      // Verify player 2 is eliminated and tax executed
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.players[1].cards[1].revealed).toBe(true);
      expect(gameState!.players[0].coins).toBe(5); // 2 + 3 from tax
    });
  });

  describe('State Cleanup Verification', () => {
    it('should properly clear pendingAction after Duke challenge resolution', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 1 to NOT have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares tax, player 2 challenges
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 1 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ cardIndex: 0 });

      const gameState = await GameState.findOne({ gameCode });

      // Verify all action state is cleared
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.actionResolvesAt).toBeFalsy();
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });

    it('should properly clear state after successful Duke block defense', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set player 2 to HAVE Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'ambassador', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks with Duke
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      // Player 3 challenges the block (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Player 3 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 0 });

      const gameState = await GameState.findOne({ gameCode });

      // Verify all state is cleared
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.actionResolvesAt).toBeFalsy();
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });
  });

  describe('Deck Consistency Edge Cases', () => {
    it('should maintain correct deck count through multiple Duke exchanges', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Set both players to have Duke
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'assassin', revealed: false },
            ],
          },
        }
      );

      let gameState = await GameState.findOne({ gameCode });
      const initialDeckSize = gameState!.deck.length;
      const initialTotalCards = initialDeckSize + 4; // 4 cards in player hands

      // Player 1 declares tax, player 2 challenges and loses
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      gameState = await GameState.findOne({ gameCode });
      const midDeckSize = gameState!.deck.length;

      // Duke exchange is push+pop (net zero), so deck remains at initialDeckSize
      expect(midDeckSize).toBe(initialDeckSize); // Deck unchanged after Duke exchange
      expect(midDeckSize + 4).toBe(initialTotalCards); // Total cards conserved (deck + all 4 player cards)

      // Now player 2's turn - they declare foreign_aid, player 1 blocks with Duke
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ action: 'foreign_aid' });

      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ blockingCard: 'duke' });

      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: true });

      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 1 });

      gameState = await GameState.findOne({ gameCode });
      const finalDeckSize = gameState!.deck.length;

      // Player 2 now has both cards revealed (eliminated)
      // Duke exchanges don't change deck size (push+pop = net zero)
      expect(finalDeckSize).toBe(initialDeckSize); // Deck unchanged after two Duke exchanges
      expect(finalDeckSize + 4).toBe(initialTotalCards); // Total cards conserved
    });
  });

  describe('Coin Threshold Edge Cases', () => {
    it('should not allow tax action when player has 10+ coins', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Give player 1 exactly 10 coins (forced to coup)
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.coins': 10,
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Try to declare tax (should fail)
      const response = await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Should be rejected because player must coup at 10 coins
      expect(response.status).toBe(409);
      expect(response.body.error).toContain('must coup');
    });

    it('should not allow foreign_aid action when player has 10+ coins', async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Give player 1 exactly 10 coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 10 } }
      );

      // Try to declare foreign_aid (should fail)
      const response = await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('must coup');
    });
  });
});
