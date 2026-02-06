import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import { AuthRequest } from '../../auth/auth.middleware';
import Game, { GAME_STATUSES } from '../../db/models/Game.model';
import { CONFLICT, CREATED, INTERNAL_SERVER_ERROR, NOT_FOUND } from '../../constants/http';
import logger from '../../utils/logger/logger';

const router = Router();

const GameSchema = registry.register(
  'Game',
  z.object({
    id: z.string(),
    name: z.string(),
    gameCode: z.string(),
    players: z.array(z.string()),
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
  },
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = CreateGameBody.parse(req.body);

    const game = new Game({
      name,
      status: 'waiting',
      players: [req.user!.uid],
    });
    await game.save();

    res.status(CREATED).json({
      id: game._id.toString(),
      name: game.name,
      gameCode: game.gameCode,
      players: game.players,
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
    404: { description: 'Game not found' },
    409: { description: 'Game is not in waiting status / Player already in game' },
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

    if (game.players.includes(uid)) {
      res.status(CONFLICT).json({ error: 'You are already in this game' });
      return;
    }

    game.players.push(uid);
    await game.save();

    res.json({
      id: game._id.toString(),
      name: game.name,
      gameCode: game.gameCode,
      players: game.players,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to join game:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Failed to join game' });
  }
});

export default router;
