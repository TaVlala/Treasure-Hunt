// Client-side auth helpers — login, logout, current user from localStorage.
// All functions run in the browser only (use client components).

import { clientFetch, setClientToken, clearClientToken } from './api';
import type { AuthUser } from '@treasure-hunt/shared';

const USER_STORAGE_KEY = 'admin_user';

// Stores minimal user info in localStorage for UI display (avatar, name, email).
function saveUser(user: Omit<AuthUser, 'accessToken'>): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

// Returns the cached user object, or null if not logged in.
export function getStoredUser(): Omit<AuthUser, 'accessToken'> | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Omit<AuthUser, 'accessToken'>;
  } catch {
    return null;
  }
}

// Logs in with email + password. Throws if credentials are wrong or user is not admin.
// On success: sets admin_token cookie + saves user to localStorage.
export async function login(email: string, password: string): Promise<void> {
  const user = await clientFetch<AuthUser>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (user.role !== 'admin') {
    throw new Error('Admin accounts only — player accounts cannot access this panel');
  }

  setClientToken(user.accessToken);
  saveUser(user);
}

// Logs out — clears the backend refresh cookie, removes local token and user data.
export async function logout(): Promise<void> {
  try {
    await clientFetch('/api/v1/auth/logout', { method: 'POST' });
  } catch {
    // Ignore — still clear local state even if the request fails
  } finally {
    clearClientToken();
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.href = '/login';
  }
}
