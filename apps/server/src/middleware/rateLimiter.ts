// Rate limiting middleware — prevents brute-force attacks and API abuse.
// Uses express-rate-limit with in-memory store (suitable for single-instance deployments).
// For multi-instance deployments, swap the store for a Redis-backed rate-limit store.

import rateLimit from 'express-rate-limit';

// JSON response body sent when a client exceeds the rate limit
const rateLimitHandler = (
  _req: import('express').Request,
  res: import('express').Response,
) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests — please slow down and try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

// --- Auth limiter ---
// Strict: 10 attempts per 15-minute window per IP.
// Applies to /api/v1/auth/* — login, register, refresh, sponsor login/register.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* legacy headers
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
});

// --- Game action limiter ---
// Moderate: 60 requests per minute per IP.
// Applies to submit-clue and proximity-check to stop automated farming.
export const gameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// --- General API limiter ---
// Broad: 200 requests per minute per IP for all other routes.
// Catches general API scraping and runaway client bugs.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
