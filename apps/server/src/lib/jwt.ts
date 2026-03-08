// JWT signing and verification helpers.
// Access tokens are short-lived (15m) and returned in JSON responses.
// Refresh tokens are long-lived (7d) and stored in an httpOnly cookie.

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Converts simple expiry strings ('15m', '7d', '1h', '30s') to seconds.
// jwt.sign expiresIn expects a number (seconds) — plain string is not accepted by @types/jsonwebtoken v9.
function parseExpiryToSeconds(expiry: string): number {
  const value = parseInt(expiry.slice(0, -1), 10);
  const unit = expiry.slice(-1);
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default:  return parseInt(expiry, 10); // plain number string
  }
}

// Payload embedded in access tokens
export interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  role: string; // Prisma enum value: 'ADMIN' | 'PLAYER'
}

// Payload embedded in refresh tokens (minimal — just enough to look up the user)
export interface RefreshTokenPayload {
  sub: string; // user ID
}

// Signs a new access token with the user's id, email, and role
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: parseExpiryToSeconds(env.JWT_ACCESS_EXPIRY),
  });
}

// Signs a new refresh token containing only the user ID
export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: parseExpiryToSeconds(env.JWT_REFRESH_EXPIRY),
  });
}

// Verifies an access token — throws JsonWebTokenError if invalid or expired
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// Verifies a refresh token — throws JsonWebTokenError if invalid or expired
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
