// Cloudflare R2 client — S3-compatible API.
// Used to generate presigned PUT URLs for direct client uploads.

import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

// R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

// Returns true when all R2 env vars are present (upload endpoints are functional)
export function r2IsConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_PUBLIC_URL);
}
