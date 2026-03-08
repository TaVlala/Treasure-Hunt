// Auth endpoints: register, login, token refresh, and logout.
// Access tokens are returned in JSON. Refresh tokens live in an httpOnly cookie.
// All routes are prefixed /api/v1/auth by the parent router in index.ts.

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { registerSchema, loginSchema } from '../schemas/auth.schemas';
import type { ApiSuccess, AuthUser } from '@treasure-hunt/shared';

const router = Router();

// Cookie name used for the refresh token
const REFRESH_COOKIE = 'refresh_token';

// Shared cookie options for setting and clearing the refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true, // not readable by browser JS
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

// Maps the Prisma enum value to the shared UserRole type
function toSharedRole(prismaRole: string): 'admin' | 'player' {
  return prismaRole === 'ADMIN' ? 'admin' : 'player';
}

// Builds the AuthUser shape returned from register and login
function buildAuthUser(
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string;
    avatarUrl: string | null;
    homeCity: string | null;
    createdAt: Date;
  },
  accessToken: string,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: toSharedRole(user.role),
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    homeCity: user.homeCity,
    createdAt: user.createdAt.toISOString(),
    accessToken,
  };
}

// --- POST /register ---
// Creates a new PLAYER account and returns an access token + refresh cookie.
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    // Reject duplicate emails before trying to insert
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        homeCity: body.homeCity,
        role: 'PLAYER',
      },
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    const response: ApiSuccess<AuthUser> = {
      success: true,
      message: 'Account created successfully',
      data: buildAuthUser(user, accessToken),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// --- POST /login ---
// Validates credentials and returns an access token + refresh cookie.
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });

    // Use a generic message for both "not found" and "wrong password" to prevent email enumeration
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await comparePassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp — non-critical, so we don't await it
    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => undefined);

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    const response: ApiSuccess<AuthUser> = {
      success: true,
      data: buildAuthUser(user, accessToken),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// --- POST /refresh ---
// Reads the refresh cookie and issues a new short-lived access token.
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token: string | undefined = (req as any).cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new AppError('No refresh token', 401, 'NO_REFRESH_TOKEN');
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new AppError('User not found', 401, 'INVALID_REFRESH_TOKEN');
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

    const response: ApiSuccess<{ accessToken: string }> = {
      success: true,
      data: { accessToken },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// --- POST /logout ---
// Clears the refresh token cookie. Client must discard the access token.
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  const response: ApiSuccess<null> = {
    success: true,
    data: null,
    message: 'Logged out successfully',
  };
  res.status(200).json(response);
});

export default router;
