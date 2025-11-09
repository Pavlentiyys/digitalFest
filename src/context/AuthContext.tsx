import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_V1, httpJson, tgHeaders } from '../lib/api';

export type AuthUser = {
  id: string;
  telegramId: string;
  username: string;
  group: string;
  coins: number;
  isTranscribed: boolean;
  isTexted: boolean;
  isImageGeneration: boolean;
  isAr: boolean;
  isQuiz: boolean;
  avatarUrl?: string;
};

export type FeatureName = 'isTranscribed' | 'isTexted' | 'isImageGeneration' | 'isAr' | 'isQuiz';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginWithTelegram: (group: string) => Promise<AuthUser>;
  logout: () => void;
  updateProfile: (changes: { username: string; group: string }) => Promise<void>;
  awardCoins: (feature: FeatureName, coins: number) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window { Telegram?: any }
}

const STORAGE_KEY = 'auth:user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // Deprecated: replaced by tgHeaders helper
  // const authHeaders = (): Record<string, string> => (user?.telegramId != null ? { Authorization: String(user.telegramId) } : {});

  const getInitData = (): string | null => {
    // Prefer Telegram WebApp injected data
    try {
      const fromTg = window.Telegram?.WebApp?.initData as string | undefined;
      if (fromTg && typeof fromTg === 'string' && fromTg.length > 0) return fromTg;
    } catch {}
    // Common dev/test fallback: ?tgWebAppData=...
    try {
      const p = new URLSearchParams(window.location.search);
      const fromQuery = p.get('tgWebAppData');
      if (fromQuery) return fromQuery;
    } catch {}
    // Some Telegram clients pass init data in URL hash
    try {
      const h = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const fromHash = h.get('tgWebAppData');
      if (fromHash) return fromHash;
    } catch {}
    // Optional manual fallback for local debug
    try {
      const cached = localStorage.getItem('telegram:initData');
      if (cached) return cached;
    } catch {}
    return null;
  };

  const loginWithTelegram = async (group: string): Promise<AuthUser> => {
    setError(null);
    setLoading(true);
    try {
      const initData = getInitData();
      if (!initData) throw new Error('Откройте приложение через Telegram');
      // Optionally include telegram-id header if доступен из initDataUnsafe
      const rawTid: string | undefined = (() => {
        try { const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id; return id != null ? String(id) : undefined; } catch { return undefined; }
      })();
      let data: AuthUser;
      try {
        const r = await httpJson<AuthUser>(`${API_V1}/auth/telegram/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(rawTid ? tgHeaders(rawTid, { includeAuthorization: true }) : {}) },
          body: JSON.stringify({ initData, group }),
        });
        data = r.data;
      } catch (e: any) {
        const msg: string = e?.message || '';
        // Map 5xx to a friendlier message for users
        if (/HTTP\s*5\d{2}/.test(msg)) {
          throw new Error('Сервис авторизации временно недоступен. Попробуйте ещё раз позже.');
        }
        throw e;
      }
      const tgPhoto: string | undefined = (() => {
        try { return window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url as string | undefined; } catch { return undefined; }
      })();
      setUser({ ...data, avatarUrl: tgPhoto || data.avatarUrl });
      // After login, refresh from /auth/me/{telegramId}
      try { await refreshUser(); } catch {}
      return data;
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  const updateProfile = async (changes: { username: string; group: string }) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...tgHeaders(user.telegramId, { includeAuthorization: true }) };
      const { data } = await httpJson<any>(`${API_V1}/auth/${encodeURIComponent(user.telegramId)}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(changes),
      });
  setUser(prev => prev ? { ...prev, username: data.username ?? prev.username, group: data.group ?? prev.group, avatarUrl: prev.avatarUrl } : prev);
    } catch (e: any) {
      setError(e?.message || 'Не удалось обновить профиль');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const awardCoins = async (feature: FeatureName, coins: number) => {
    if (!user) throw new Error('Не авторизовано');
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...tgHeaders(user.telegramId, { includeAuthorization: true }) };
      const { data } = await httpJson<AuthUser>(`${API_V1}/auth/${encodeURIComponent(user.telegramId)}/coins`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ coins, feature }),
      });
      const tgPhoto: string | undefined = (() => {
        try { return window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url as string | undefined; } catch { return undefined; }
      })();
      setUser(prev => ({ ...data, avatarUrl: prev?.avatarUrl || tgPhoto || data.avatarUrl }));
    } catch (e: any) {
      setError(e?.message || 'Не удалось начислить монеты');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user?.telegramId) return;
    try {
  const headers: Record<string, string> = { ...tgHeaders(user.telegramId, { includeAuthorization: true }) };
  const res = await fetch(`${API_V1}/auth/me/${encodeURIComponent(user.telegramId)}`, { method: 'GET', headers });
      if (!res.ok) return;
      const ct = res.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      const data = (isJson ? await res.json().catch(() => null) : null) as AuthUser | null;
      if (data) setUser(data);
    } catch {
      // ignore
    }
  };

  const value = useMemo<AuthContextType>(() => ({ user, loading, error, loginWithTelegram, logout, updateProfile, awardCoins, refreshUser }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
