// File upload endpoints — generates presigned R2 PUT URLs for direct client uploads.
// All routes require a valid JWT (any role).
// Base path: /api/v1/upload (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { r2, r2IsConfigured } from '../lib/r2';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authenticate';
import type { ApiSuccess } from '@treasure-hunt/shared';

const router = Router();

router.use(authenticate);

// Allowed upload folders — maps to a path prefix in the R2 bucket
const ALLOWED_FOLDERS = ['clues', 'sponsors', 'hunts', 'avatars'] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

// Allowed MIME types and their extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const presignedSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(
    Object.keys(ALLOWED_TYPES) as [string, ...string[]],
    { errorMap: () => ({ message: `contentType must be one of: ${Object.keys(ALLOWED_TYPES).join(', ')}` }) },
  ),
  folder: z.enum(ALLOWED_FOLDERS),
});

export interface PresignedUploadResult {
  uploadUrl: string;   // PUT to this URL directly from the client
  publicUrl: string;   // permanent public URL once uploaded
  key: string;         // R2 object key
  expiresInSeconds: number;
}

// POST /presigned — returns a short-lived presigned PUT URL for R2.
// Client uploads the file directly; server never receives the binary data.
router.post('/presigned', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!r2IsConfigured()) {
      throw new AppError('File upload is not configured on this server', 503, 'SERVICE_UNAVAILABLE');
    }

    const { filename, contentType, folder } = presignedSchema.parse(req.body);

    // Build a collision-safe key: folder/uuid.ext
    const ext = ALLOWED_TYPES[contentType] ?? 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 5 minutes — enough for any reasonable upload
    const EXPIRES_IN = 300;
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN });
    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

    const response: ApiSuccess<PresignedUploadResult> = {
      success: true,
      data: { uploadUrl, publicUrl, key, expiresInSeconds: EXPIRES_IN },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
