import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
};

export type FeatureName = 'isTranscribed' | 'isTexted' | 'isImageGeneration' | 'isAr' | 'isQuiz';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginWithTelegram: (group: string) => Promise<void>;
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

  const authHeaders = (): Record<string, string> => (user?.telegramId ? { Authorization: user.telegramId } : {});

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
    // Optional manual fallback for local debug
    try {
      const cached = localStorage.getItem('telegram:initData');
      if (cached) return cached;
    } catch {}
    return null;
  };

  const loginWithTelegram = async (group: string) => {
    setError(null);
    setLoading(true);
    try {
      const initData = getInitData();
      if (!initData) throw new Error('Откройте приложение через Telegram, initData отсутствует.');

  const res = await fetch('https://tou-event.ddns.net/api/v1/auth/telegram/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, group }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ошибка авторизации (${res.status}): ${text || 'unknown'}`);
      }
      const data = (await res.json()) as AuthUser;
      setUser(data);
      // After login, refresh from /auth/me/{telegramId}
      try { await refreshUser(); } catch {}
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };
  const res = await fetch(`https://tou-event.ddns.net/api/v1/auth/${encodeURIComponent(user.telegramId)}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ошибка обновления профиля (${res.status}): ${text || 'unknown'}`);
      }
      const data = await res.json();
      // Expecting { username, group } at minimum
      setUser(prev => prev ? { ...prev, username: data.username ?? prev.username, group: data.group ?? prev.group } : prev);
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };
  const res = await fetch(`https://tou-event.ddns.net/api/v1/auth/${encodeURIComponent(user.telegramId)}/coins`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ coins, feature }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ошибка начисления монет (${res.status}): ${text || 'unknown'}`);
      }
      const data = (await res.json()) as AuthUser;
      setUser(data);
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
      const headers: Record<string, string> = { ...authHeaders() };
      const res = await fetch(`https://tou-event.ddns.net/api/v1/auth/me/${encodeURIComponent(user.telegramId)}`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) return;
      const data = (await res.json()) as AuthUser;
      setUser(data);
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
