// Environment variable validation using Zod.
// The server refuses to start if any required variable is missing or malformed.
// Non-essential services (Stripe, R2, Resend, Mapbox) are optional until those features are built.

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),

  // Database — required in all environments
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  // JWT secrets — required in all environments
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Mapbox — optional until map features are built
  MAPBOX_ACCESS_TOKEN: z.string().optional(),

  // Cloudflare R2 — optional until file upload is built
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('treasure-hunt'),
  R2_PUBLIC_URL: z.string().optional(),

  // Stripe — optional until payments are built
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Resend — optional until email is built
  RESEND_API_KEY: z.string().optional(),

  // CORS — origins allowed to call the API
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081'),
});

// Validate on startup — throws with clear error messages if anything is missing
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
