'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AccessRole } from '@/lib/accessCodes';

export type AuthStatus = 'loading' | 'authed' | 'guest';

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  role?: AccessRole;
  subject?: string;
  ownerCode?: string;
  login: (code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface SessionResponse {
  authenticated: boolean;
  role?: AccessRole;
  subject?: string;
  ownerCode?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NETWORK_ERROR = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [role, setRole] = useState<AccessRole | undefined>(undefined);
  const [subject, setSubject] = useState<string | undefined>(undefined);
  const [ownerCode, setOwnerCode] = useState<string | undefined>(undefined);

  const applySession = useCallback((data: SessionResponse | null) => {
    if (data?.authenticated && data.role && data.subject) {
      setRole(data.role);
      setSubject(data.subject);
      setOwnerCode(data.ownerCode ?? '');
      setStatus('authed');
    } else {
      setRole(undefined);
      setSubject(undefined);
      setOwnerCode(undefined);
      setStatus('guest');
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        applySession(null);
        return;
      }
      const data = (await res.json()) as SessionResponse;
      applySession(data);
    } catch {
      applySession(null);
    }
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) {
          applySession(null);
          return;
        }
        const data = (await res.json()) as SessionResponse;
        if (!cancelled) applySession(data);
      } catch {
        if (!cancelled) applySession(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (code: string): Promise<LoginResult> => {
      let res: Response;
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
      } catch {
        applySession(null);
        return { ok: false, error: NETWORK_ERROR };
      }

      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        await refresh();
        return { ok: false, error: data?.error ?? 'Kode Akses tidak terdaftar.' };
      }

      await refresh();
      return { ok: true };
    },
    [applySession, refresh]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Abaikan kegagalan jaringan saat keluar; sesi lokal tetap dibersihkan.
    } finally {
      applySession(null);
      router.push('/login');
    }
  }, [applySession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, role, subject, ownerCode, login, logout, refresh }),
    [status, role, subject, ownerCode, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  }
  return ctx;
}
