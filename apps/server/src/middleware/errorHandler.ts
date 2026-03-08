// Global error handling middleware — catches all unhandled errors in Express routes.
// Returns structured JSON errors that match the ApiError type from @treasure-hunt/shared.

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@treasure-hunt/shared';

export class AppError extends Error {
  // Custom error class for known business logic errors (400, 401, 403, 404, etc.)
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Express error handler — must have 4 parameters to be recognized as error middleware
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors — malformed request body or query params
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const field = issue.path.join('.');
      details[field] = details[field] ?? [];
      details[field]?.push(issue.message);
    });

    const response: ApiError = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    };
    res.status(400).json(response);
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    const response: ApiError = {
      success: false,
      error: err.message,
      code: err.code,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors — log and return generic 500
  console.error('Unhandled error:', err);
  const response: ApiError = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(response);
}
