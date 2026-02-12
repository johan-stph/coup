import '../openapi/extendZod';
import express, { Express } from 'express';
import cors from 'cors';
import gamesRouter from '../api/secured/games.route';
import userRouter from '../api/secured/user.route';
import { mockAuthMiddleware } from './mockAuth';

/**
 * Create an Express app for testing with mocked authentication
 */
export function createTestApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Use mock auth middleware instead of real Firebase auth
  app.use(mockAuthMiddleware);

  // Mount routes
  app.use('/api/games', gamesRouter);
  app.use('/api/user', userRouter);

  return app;
}
