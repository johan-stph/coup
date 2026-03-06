import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthRequest } from '../auth/auth.middleware';

/**
 * Mock authentication middleware for testing
 * Bypasses Firebase authentication and sets a test user
 */
export const mockAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Get uid from Authorization header or default to test-user-1
  const authHeader = req.headers.authorization;
  let uid = 'test-user-1';

  if (authHeader?.startsWith('Bearer ')) {
    // Extract uid from Bearer token (format: Bearer test-user-id)
    uid = authHeader.slice(7);
  }

  // Attach mock user to request
  (req as AuthRequest).user = {
    uid,
    email: `${uid}@test.com`,
    email_verified: true,
    auth_time: Date.now(),
    iat: Date.now(),
    exp: Date.now() + 3600000,
    firebase: {
      identities: {},
      sign_in_provider: 'custom',
    },
  } as DecodedIdToken;

  next();
};
