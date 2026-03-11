// Auth context — provides login, register, logout, and current user to the whole app.
// Initialises from SecureStore on mount so the user stays logged in between sessions.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { playerFetch } from '@/lib/api';
import { storeToken, storeUser, getToken, getUser, clearAuth } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';
import type { AuthUser, User } from '@treasure-hunt/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, homeCity?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Hook to consume auth state — throws if used outside AuthProvider
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Registers the device push token with the server. Fire-and-forget; never throws.
  async function syncPushToken(): Promise<void> {
    try {
      const token = await registerForPushNotifications();
      if (!token) return;
      await playerFetch('/api/v1/player/device-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    } catch {
      // Non-fatal — notification permission may be denied or device is a simulator
    }
  }

  // On mount: restore user from SecureStore if a token exists
  useEffect(() => {
    async function restore() {
      try {
        const [token, stored] = await Promise.all([getToken(), getUser()]);
        if (token && stored) {
          setUser(stored);
          // Re-sync push token in case it rotated since last session
          void syncPushToken();
        }
      } finally {
        setIsLoading(false);
      }
    }
    void restore();
  }, []);

  // Logs in with email + password; persists token + user to SecureStore
  const login = useCallback(async (email: string, password: string) => {
    const data = await playerFetch<AuthUser>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await storeToken(data.accessToken);
    await storeUser(data);
    setUser(data);
    void syncPushToken();
  }, []);

  // Registers a new player account; persists token + user to SecureStore
  const register = useCallback(
    async (email: string, password: string, displayName: string, homeCity?: string) => {
      const payload: Record<string, string> = { email, password, displayName };
      if (homeCity?.trim()) payload['homeCity'] = homeCity.trim();

      const data = await playerFetch<AuthUser>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await storeToken(data.accessToken);
      await storeUser(data);
      setUser(data);
      void syncPushToken();
    },
    [],
  );

  // Logs out — clears SecureStore and notifies the server to clear the refresh cookie
  const logout = useCallback(async () => {
    try {
      await playerFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Continue with local logout even if the server call fails
    }
    await clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
