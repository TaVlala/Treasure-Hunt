// Server-side API client — runs in Next.js server components / Route Handlers only.
// Reads the admin_token cookie via next/headers and makes authenticated fetch calls.
// Never import this from 'use client' components.

import { cookies } from 'next/headers';

// API_URL for server-side calls; fall back to NEXT_PUBLIC_API_URL (available on both sides in Next.js)
const SERVER_API =
  process.env['API_URL'] ??
  process.env['NEXT_PUBLIC_API_URL']?.replace('/api/v1', '') ??
  'http://localhost:3001';

// Fetches data from the backend using the admin_token cookie.
// Returns null on auth error or network failure — callers render fallback UI.
export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${SERVER_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined ?? {}),
      },
      // Always fetch fresh — admin data must not be stale
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}
