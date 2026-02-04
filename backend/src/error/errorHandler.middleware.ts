import { ErrorRequestHandler, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from '../constants/http';
import { z } from 'zod';

import AppError from './AppError';
import logger from '../utils/logger/logger';

const handleZodError = (res: Response, err: z.ZodError): void => {
  const errors = err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  res.status(BAD_REQUEST).json({
    message: err.message,
    errors: errors,
  });
};

const errorHandler: ErrorRequestHandler = (err, req, res, _next): void => {
  logger.error(`Error occurred at PATH (${req.path}):`, err);
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ message: err.message, requestedUrl: err.requestedUrl });
    return;
  }
  if (err instanceof z.ZodError) {
    handleZodError(res, err);
    return;
  }
  res.status(INTERNAL_SERVER_ERROR).send('Internal Server Error');
};

export default errorHandler;