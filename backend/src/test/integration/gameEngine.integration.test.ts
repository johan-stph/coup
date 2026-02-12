import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTestApp } from '../testApp';
import User from '../../db/models/User.model';
import Game from '../../db/models/Game.model';
import GameState from '../../db/models/GameState.model';

describe('Game Engine Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = createTestApp();

  // Test user IDs
  const player1 = 'test-player-1';
  const player2 = 'test-player-2';
  const player3 = 'test-player-3';

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await Game.deleteMany({});
    await GameState.deleteMany({});

    // Create test users
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

  describe('Game Creation and Initialization', () => {
    it('should create a new game', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' })
        .expect(201);

      expect(response.body).toHaveProperty('gameCode');
      expect(response.body.name).toBe('Test Game');
      expect(response.body.status).toBe('waiting');
      expect(response.body.players).toHaveLength(1);
      expect(response.body.players[0].uid).toBe(player1);
    });

    it('should allow players to join game', async () => {
      // Player 1 creates game
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      const gameCode = createRes.body.gameCode;

      // Player 2 joins
      const joinRes = await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .expect(200);

      expect(joinRes.body.players).toHaveLength(2);
      expect(joinRes.body.players[1].uid).toBe(player2);
    });

    it('should initialize game state when started', async () => {
      // Create game with 3 players
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

      // Start game
      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .expect(200);

      // Verify game state was created
      const gameState = await GameState.findOne({ gameCode });
      expect(gameState).toBeTruthy();
      expect(gameState!.players).toHaveLength(3);
      expect(gameState!.players[0].coins).toBe(2);
      expect(gameState!.players[0].cards).toHaveLength(2);
      expect(gameState!.deck.length).toBe(9); // 15 - 6 dealt cards
    });
  });

  describe('Basic Actions', () => {
    let gameCode: string;

    beforeEach(async () => {
      // Setup: Create and start a game
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);
    });

    it('should allow income action', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'income' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].coins).toBe(3); // 2 + 1
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });

    it('should reject action when not player turn', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ action: 'income' })
        .expect(403);
    });

    it('should allow foreign_aid action', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' })
        .expect(200);

      // Wait for action to resolve (no challenges/blocks)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.actionType).toBe('foreign_aid');
    });

    it('should require target for coup', async () => {
      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup' })
        .expect(400);
    });

    it('should allow coup with valid target', async () => {
      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player2 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[0].coins).toBe(0); // 7 - 7
      expect(gameState!.waitingForCardReveal).toBeTruthy();
      expect(gameState!.waitingForCardReveal!.playerUid).toBe(player2);
    });

    it('should enforce forced coup at 10+ coins', async () => {
      // Give player 1 10 coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 10 } }
      );

      // Try to do income instead of coup
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'income' })
        .expect(400);
    });
  });

  describe('Character Actions', () => {
    let gameCode: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);
    });

    it('should allow tax action (Duke)', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.actionType).toBe('tax');
      expect(gameState!.pendingAction!.canBeChallenged).toBe(true);
    });

    it('should allow steal action (Captain)', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.actionType).toBe('steal');
      expect(gameState!.pendingAction!.targetUid).toBe(player2);
    });

    it('should reject steal from player with no coins', async () => {
      // Remove player 2's coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player2 },
        { $set: { 'players.$.coins': 0 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'steal', targetUid: player2 })
        .expect(400);
    });

    it('should require 3 coins for assassinate', async () => {
      // Player 1 starts with 2 coins
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 })
        .expect(400);
    });

    it('should allow assassinate with enough coins', async () => {
      // Give player 1 enough coins
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 3 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'assassinate', targetUid: player2 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.actionType).toBe('assassinate');
    });

    it('should allow exchange action (Ambassador)', async () => {
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'exchange' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.actionType).toBe('exchange');
    });
  });

  describe('Challenges', () => {
    let gameCode: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);
    });

    it('should allow challenging a character action', async () => {
      // Player 1 declares tax
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'tax' });

      // Player 2 challenges
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      // Challenge should have been processed (either succeeded or failed)
      // The pending action should be cleared or resolved
      expect(gameState).toBeTruthy();
    });

    it('should reject challenge on non-challengeable action', async () => {
      // Player 1 declares income (not challengeable)
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'income' });

      // Player 2 tries to challenge (but income is already resolved)
      await request(app)
        .post(`/api/games/challenge/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ isBlockChallenge: false })
        .expect(409); // No action to challenge
    });
  });

  describe('Blocks', () => {
    let gameCode: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);
    });

    it('should allow blocking foreign_aid with Duke', async () => {
      // Player 1 declares foreign aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      // Wait for challenge window
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Player 2 blocks with Duke
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'duke' })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.pendingAction).toBeTruthy();
      expect(gameState!.pendingAction!.blockingPlayerUid).toBe(player2);
      expect(gameState!.pendingAction!.blockClaimedCard).toBe('duke');
    });

    it('should reject invalid blocking card', async () => {
      // Player 1 declares foreign aid
      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'foreign_aid' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Player 2 tries to block with Contessa (invalid for foreign_aid)
      await request(app)
        .post(`/api/games/block/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ blockingCard: 'contessa' })
        .expect(400);
    });
  });

  describe('Card Reveal', () => {
    let gameCode: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${player1}`)
        .send({ name: 'Test Game' });

      gameCode = createRes.body.gameCode;

      await request(app)
        .post(`/api/games/join/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`);

      await request(app)
        .post(`/api/games/start/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`);
    });

    it('should allow player to reveal card after being couped', async () => {
      // Give player 1 enough coins and coup player 2
      await GameState.updateOne(
        { gameCode, 'players.uid': player1 },
        { $set: { 'players.$.coins': 7 } }
      );

      await request(app)
        .post(`/api/games/action/${gameCode}`)
        .set('Authorization', `Bearer ${player1}`)
        .send({ action: 'coup', targetUid: player2 });

      // Player 2 reveals a card
      await request(app)
        .post(`/api/games/reveal-card/${gameCode}`)
        .set('Authorization', `Bearer ${player2}`)
        .send({ cardIndex: 0 })
        .expect(200);

      const gameState = await GameState.findOne({ gameCode });
      expect(gameState!.players[1].cards[0].revealed).toBe(true);
      expect(gameState!.waitingForCardReveal).toBeFalsy();
      expect(gameState!.currentPlayerIndex).toBe(1); // Turn advanced
    });
  });
});
