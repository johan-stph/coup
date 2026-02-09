import './openapi/extendZod';
import express from 'express';
import cors from 'cors';
import { initializeFirebase } from './auth/firebaseSetup';
import testRoutes from './api/unsecured/test.route';
import { NOT_FOUND } from './constants/http';
import AppError from './error/AppError';
import errorHandler from './error/errorHandler.middleware';

import { PORT } from './constants/environmentVariables';
import logger from './utils/logger/logger';
import { connectToDatabase } from './db/connection';
import { verifyFirebaseToken } from './auth/auth.middleware';
import openApiRouter from './openapi/openApiRouter';
import gamesRoutes from './api/secured/games.route';
import userRoutes from './api/secured/user.route';
import avatarRoutes from './api/secured/avatar.route';
import purchaseRoutes from './api/secured/purchase.route';

// Initialize Firebase Admin SDK
initializeFirebase();

const app = express();

app.use(
  cors({
    origin: '*', // Allow requests from any origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
//STRIPE HAS TO BE DONE HERE; AS JSON AND STRIPE ARE VISCIOUS ENEMIES

// Parse JSON bodies
app.use(express.json());

app.use('/api/unsecured', testRoutes);
app.use('/api', openApiRouter);

app.use(verifyFirebaseToken);

app.use('/api/games', gamesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/purchases', purchaseRoutes);

// catch all for undefined routes
app.use((req, _res, next) => {
  next(
    new AppError(
      `Cannot ${req.method} ${req.originalUrl}`,
      NOT_FOUND,
      req.originalUrl
    )
  );
});

// Error handling middleware
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await connectToDatabase();

    // Then start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
      logger.info(`API docs available at http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    logger.error('Failed to start the server:', err);
    process.exit(1);
  }
}

startServer();
