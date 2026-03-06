import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTestApp } from '../testApp';
import User from '../../db/models/User.model';
import Game from '../../db/models/Game.model';
import GameState from '../../db/models/GameState.model';

/**
 * CRITICAL MISSING TEST CASES
 *
 * These tests cover scenarios that are essential for frontend functionality
 * but were not previously tested in the integration test suite.
 */
describe('Critical Missing Test Cases for Frontend', () => {
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

  describe('Ambassador Exchange Flow', () => {
    it('should enter waitingForExchange state after successful Ambassador exchange defense', async () => {
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

      // Set player 1 to HAVE Ambassador
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'ambassador', revealed: false },
              { card: 'captain', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares exchange (claims Ambassador)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'exchange' });

      // Player 2 challenges (will lose because player1 has Ambassador)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false });

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      // Verify state: player 1 should now be in exchange phase
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForExchange).toBeTruthy();
      expect(gameState!.waitingForExchange!.playerUid).toBe(player1);
      expect(gameState!.waitingForExchange!.drawnCards).toHaveLength(2);
    });

    it('should allow player to choose which cards to keep during exchange', async () => {
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

      // Player chooses cards at indices 0 and 2 (first original card + first drawn card)
      await request(app)
        .post(`/api/games/exchange-cards/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ chosenCardIndices: [0, 2] })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForExchange).toBeUndefined();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });
  });

  describe('Steal Blocking Scenarios', () => {
    it('should allow blocking steal with Captain', async () => {
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

      // Player 1 declares steal
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Player 2 blocks with Captain
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'captain' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction!.blockingPlayerUid).toBe(player2);
      expect(gameState!.pendingAction!.blockClaimedCard).toBe('captain');
    });

    it('should allow blocking steal with Ambassador', async () => {
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

      // Player 1 declares steal
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Player 2 blocks with Ambassador
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'ambassador' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction!.blockingPlayerUid).toBe(player2);
      expect(gameState!.pendingAction!.blockClaimedCard).toBe('ambassador');
    });

    it('should handle challenge on Captain block of steal', async () => {
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

      // Set player 2 to NOT have Captain
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: false },
              { card: 'contessa', revealed: false },
            ],
          },
        }
      );

      // Player 1 declares steal
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 });

      // Player 2 blocks with Captain (doesn't have it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'captain' });

      // Player 3 challenges the block
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Verify player 2 must reveal card
      let gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);

      // Player 2 reveals card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      // Verify steal was executed
      gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].coins).toBeGreaterThan(2); // Gained from steal
      expect(gameState!.players[1].coins).toBeLessThan(2); // Lost from steal
    });
  });

  describe('Assassination + Contessa Blocking', () => {
    it('should allow blocking assassinate with Contessa', async () => {
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

      // Player 1 declares assassinate
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 });

      // Player 2 blocks with Contessa
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'contessa' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction!.blockingPlayerUid).toBe(player2);
      expect(gameState!.pendingAction!.blockClaimedCard).toBe('contessa');
      expect(gameState!.players[0].coins).toBe(0); // Coins already deducted
    });

    it('should execute assassination when Contessa block is successfully challenged', async () => {
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

      // Set player 2 to NOT have Contessa
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

      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      // Player 1 declares assassinate
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 });

      // Player 2 blocks with Contessa (doesn't have it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'contessa' });

      // Player 3 challenges the block
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Player 2 reveals card (loses block challenge)
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 });

      // Verify player 2 must now reveal another card (assassination executes)
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
      expect(gameState!.waitingForCardReveal!.reason).toBe('assassinated');
    });

    it('should block assassination when Contessa block challenge fails', async () => {
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

      // Set player 2 to HAVE Contessa
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

      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      // Player 1 declares assassinate
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 });

      // Player 2 blocks with Contessa (has it)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'contessa' });

      // Player 3 challenges the block (will lose)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ isBlockChallenge: true });

      // Player 3 reveals card (loses challenge)
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ cardIndex: 0 });

      // Verify assassination was blocked (player 2 has both cards)
      const gameState = await GameState.findOne({ gameCode });
      expect(
        gameState!.players[1].cards.filter((c) => !c.revealed)
      ).toHaveLength(2);
      expect(gameState!.waitingForCardReveal).toBeUndefined();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });
  });

  describe('Game Over Scenarios', () => {
    it('should detect game over when only one player remains', async () => {
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

      // Set player 2 to have one card revealed
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

      // Player 1 coups player 2
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player2 });

      // Player 2 reveals last card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 1 });

      // Verify game is over
      const game = await Game.findOne({ gameCode });
      expect(game!.status).toBe('finished');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject exchange with wrong number of cards', async () => {
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

      // Try to choose 3 cards (should fail)
      await request(app)
        .post(`/api/games/exchange-cards/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ chosenCardIndices: [0, 1, 2] })
        .expect(400); // Bad request - wrong number of cards
    });

    it('should reject action when player is eliminated', async () => {
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

      // Set player 1 as eliminated
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        {
          $set: {
            'players.$.cards': [
              { card: 'duke', revealed: true },
              { card: 'captain', revealed: true },
            ],
          },
        }
      );

      // Try to take action as eliminated player
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'income' })
        .expect(403);
    });

    it('should reject block from non-target player', async () => {
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

      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      // Player 1 declares assassinate on player 2
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 });

      // Player 3 (not the target) tries to block with Contessa
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player3}`)
        .send({ blockingCard: 'contessa' })
        .expect(403);
    });
  });
});
