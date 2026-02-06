import { Router, Response } from 'express';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import { AuthRequest } from '../../auth/auth.middleware';
import User from '../../db/models/User.model';
import { CREATED, INTERNAL_SERVER_ERROR } from '../../constants/http';
import logger from '../../utils/logger/logger';

const router = Router();

const UserProfileSchema = registry.register(
  'UserProfile',
  z.object({
    _id: z.string(),
    userName: z.string(),
    email: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);

const GetUserProfileResponse = registry.register(
  'GetUserProfileResponse',
  z.object({
    exists: z.boolean(),
    profile: UserProfileSchema.nullable(),
  })
);

const CreateUserProfileBody = registry.register(
  'CreateUserProfileBody',
  z.object({
    userName: z.string().min(3).max(50),
  })
);

const CreateUserProfileResponse = registry.register(
  'CreateUserProfileResponse',
  z.object({
    profile: UserProfileSchema,
  })
);

// GET /api/user/profile - Check if user exists and return profile
registry.registerPath({
  method: 'get',
  path: '/api/user/profile',
  summary: 'Get user profile',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile or existence status',
      content: {
        'application/json': {
          schema: GetUserProfileResponse,
        },
      },
    },
  },
});

router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(firebaseUid);

    if (!user) {
      return res.json({
        exists: false,
        profile: null,
      });
    }

    return res.json({
      exists: true,
      profile: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

// POST /api/user/profile - Create user profile
registry.registerPath({
  method: 'post',
  path: '/api/user/profile',
  summary: 'Create user profile',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserProfileBody,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User profile created',
      content: {
        'application/json': {
          schema: CreateUserProfileResponse,
        },
      },
    },
  },
});

router.post('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;

    if (!firebaseUid || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userName } = req.body;

    if (!userName || userName.length < 3 || userName.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findById(firebaseUid);
    if (existingUser) {
      return res.status(400).json({ error: 'User profile already exists' });
    }

    const newUser = new User({
      _id: firebaseUid,
      userName,
      email,
    });

    await newUser.save();

    return res.status(CREATED).json({
      profile: {
        _id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error creating user profile:', error);
    return res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

export default router;
