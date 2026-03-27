// Input sanitisation middleware — strips XSS vectors from all incoming string fields.
// Runs before route handlers so no route ever receives raw user-supplied HTML/script tags.
// Uses a simple regex approach (no external deps) targeting the most common injection patterns.

import { Request, Response, NextFunction } from 'express';

// Characters and patterns that are dangerous in HTML/JS context
const SCRIPT_TAG_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const HTML_TAG_RE = /<[^>]+>/g;
const NULL_BYTE_RE = /\0/g;

// Recursively sanitise all string values inside an object or array
function sanitiseValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(SCRIPT_TAG_RE, '') // strip <script>...</script> blocks
      .replace(HTML_TAG_RE, '') // strip any remaining HTML tags
      .replace(NULL_BYTE_RE, ''); // strip null bytes (path traversal)
  }

  if (Array.isArray(value)) {
    return value.map(sanitiseValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitised: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitised[key] = sanitiseValue(val);
    }
    return sanitised;
  }

  // Numbers, booleans, null, undefined — return as-is
  return value;
}

// Express middleware — sanitises req.body, req.query, req.params in place
export function sanitiseInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitiseValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    // Express 5 makes req.query a read-only getter — mutate in place
    const cleaned = sanitiseValue(req.query) as Record<string, unknown>;
    for (const key of Object.keys(cleaned)) {
      (req.query as Record<string, unknown>)[key] = cleaned[key];
    }
  }

  // req.params is read-only at the type level but is a plain object at runtime
  if (req.params && typeof req.params === 'object') {
    const cleaned = sanitiseValue(req.params) as Record<string, string>;
    for (const key of Object.keys(cleaned)) {
      (req.params as Record<string, string>)[key] = cleaned[key] ?? '';
    }
  }

  next();
}
