// JWT authentication middleware for protecting routes.
// `authenticate` verifies the Bearer access token and attaches req.user.
// `requireRole` restricts a route to one or more specific roles.

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from './errorHandler';
import type { UserRole } from '@treasure-hunt/shared';

// The user object attached to every authenticated request
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole; // shared type: 'admin' | 'player'
}

// Extend Express Request so TypeScript knows req.user exists on protected routes
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Reads the Authorization: Bearer <token> header, verifies the JWT, and attaches req.user.
// Call this middleware on any route that requires a logged-in user.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Authorization header missing or malformed', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role === 'ADMIN' ? 'admin' : 'player',
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}

// Returns middleware that only allows users with one of the specified roles.
// Must be used after `authenticate` — it assumes req.user is already set.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
