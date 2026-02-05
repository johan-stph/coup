import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import logger from '../utils/logger/logger';

const userSchema = z.object({
  uid: z.string(),
  email: z.string().email().optional(),
});

// Define the extended request type
export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Middleware to verify Firebase JWT tokens
 */
export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Try to get token from Authorization header
  let token = req.headers.authorization?.split('Bearer ')[1];
  // If not found, try to get token from query parameter
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    logger.warn('Authentication attempt without token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    // Verify the token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // throws error if the token does not match the schema
    userSchema.parse({
      uid: decodedToken.uid,
      email: decodedToken.email,
    });

    logger.info(`User ${decodedToken.email} authenticated successfully`, {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });

    // Attach the decoded token to the request object
    (req as AuthRequest).user = decodedToken;
    next();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Token verification failed', {
      error: errorMessage,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};
