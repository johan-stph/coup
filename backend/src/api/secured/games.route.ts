import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry.js';
import { AuthRequest } from '../../auth/auth.middleware.js';
import Game, { GAME_STATUSES } from '../../db/models/Game.model.js';
import { CREATED, INTERNAL_SERVER_ERROR } from '../../constants/http.js';

const router = Router();

const GameSchema = registry.register(
  'Game',
  z.object({
    id: z.string(),
    name: z.string(),
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
        players: g.players,
        status: g.status,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch {
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to fetch games' });
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

    const game = await Game.create({
      name,
      status: 'waiting',
      players: [req.user!.uid],
    });

    res.status(CREATED).json({
      id: game._id.toString(),
      name: game.name,
      players: game.players,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to create game' });
  }
});

export default router;
