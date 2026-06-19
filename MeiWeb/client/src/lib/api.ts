/**
 * Centralized API fetch wrapper.
 * Cookies are sent automatically (credentials: 'include').
 * On 401, redirects to login unless `skipRedirect` is set.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiError {
  error: string;
  status: number;
}

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipRedirect?: boolean } = {}
): Promise<T> {
  const { skipRedirect, ...fetchOptions } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !skipRedirect && typeof window !== 'undefined') {
      window.location.href = '/';
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiRequestError(body.error ?? res.statusText, res.status);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  me: () =>
    request<{
      id: string;
      username: string;
      avatar: string | null;
      discriminator: string;
    }>('/api/auth/me', { skipRedirect: true } as RequestInit & { skipRedirect: boolean }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  loginUrl: () =>
    `${API_BASE}/api/auth/discord`,
};

// ── Stats ─────────────────────────────────────────────────────────
export interface BotStats {
  guilds:     number;
  users:      number;
  totalCoins: number;
  lotusCoins: number;
  uptime:     number;
}

export const statsApi = {
  get: () => request<BotStats>('/api/stats'),
};

// ── Leaderboard ───────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank:             number;
  userId:           string;
  username:         string;
  avatar:           string | null;
  value:            number;
  isEarlySupporter: boolean;
}

export const leaderboardApi = {
  get: (type: 'coins' | 'cafe', limit = 10) =>
    request<LeaderboardEntry[]>(`/api/leaderboard?type=${type}&limit=${limit}`),
};

// ── Guilds ────────────────────────────────────────────────────────
export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  hasBot: boolean;
}

export const guildsApi = {
  list: () => request<Guild[]>('/api/guilds'),
};

// ── Guild Settings ────────────────────────────────────────────────
export interface GuildSettings {
  guildId: string;
  guildName: string;
  isEarlySupporter: boolean;
  economyMultiplier: number;
  settings: {
    logsEnabled: boolean;
    gamesEnabled: boolean;
    economyEnabled: boolean;
    gameChannelId: string | null;
    wordGameChannelId: string | null;
  };
  channels: {
    joinLog: string | null;
    leaveLog: string | null;
    welcome: string | null;
    giveawayLog: string | null;
  };
  welcomeMessage: {
    enabled: boolean;
    channelId: string | null;
    template: string;
  };
}

export const guildApi = {
  get: (guildId: string) => request<GuildSettings>(`/api/guild/${guildId}`),

  patch: (guildId: string, data: Partial<GuildSettings>) =>
    request<GuildSettings>(`/api/guild/${guildId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── User Profile ──────────────────────────────────────────────────
export interface BotUser {
  userId: string;
  username: string;
  balance: number;
  isEarlySupporter: boolean;
  badges: string[];
  activeBadge: string | null;
  profileBackground: string;
  cafe: {
    name: string;
    tier: number;
    coins: number;
    cats: number;
  } | null;
}

export const userApi = {
  me: () => request<BotUser>('/api/user/me'),
};
