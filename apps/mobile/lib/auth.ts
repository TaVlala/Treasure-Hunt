// Secure storage helpers for the player's access token and user profile.
// Uses expo-secure-store so credentials are stored in the device keychain / keystore.

import * as SecureStore from 'expo-secure-store';
import type { User } from '@treasure-hunt/shared';

const TOKEN_KEY = 'player_access_token';
const USER_KEY = 'player_user';

// Persists the JWT access token to the keychain
export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

// Retrieves the stored JWT access token, or null if none exists
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// Persists the user profile as a JSON string
export async function storeUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

// Retrieves the stored user profile, or null if none exists
export async function getUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// Removes both the token and user profile from secure storage (on logout)
export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
