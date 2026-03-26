// player-auth.ts — client-side player auth helpers for the public web pages.
// Uses player_token cookie (separate from admin_token) and player_user localStorage.

const API_BASE =
  (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_API_URL']) ||
  'http://localhost:3001';

const USER_KEY = 'player_user';

export interface PlayerUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

// -- Token cookie helpers --

export function getPlayerToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)player_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function setPlayerToken(token: string): void {
  document.cookie = `player_token=${encodeURIComponent(token)}; path=/; max-age=900; SameSite=Lax`;
}

function clearPlayerToken(): void {
  document.cookie = 'player_token=; path=/; max-age=0; SameSite=Lax';
}

// -- User storage --

export function getStoredPlayer(): PlayerUser | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PlayerUser; } catch { return null; }
}

function savePlayer(user: PlayerUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// -- Auth actions --

// Logs in a player. Throws if credentials wrong or account is not a player role.
export async function playerLogin(email: string, password: string): Promise<PlayerUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as { success: boolean; data: PlayerUser & { accessToken: string }; error?: string };
  if (!res.ok || !json.success) throw new Error(json.error ?? 'Login failed');

  const user = json.data;
  if (user.role === 'admin') throw new Error('Use the admin portal to sign in as an admin');

  setPlayerToken(user.accessToken);
  const player: PlayerUser = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  savePlayer(player);
  return player;
}

// Registers a new player account and logs them in.
export async function playerRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<PlayerUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  const json = (await res.json()) as { success: boolean; data: PlayerUser & { accessToken: string }; error?: string };
  if (!res.ok || !json.success) throw new Error(json.error ?? 'Registration failed');

  const user = json.data;
  setPlayerToken(user.accessToken);
  const player: PlayerUser = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  savePlayer(player);
  return player;
}

// Logs out — clears cookie and localStorage
export function playerLogout(): void {
  clearPlayerToken();
  localStorage.removeItem(USER_KEY);
  window.location.href = '/player/login';
}
