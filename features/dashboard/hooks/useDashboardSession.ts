'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  SESSION_START_COOKIE,
  isSessionExpired,
} from '@/lib/auth/constants';

export interface DashboardUser {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  rol_id?: string | null;
  permisos?: Record<string, unknown>;
  isAdmin?: boolean;
}

export function useDashboardSession() {
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  const logout = useCallback(async (reason?: string) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${SESSION_START_COOKIE}=; path=/; max-age=0; SameSite=Lax;`;
      }
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('amex_recovery_token');
          localStorage.removeItem('amex_active_tab');
        } catch {}
      }
      await Promise.allSettled([
        supabase.auth.signOut(),
        fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }),
        new Promise((resolve) => setTimeout(resolve, 360)),
      ]);
    } catch {}

    let redirectUrl = '/login?logout=1';
    if (reason === 'session-expired') {
      redirectUrl = '/login?error=session-expired';
    } else if (reason === 'permissions-updated') {
      redirectUrl = '/login?error=permissions-updated';
    } else if (reason === 'account-disabled') {
      redirectUrl = '/login?error=account-disabled';
    } else if (reason === 'unauthenticated') {
      redirectUrl = '/login';
    }

    if (typeof window !== 'undefined') {
      window.location.replace(redirectUrl);
    }
  }, []);

  const fetchSession = useCallback(async () => {
    if (isLoggingOutRef.current) return;

    try {
      // 0. Comprobar tiempo de vida de la sesión (8 horas límite)
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
        if (match && isSessionExpired(match[2])) {
          await logout('session-expired');
          return;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (isLoggingOutRef.current) return;

      if (authError || !authData?.user) {
        await logout('unauthenticated');
        return;
      }

      // 1. Obtener perfil persistido y permisos vigentes desde el backend seguro
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (isLoggingOutRef.current) return;

        if (res.status === 401 || res.status === 403) {
          const json = await res.json().catch(() => ({}));
          if (json.code === 'SESSION_REVOKED' || json.error?.includes('actualizados') || json.error?.includes('reiniciada')) {
            await logout('permissions-updated');
            return;
          }
          if (json.code === 'ACCOUNT_DISABLED' || json.error?.includes('desactivada')) {
            await logout('account-disabled');
            return;
          }
          if (json.error?.includes('expirada')) {
            await logout('session-expired');
            return;
          }
          await logout('unauthenticated');
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (json.user && !isLoggingOutRef.current) {
            setCurrentUser(json.user);
            setIsLoadingSession(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('No se pudo contactar /api/auth/me, usando datos de token local:', apiErr);
      }

      if (isLoggingOutRef.current) return;

      // 2. Fallback de contingencia con metadatos del token Auth
      const metadata = authData.user.user_metadata || {};
      const appMetadata = authData.user.app_metadata || {};
      const rol =
        (appMetadata.rol as string) ||
        (metadata.rol as string) ||
        'Operador Logístico';
      const normRole = rol.trim().toLowerCase();
      const isAdmin = normRole === 'admin' || normRole === 'administrador';

      setCurrentUser({
        id: authData.user.id,
        nombre:
          (metadata.nombre_completo as string) ||
          (metadata.nombre as string) ||
          authData.user.email?.split('@')[0] ||
          'Operador AMEX',
        email: authData.user.email || '',
        rol,
        permisos: {},
        isAdmin,
      });
    } catch (err) {
      console.error('Error cargando sesión de usuario:', err);
    } finally {
      if (!isLoggingOutRef.current) {
        setIsLoadingSession(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    void fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isLoggingOutRef.current) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT' || !session) {
        void logout('unauthenticated');
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void fetchSession();
      }
    });

    // Monitor activo: Comprueba cada 15 segundos si expiró el tiempo de sesión o si se revocaron permisos
    const sessionTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
        if (match && isSessionExpired(match[2])) {
          void logout('session-expired');
          return;
        }
      }
      void fetchSession();
    }, 15000);

    const handleFocus = () => {
      if (isLoggingOutRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void fetchSession();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(sessionTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      subscription.unsubscribe();
    };
  }, [fetchSession, logout]);

  return { currentUser, isLoadingSession, isLoggingOut, logout, refreshSession: fetchSession };
}

