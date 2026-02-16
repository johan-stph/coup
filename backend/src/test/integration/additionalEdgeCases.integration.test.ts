import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTestApp } from '../testApp';
import User from '../../db/models/User.model';
import Game from '../../db/models/Game.model';
import GameState from '../../db/models/GameState.model';

/**
 * ADDITIONAL EDGE CASES
 * 
 * These tests cover edge cases that are important for robust frontend behavior
 * but were not covered in the existing test suites.
 */
describe('Additional Edge Cases for Frontend', () => {
  let mongoServer: MongoMemoryServer;
  const app = createTestApp();

  const player1 = 'test-player-1';
  const player2 = 'test-player-2';
  const player3 = 'test-player-3';
  const player4 = 'test-player-4';

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
    await User.create({
      _id: player4,
      userName: 'Diana',
      email: 'diana@test.com',
    });
  });

  describe('Deck Exhaustion Edge Cases', () => {
    it('should handle exchange when deck has less than 2 cards', async () => {
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

      // Deplete the deck to only 1 card
      await GameState.updateOne(
        { gameCode },
        { $set: { deck: ['duke'] } }
      );

      // Player 1 tries to exchange
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'exchange' });

      // Let challenge and block windows pass
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      const { autoResolveAction } = await import('../../game/actions/resolutionHandler');
      await autoResolveAction(gameCode);

      // Move to block phase if needed
      let gameState = await GameState.findOne({ gameCode });
      if (gameState!.pendingAction?.phase === 'awaiting_block') {
        await GameState.updateOne(
          { gameCode },
          { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
        );
        await autoResolveAction(gameCode);
      }

      // Should not be in exchange phase (not enough cards)
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForExchange).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn should advance
    });

    it('should handle exchange when deck is completely empty', async () => {
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

      // Empty the deck
      await GameState.updateOne(
        { gameCode },
        { $set: { deck: [] } }
      );

      // Player 1 tries to exchange
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'exchange' })
        .expect(200);

      // Verify pendingAction was created
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
    });
  });

  describe('Turn Advancement with Multiple Eliminations', () => {
    it('should skip over multiple eliminated players to find next active player', async () => {
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
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player4}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);

      // Eliminate player 2 and 3
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: true },
              { card: 'captain', revealed: true },
            ],
          },
        }
      );

      await GameState.updateOne(
        { gameCode, 'players.uid': player3 },
        {
          $set: {
            'players.$.cards': [
              { card: 'assassin', revealed: true },
              { card: 'contessa', revealed: true },
            ],
          },
        }
      );

      // Player 1 takes income (simple action that advances turn)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'income' })
        .expect(200);

      // Verify turn advanced to player 4 (skipping dead player 2 and 3)
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.currentPlayerIndex).toBe(3); // Player 4 is at index 3
      expect(gameState!.players[3].uid).toBe(player4);
    });

    it('should correctly identify game over when only one player remains', async () => {
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

      // Eliminate player 2 (has one card revealed already)
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: true },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Give player 1 enough coins for coup
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      // Player 1 coups player 2's last card
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player2 });

      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 1 });

      // After player 2 is eliminated, it's player 3's turn
      // Player 3 takes income
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ action: 'income' });

      // Now it's player 1's turn again - coup player 3's first card
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player3 });

      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 0 });

      // After player 3 reveals one card, it's their turn
      // Player 3 takes income
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ action: 'income' });

      // Now coup player 3's last card
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player3 });

      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 1 }); // Reveal second card (first is already revealed)

      // Verify game is finished
      const game = await Game.findOne({ gameCode });
      expect(game!.status).toBe('finished');
    });
  });

  describe('Steal Edge Cases', () => {
    it('should steal exactly 1 coin when target has only 1 coin', async () => {
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

      // Set player 2 to have exactly 1 coin
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        { $set: { 'players.$.coins': 1 } }
      );

      // Player 1 declares steal
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Let windows pass
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      const { autoResolveAction } = await import('../../game/actions/resolutionHandler');
      await autoResolveAction(gameCode);

      let gameState = await GameState.findOne({ gameCode });
      if (gameState!.pendingAction?.phase === 'awaiting_block') {
        await GameState.updateOne(
          { gameCode },
          { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
        );
        await autoResolveAction(gameCode);
      }

      // Verify steal took only 1 coin
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].coins).toBe(0);
      expect(gameState!.players[0].coins).toBe(3); // 2 + 1
    });
  });

  describe('Invalid Phase Transitions', () => {
    it('should reject challenge after challenge window has closed', async () => {
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

      // Player 1 declares tax
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Manually expire the challenge window
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      // Player 2 tries to challenge (should fail - window closed)
      const response = await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Challenge window has closed');
    });

    it('should reject block when not in blocking phase', async () => {
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

      // Try to block without any pending action
      const response = await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('No action to challenge or block');
    });

    it('should reject multiple blocks on the same action', async () => {
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

      // Player 1 declares foreign_aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Player 2 blocks
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' })
        .expect(200);

      // Player 3 tries to also block (should fail)
      const response = await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ blockingCard: 'duke' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Not in blocking phase');
    });
  });

  describe('Self-Targeting Validation', () => {
    it('should reject self-targeting for coup', async () => {
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

      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      // Try to coup self
      const response = await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot target yourself');
    });

    it('should reject self-targeting for steal', async () => {
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

      // Try to steal from self
      const response = await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot target yourself');
    });

    it('should reject self-targeting for assassinate', async () => {
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

      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      // Try to assassinate self
      const response = await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot target yourself');
    });
  });

  describe('Auto-Resolution Comprehensive Tests', () => {
    it('should auto-resolve challenge window and move to block phase', async () => {
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

      // Player 1 declares steal (challengeable and blockable)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Force challenge window to expire
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      const { autoResolveAction } = await import('../../game/actions/resolutionHandler');
      await autoResolveAction(gameCode);

      // Should move to block phase
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction!.phase).toBe('awaiting_block');
      expect(gameState!.actionResolvesAt).toBeTruthy();

      // Force block window to expire
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      await autoResolveAction(gameCode);

      // Action should execute (steal)
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
      expect(gameState!.players[0].coins).toBe(4); // 2 + 2 from steal
    });

    it('should auto-resolve block phase and execute non-blockable action', async () => {
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

      // Player 1 declares tax (challengeable but not blockable)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Force challenge window to expire
      await GameState.updateOne(
        { gameCode },
        { $set: { actionResolvesAt: new Date(Date.now() - 1000) } }
      );

      const { autoResolveAction } = await import('../../game/actions/resolutionHandler');
      await autoResolveAction(gameCode);

      // Action should execute immediately (no block phase for tax)
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1);
      expect(gameState!.players[0].coins).toBe(5); // 2 + 3 from tax
    });
  });

  describe('Exchange Card Selection Edge Cases', () => {
    it('should reject exchange with duplicate card indices', async () => {
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

      // Manually set exchange state
      await GameState.updateOne(
        { gameCode },
        {
          $set: {
            waitingForExchange: {
              playerUid: player1,
              drawnCards: ['duke', 'assassin'],
            },
          },
        }
      );

      // Try to choose the same card twice
      const response = await request(app)
        .post(`/api/games/exchange-cards/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ chosenCardIndices: [0, 0] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot choose the same card twice');
    });

    it('should reject exchange with out-of-bounds indices', async () => {
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

      // Manually set exchange state
      await GameState.updateOne(
        { gameCode },
        {
          $set: {
            waitingForExchange: {
              playerUid: player1,
              drawnCards: ['duke', 'assassin'],
            },
          },
        }
      );

      // Try to choose an invalid index (4 available cards: 0-3)
      const response = await request(app)
        .post(`/api/games/exchange-cards/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ chosenCardIndices: [0, 5] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid card index');
    });
  });
});
