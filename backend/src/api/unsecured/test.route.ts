import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import registry from '../../openapi/openApiRegistry';
import {
  NODE_ENV,
  FIREBASE_WEB_API_KEY,
} from '../../constants/environmentVariables';

const router = Router();

const HelloResponse = registry.register(
  'HelloResponse',
  z.object({
    message: z.string(),
    timestamp: z.string(),
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/unsecured/hello',
  summary: 'Health-check / greeting endpoint',
  responses: {
    200: {
      description: 'Successful greeting',
      content: {
        'application/json': {
          schema: HelloResponse,
        },
      },
    },
  },
});

router.get('/hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello World',
    timestamp: new Date().toISOString(),
  });
});

if (NODE_ENV === 'development') {
  const DevTokenResponse = registry.register(
    'DevTokenResponse',
    z.object({
      idToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.string(),
    })
  );

  registry.registerPath({
    method: 'get',
    path: '/api/unsecured/dev-token/{uid}',
    summary: 'Get a Firebase ID token for testing (dev only)',
    request: {
      params: z.object({
        uid: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Firebase ID token ready to use as Bearer token',
        content: {
          'application/json': {
            schema: DevTokenResponse,
          },
        },
      },
    },
  });

  router.get('/dev-token/:uid', async (req: Request, res: Response) => {
    const uid = Array.isArray(req.params.uid)
      ? req.params.uid[0]
      : req.params.uid;

    const customToken = await admin.auth().createCustomToken(uid);

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    const data = await response.json();
    res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  });
}

export default router;
