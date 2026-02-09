import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import { AuthRequest } from '../../auth/auth.middleware';
import Avatar from '../../db/models/Avatar.model';
import { BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '../../constants/http';
import { PURCHASABLE_ASSETS } from '../../constants/purchasableAssets';
import Purchase from '../../db/models/Purchase.model';
import logger from '../../utils/logger/logger';

const router = Router();

const AvatarSchema = registry.register(
  'Avatar',
  z.object({
    accessory: z.string().nullable(),
    character: z.string().nullable(),
    background: z.string().nullable(),
  })
);

const PutAvatarBody = registry.register(
  'PutAvatarBody',
  z.object({
    accessory: z.string().nullable(),
    character: z.string().nullable(),
    background: z.string().nullable(),
  })
);

// GET /api/avatar - Get saved avatar selections
registry.registerPath({
  method: 'get',
  path: '/api/avatar',
  summary: 'Get avatar selections',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'Avatar selections',
      content: {
        'application/json': {
          schema: AvatarSchema,
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

    const avatar = await Avatar.findById(firebaseUid);

    return res.status(OK).json({
      accessory: avatar?.accessory ?? null,
      character: avatar?.character ?? null,
      background: avatar?.background ?? null,
    });
  } catch (error) {
    logger.error('Error fetching avatar:', error);
    return res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
});

// PUT /api/avatar - Upsert avatar selections
registry.registerPath({
  method: 'put',
  path: '/api/avatar',
  summary: 'Save avatar selections',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: PutAvatarBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Saved avatar selections',
      content: {
        'application/json': {
          schema: AvatarSchema,
        },
      },
    },
  },
});

router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = PutAvatarBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid avatar data' });
    }

    const { accessory, character, background } = parsed.data;

    const selectedAssets = [accessory, character, background].filter(
      (asset): asset is string => asset !== null && PURCHASABLE_ASSETS.has(asset)
    );

    if (selectedAssets.length > 0) {
      const purchaseCount = await Purchase.countDocuments({
        uid: firebaseUid,
        asset: { $in: selectedAssets },
      });

      if (purchaseCount !== selectedAssets.length) {
        return res.status(FORBIDDEN).json({ error: 'Asset not purchased' });
      }
    }

    const avatar = await Avatar.findByIdAndUpdate(
      firebaseUid,
      { accessory, character, background },
      { upsert: true, new: true }
    );

    return res.status(OK).json({
      accessory: avatar.accessory,
      character: avatar.character,
      background: avatar.background,
    });
  } catch (error) {
    logger.error('Error saving avatar:', error);
    return res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
});

export default router;
