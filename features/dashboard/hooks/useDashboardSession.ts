'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  SESSION_START_COOKIE,
  SESSION_MAX_AGE_MS,
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

  const logout = useCallback(async (reason?: string) => {
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${SESSION_START_COOKIE}=; path=/; max-age=0; SameSite=Lax;`;
      }
      await Promise.allSettled([
        supabase.auth.signOut(),
        fetch('/api/auth/logout', { method: 'POST' }),
      ]);
    } catch {}
    let redirectUrl = '/login';
    if (reason === 'session-expired') {
      redirectUrl = '/login?error=session-expired';
    } else if (reason === 'permissions-updated') {
      redirectUrl = '/login?error=permissions-updated';
    } else if (reason === 'account-disabled') {
      redirectUrl = '/login?error=account-disabled';
    }
    window.location.href = redirectUrl;
  }, []);

  const fetchSession = useCallback(async () => {
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
      if (authError || !authData?.user) {
        setCurrentUser(null);
        setIsLoadingSession(false);
        return;
      }

      // 1. Obtener perfil persistido y permisos vigentes desde el backend seguro
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
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
          setCurrentUser(null);
          setIsLoadingSession(false);
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (json.user) {
            setCurrentUser(json.user);
            setIsLoadingSession(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('No se pudo contactar /api/auth/me, usando datos de token local:', apiErr);
      }

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
      setIsLoadingSession(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setIsLoadingSession(false);
      } else {
        fetchSession();
      }
    });

    // Monitor activo: Comprueba cada 15 segundos si expiró el tiempo de sesión o si se revocaron permisos
    const sessionTimer = setInterval(() => {
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
        if (match && isSessionExpired(match[2])) {
          logout('session-expired');
          return;
        }
      }
      void fetchSession();
    }, 15000);

    const handleFocus = () => {
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

  return { currentUser, isLoadingSession, logout, refreshSession: fetchSession };
}
