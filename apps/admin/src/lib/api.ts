// Client-side API client — browser-only (uses document.cookie and window).
// Reads/writes the admin_token cookie, auto-refreshes on 401, then retries.
// Import this only from 'use client' components or client-side code.

const API_BASE =
  (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_API_URL']) ||
  'http://localhost:3001';

// -- Token cookie helpers --

// Reads admin_token from document.cookie
export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

// Sets admin_token cookie — 15 min max-age matches JWT access token expiry.
// Re-setting on each refresh resets the 15 min window.
export function setClientToken(token: string): void {
  document.cookie = `admin_token=${encodeURIComponent(token)}; path=/; max-age=900; SameSite=Lax`;
}

// Removes admin_token cookie
export function clearClientToken(): void {
  document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax';
}

// -- Refresh helper --

// Attempts to get a new access token using the httpOnly refresh cookie.
// Returns the new access token string, or null if the refresh token is expired.
async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // sends the httpOnly refresh cookie
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data: { accessToken: string } };
  return json.data.accessToken;
}

// -- Main fetch wrapper --

// Authenticated fetch — adds Bearer header, retries once after token refresh on 401.
// Throws on non-2xx after retry or if refresh fails.
export async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const makeRequest = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers as Record<string, string> | undefined ?? {}),
      },
    });

  let res = await makeRequest(getClientToken());

  // On 401 — attempt silent token refresh and retry once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      clearClientToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new Error('Session expired — please log in again');
    }
    setClientToken(newToken);
    res = await makeRequest(newToken);
  }

  const json = (await res.json()) as { success: boolean; data: T; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(
      (json as unknown as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return json.data;
}
