import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log completo del error con contexto
  console.error('❌ [ERROR HANDLER]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : undefined,
      'content-type': req.headers['content-type'],
    },
  });

  if (err instanceof ZodError) {
    console.error('❌ [VALIDATION ERROR]', err.errors);
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    console.error(`❌ [APP ERROR] ${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
};
