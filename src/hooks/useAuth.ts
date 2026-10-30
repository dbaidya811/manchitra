import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthAvailability, AuthStatus, AuthUser } from '../types';

interface SessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

const FALLBACK_AVAILABILITY: AuthAvailability = {
  emailOtpEnabled: true,
  googleEnabled: false
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [availability, setAvailability] = useState<AuthAvailability | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const applySession = useCallback((data: AuthResponse | SessionResponse) => {
    if (data.authenticated && data.user) {
      setUser(data.user);
      setStatus('authenticated');
    } else {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<SessionResponse>('/api/auth/session');
      applySession(data);
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await apiFetch<SessionResponse>('/api/auth/session');
        if (!cancelled) applySession(data);
      } catch {
        if (!cancelled) {
          setUser(null);
          setStatus('anonymous');
        }
      }

      try {
        const config = await apiFetch<AuthAvailability>('/api/auth/config');
        if (!cancelled) setAvailability(config);
      } catch {
        if (!cancelled) setAvailability(FALLBACK_AVAILABILITY);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const requestOtp = useCallback(async (email: string) => {
    return apiFetch<{ sent: boolean; email: string; expiresInSeconds: number }>(
      '/api/auth/otp/request',
      {
        method: 'POST',
        body: JSON.stringify({ email })
      }
    );
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const data = await apiFetch<AuthResponse>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });
      applySession(data);
      return data;
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const data = await apiFetch<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential })
      });
      applySession(data);
      return data;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<AuthResponse>('/api/auth/logout', { method: 'POST' });
    } catch {
      // clear the client state even if the network call failed
    }
    setUser(null);
    setStatus('anonymous');
  }, []);

  return {
    user,
    status,
    availability,
    isAuthenticated: status === 'authenticated' && user !== null,
    isLoginOpen,
    openLogin: useCallback(() => setIsLoginOpen(true), []),
    closeLogin: useCallback(() => setIsLoginOpen(false), []),
    refresh,
    requestOtp,
    verifyOtp,
    loginWithGoogle,
    logout
  };
}

export type AuthController = ReturnType<typeof useAuth>;