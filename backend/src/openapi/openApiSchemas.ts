import { z } from 'zod';
import registry from './openApiRegistry.js';

export const AppErrorResponse = registry.register(
  'AppErrorResponse',
  z.object({
    message: z.string(),
    requestedUrl: z.string(),
  })
);

export const UnauthorizedError = registry.register(
  'UnauthorizedError',
  z.object({
    error: z.string(),
  })
);

export const ForbiddenError = registry.register(
  'ForbiddenError',
  z.object({
    error: z.string(),
  })
);

export const ZodValidationError = registry.register(
  'ZodValidationError',
  z.object({
    message: z.string(),
    errors: z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      })
    ),
  })
);

export const InternalServerError = registry.register(
  'InternalServerError',
  z.string()
);
