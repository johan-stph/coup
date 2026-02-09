import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import { AuthRequest } from '../../auth/auth.middleware';
import Purchase from '../../db/models/Purchase.model';
import { INTERNAL_SERVER_ERROR, OK } from '../../constants/http';
import logger from '../../utils/logger/logger';

const router = Router();

const PurchaseSchema = registry.register(
  'Purchase',
  z.object({
    asset: z.string(),
    createdAt: z.string(),
  })
);

// GET /api/purchases - Get purchases for authenticated user
registry.registerPath({
  method: 'get',
  path: '/api/purchases',
  summary: 'Get purchases for authenticated user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'List of purchases',
      content: {
        'application/json': {
          schema: z.array(PurchaseSchema),
        },
      },
    },
  },
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const purchases = await Purchase.find({ uid: firebaseUid });

    return res.status(OK).json(
      purchases.map((p) => ({
        asset: p.asset,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    logger.error('Error fetching purchases:', error);
    return res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
});

export default router;