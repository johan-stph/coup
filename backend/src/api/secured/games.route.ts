import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import { AuthRequest } from '../../auth/auth.middleware';
import Game, { GAME_STATUSES } from '../../db/models/Game.model';
import GameState from '../../db/models/GameState.model';
import User from '../../db/models/User.model';
import {
  BAD_REQUEST,
  CONFLICT,
  CREATED,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from '../../constants/http';
import { GAME_ACTIONS } from '../../constants/gameActions';
import { CARD_TYPES } from '../../constants/cardTypes';
import logger from '../../utils/logger/logger';
import {
  addClient,
  removeClient,
  closeClient,
  broadcast,
  broadcastToPlayer,
} from '../../sse/lobbySSEManager';
import { initializeGameState } from '../../game/initialization/gameInitializer';
import { processAction } from '../../game/actions/actionHandler';
import {
  processChallenge,
  revealCard,
} from '../../game/actions/challengeHandler';
import { processBlock } from '../../game/actions/blockHandler';
import { processExchangeCards } from '../../game/actions/exchangeHandler';
import { ValidationError } from '../../game/validation/validators';

const router = Router();

const PlayerSchema = z.object({
  uid: z.string(),
  userName: z.string(),
});

const GameSchema = registry.register(
  'Game',
  z.object({
    id: z.string(),
    name: z.string(),
    gameCode: z.string(),
    players: z.array(PlayerSchema),
    createdBy: z.string(),
    status: z.enum(GAME_STATUSES),
    createdAt: z.string(),
  })
);

const GamesListResponse = registry.register(
  'GamesListResponse',
  z.object({
    games: z.array(GameSchema),
  })
);

const CreateGameBody = registry.register(
  'CreateGameBody',
  z.object({
    name: z.string(),
  })
);

// GET /api/games
registry.registerPath({
  method: 'get',
  path: '/api/games',
  summary: 'List all games',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'List of games',
      content: {
        'application/json': {
          schema: GamesListResponse,
        },
      },
    },
    401: { description: 'No token provided' },
    403: { description: 'Invalid or expired token' },
  },
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const games = await Game.find();
    res.json({
      games: games.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        gameCode: g.gameCode,
        players: g.players,
        createdBy: g.createdBy,
        status: g.status,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch games:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/games
registry.registerPath({
  method: 'post',
  path: '/api/games',
  summary: 'Create a new game',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGameBody,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Game created',
      content: {
        'application/json': {
          schema: GameSchema,
        },
      },
    },
    401: { description: 'No token provided' },
    403: { description: 'Invalid or expired token' },
    404: { description: 'User profile not found' },
  },
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = CreateGameBody.parse(req.body);
    const uid = req.user!.uid;

    const user = await User.findById(uid);
    if (!user) {
      res.status(NOT_FOUND).json({ error: 'User profile not found' });
      return;
    }

    const game = new Game({
      name,
      status: 'waiting',
      players: [{ uid, userName: user.userName }],
      createdBy: uid,
    });
    await game.save();

    res.status(CREATED).json({
      id: game._id.toString(),
      name: game.name,
      gameCode: game.gameCode,
      players: game.players,
      createdBy: game.createdBy,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    logger.error('Failed to create game:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to create game' });
  }
});

// POST /api/games/join/:gameCode
registry.registerPath({
  method: 'post',
  path: '/api/games/join/{gameCode}',
  summary: 'Join an existing game',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      gameCode: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Joined game successfully',
      content: {
        'application/json': {
          schema: GameSchema,
        },
      },
    },
    404: { description: 'Game not found / User profile not found' },
    409: {
      description: 'Game is not in waiting status / Player already in game',
    },
  },
});

router.post('/join/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    const game = await Game.findOne({ gameCode });

    if (!game) {
      res.status(NOT_FOUND).json({ error: 'Game not found' });
      return;
    }

    if (game.status !== 'waiting') {
      res.status(CONFLICT).json({ error: 'Game is not in waiting status' });
      return;
    }

    if (game.players.some((p) => p.uid === uid)) {
      res.status(CONFLICT).json({ error: 'You are already in this game' });
      return;
    }

    const user = await User.findById(uid);
    if (!user) {
      res.status(NOT_FOUND).json({ error: 'User profile not found' });
      return;
    }

    game.players.push({ uid, userName: user.userName });
    await game.save();

    broadcast(gameCode as string, 'player_joined', { players: game.players });

    res.json({
      id: game._id.toString(),
      name: game.name,
      gameCode: game.gameCode,
      players: game.players,
      createdBy: game.createdBy,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to join game:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to join game' });
  }
});

// POST /api/games/leave/:gameCode
registry.registerPath({
  method: 'post',
  path: '/api/games/leave/{gameCode}',
  summary: 'Leave a game',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      gameCode: z.string(),
    }),
  },
  responses: {
    200: { description: 'Left game successfully' },
    404: { description: 'Game not found' },
    409: { description: 'You are not in this game' },
  },
});

router.post('/leave/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    const game = await Game.findOne({ gameCode });

    if (!game) {
      res.status(NOT_FOUND).json({ error: 'Game not found' });
      return;
    }

    const playerIndex = game.players.findIndex((p) => p.uid === uid);
    if (playerIndex === -1) {
      res.status(CONFLICT).json({ error: 'You are not in this game' });
      return;
    }

    game.players.splice(playerIndex, 1);
    await game.save();

    // Close the leaving player's SSE connection
    closeClient(gameCode as string, uid);

    // Broadcast updated player list to remaining players
    broadcast(gameCode as string, 'player_left', { players: game.players });

    res.json({ message: 'Left game successfully' });
  } catch (error) {
    logger.error('Failed to leave game:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to leave game' });
  }
});

// POST /api/games/start/:gameCode
registry.registerPath({
  method: 'post',
  path: '/api/games/start/{gameCode}',
  summary: 'Start a game (admin only)',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      gameCode: z.string(),
    }),
  },
  responses: {
    200: { description: 'Game started successfully' },
    403: { description: 'Only the lobby admin can start the game' },
    404: { description: 'Game not found' },
    409: { description: 'Game is not in waiting status' },
  },
});

router.post('/start/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    const game = await Game.findOne({ gameCode });

    if (!game) {
      res.status(NOT_FOUND).json({ error: 'Game not found' });
      return;
    }

    if (game.createdBy !== uid) {
      res
        .status(FORBIDDEN)
        .json({ error: 'Only the lobby admin can start the game' });
      return;
    }

    if (game.status !== 'waiting') {
      res.status(CONFLICT).json({ error: 'Game is not in waiting status' });
      return;
    }

    // Initialize game state
    const { players, deck } = initializeGameState(game);

    const gameState = new GameState({
      gameCode: game.gameCode,
      players,
      deck,
      currentPlayerIndex: 0,
    });
    await gameState.save();

    // Update game status
    game.status = 'in_progress';
    await game.save();

    // Broadcast game started
    broadcast(gameCode as string, 'game_started', { status: 'in_progress' });

    // Send private card information to each player
    for (const player of players) {
      broadcastToPlayer(gameCode as string, player.uid, 'game_initialized', {
        yourCards: player.cards,
        players: players.map((p) => ({
          uid: p.uid,
          userName: p.userName,
          coins: p.coins,
          cardCount: p.cards.length,
        })),
        currentPlayerUid: players[0].uid,
      });
    }

    // Broadcast turn started for first player
    broadcast(gameCode as string, 'turn_started', {
      currentPlayerUid: players[0].uid,
      currentPlayerUserName: players[0].userName,
      mustCoup: false,
    });

    res.json({ message: 'Game started successfully' });
  } catch (error) {
    logger.error('Failed to start game:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to start game' });
  }
});

// POST /api/games/action/:gameCode
const ActionBody = z.object({
  action: z.enum(GAME_ACTIONS),
  targetUid: z.string().optional(),
});

router.post('/action/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = ActionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(BAD_REQUEST).json({ error: parsed.error.issues });
      return;
    }

    const { action, targetUid } = parsed.data;
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    await processAction(gameCode as string, uid, action, targetUid);

    res.json({ message: 'Action processed' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error('Failed to perform action:', error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to perform action' });
  }
});

// POST /api/games/challenge/:gameCode
const ChallengeBody = z.object({
  isBlockChallenge: z.boolean().default(false),
});

router.post('/challenge/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = ChallengeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(BAD_REQUEST).json({ error: parsed.error.issues });
      return;
    }

    const { isBlockChallenge } = parsed.data;
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    await processChallenge(gameCode as string, uid, isBlockChallenge);

    res.json({ message: 'Challenge processed' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error('Failed to process challenge:', error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to process challenge' });
  }
});

// POST /api/games/block/:gameCode
const BlockBody = z.object({
  blockingCard: z.enum(CARD_TYPES),
});

router.post('/block/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = BlockBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(BAD_REQUEST).json({ error: parsed.error.issues });
      return;
    }

    const { blockingCard } = parsed.data;
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    await processBlock(gameCode as string, uid, blockingCard);

    res.json({ message: 'Block processed' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error('Failed to process block:', error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to process block' });
  }
});

// POST /api/games/reveal-card/:gameCode
const RevealCardBody = z.object({
  cardIndex: z.number().min(0).max(1),
});

router.post(
  '/reveal-card/:gameCode',
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = RevealCardBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(BAD_REQUEST).json({ error: parsed.error.issues });
        return;
      }

      const { cardIndex } = parsed.data;
      const { gameCode } = req.params;
      const uid = req.user!.uid;

      await revealCard(gameCode as string, uid, cardIndex);

      res.json({ message: 'Card revealed' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Failed to reveal card:', error);
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to reveal card' });
    }
  }
);

// POST /api/games/exchange-cards/:gameCode
const ExchangeCardsBody = z.object({
  chosenCardIndices: z.array(z.number().min(0)).length(2),
});

router.post(
  '/exchange-cards/:gameCode',
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = ExchangeCardsBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(BAD_REQUEST).json({ error: parsed.error.issues });
        return;
      }

      const { chosenCardIndices } = parsed.data;
      const { gameCode } = req.params;
      const uid = req.user!.uid;

      await processExchangeCards(gameCode as string, uid, chosenCardIndices);

      res.json({ message: 'Exchange completed' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Failed to exchange cards:', error);
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to exchange cards' });
    }
  }
);

// GET /api/games/:gameCode/events (SSE)
router.get('/:gameCode/events', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const uid = req.user!.uid;

    const game = await Game.findOne({ gameCode });

    if (!game) {
      res.status(NOT_FOUND).json({ error: 'Game not found' });
      return;
    }

    if (!game.players.some((p) => p.uid === uid)) {
      res
        .status(FORBIDDEN)
        .json({ error: 'You are not a player in this game' });
      return;
    }

    // Set SSE headers
    res.writeHead(OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial state
    const initialMessage = `event: player_joined\ndata: ${JSON.stringify({ players: game.players })}\n\n`;
    res.write(initialMessage);

    addClient(gameCode as string, uid, res);

    // Keepalive every 30s
    const keepalive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30_000);

    req.on('close', () => {
      clearInterval(keepalive);
      removeClient(gameCode as string, uid, res);
    });
  } catch (error) {
    logger.error('Failed to setup SSE:', error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to setup event stream' });
  }
});

export default router;
