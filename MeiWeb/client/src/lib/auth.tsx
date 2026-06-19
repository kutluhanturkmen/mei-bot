'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from './api';

// ── Types ────────────────────────────────────────────────────────
export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

interface AuthState {
  user: DiscordUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  avatarUrl: (user: DiscordUser, size?: number) => string;
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const user = await authApi.me();
      setState({ user, loading: false, error: null });
    } catch {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setState({ user: null, loading: false, error: null });
    window.location.href = '/';
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const avatarUrl = useCallback(
    (user: DiscordUser, size = 128) =>
      user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=${size}`
        : `https://cdn.discordapp.com/embed/avatars/${
            parseInt(user.discriminator) % 5
          }.png`,
    []
  );

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout, avatarUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within <AuthProvider>');
  return ctx;
}

/** Returns true if user is logged in and loading is done */
export function useIsLoggedIn(): boolean {
  const { user, loading } = useSession();
  return !loading && user !== null;
}
