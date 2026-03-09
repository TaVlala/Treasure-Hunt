// Mobile API client — authenticated fetch wrapper for the player app.
// Reads/writes the access token from SecureStore; auto-refreshes on 401.
// credentials: 'include' ensures the httpOnly refresh_token cookie is sent
// automatically by the native networking layer on iOS and Android.

import { getToken, storeToken, clearAuth } from './auth';

// Base URL from EXPO_PUBLIC_API_URL env var; falls back to local dev server
const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3002';

// Attempts to get a new access token using the httpOnly refresh cookie
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { accessToken: string } };
    return json.data.accessToken;
  } catch {
    return null;
  }
}

// Authenticated fetch — adds Bearer header, retries once after token refresh on 401.
// Throws on non-2xx after retry or if refresh fails.
export async function playerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  let res = await makeRequest(await getToken());

  // On 401 — attempt silent token refresh and retry once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      await clearAuth();
      throw new Error('Session expired — please log in again');
    }
    await storeToken(newToken);
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
