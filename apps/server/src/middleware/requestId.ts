// Request ID middleware — stamps every incoming request with a unique UUID.
// The ID is written to req.id, echoed back in the X-Request-Id response header,
// and picked up by pino-http so every log line for a request shares the same id.

import { Request, Response, NextFunction } from 'express';

// Augment Express Request so downstream handlers can access req.id without casting
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Assign a UUID to each request; prefer any id already set by a reverse proxy
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const fromProxy = req.headers['x-request-id'];
  const id = typeof fromProxy === 'string' && fromProxy.length > 0
    ? fromProxy
    : crypto.randomUUID();

  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
