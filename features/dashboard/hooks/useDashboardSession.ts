'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  SESSION_START_COOKIE,
  isSessionExpired,
} from '@/lib/auth/constants';

export const SESSION_USER_CACHE_KEY = 'amex_cached_session_user';

export interface DashboardUser {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  rol_id?: string | null;
  permisos?: Record<string, unknown>;
  isAdmin?: boolean;
}

function buildFallbackUserFromAuth(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): DashboardUser {
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};
  const emailLower = (authUser.email || '').trim().toLowerCase();
  const rol =
    (appMetadata.rol as string) ||
    (metadata.rol as string) ||
    (emailLower === 'sistemaamexcourier@gmail.com' ? 'Administrador' : 'Operador Logístico');
  const normRole = rol.trim().toLowerCase();
  const isAdmin =
    normRole === 'admin' ||
    normRole === 'administrador' ||
    emailLower === 'sistemaamexcourier@gmail.com';

  return {
    id: authUser.id,
    nombre:
      (metadata.nombre_completo as string) ||
      (metadata.nombre as string) ||
      authUser.email?.split('@')[0] ||
      'Administrador AMEX',
    email: authUser.email || '',
    rol,
    permisos: {},
    isAdmin,
  };
}

function getSessionStartCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
  return match ? match[2] : null;
}

function readCachedUser(): DashboardUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const sessionStart = getSessionStartCookie();
    if (sessionStart && isSessionExpired(sessionStart)) {
      sessionStorage.removeItem(SESSION_USER_CACHE_KEY);
      return null;
    }
    const raw = sessionStorage.getItem(SESSION_USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardUser;
    if (parsed && parsed.email) {
      return parsed;
    }
  } catch {}
  return null;
}

function saveCachedUser(user: DashboardUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      sessionStorage.setItem(SESSION_USER_CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_CACHE_KEY);
    }
  } catch {}
}

export function useDashboardSession() {
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(() => readCachedUser());
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(() => readCachedUser() === null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUserRef = useRef<DashboardUser | null>(currentUser);
  const isLoggingOutRef = useRef(false);
  const isFetchingSessionRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const focusDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const applyUser = useCallback((user: DashboardUser) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    setIsLoadingSession(false);
    saveCachedUser(user);
  }, []);

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
          sessionStorage.removeItem(SESSION_USER_CACHE_KEY);
          localStorage.removeItem('amex_active_tab');
        } catch {}
      }
      await Promise.allSettled([
        supabase.auth.signOut(),
        fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }),
        new Promise((resolve) => setTimeout(resolve, 250)),
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
    if (isLoggingOutRef.current || isFetchingSessionRef.current) return;

    if (
      typeof window !== 'undefined' &&
      ((window as any).__AMEX_AI_EXTRACTION_ACTIVE__ || (window as any).__AMEX_EXPORT_ACTIVE__)
    ) {
      return;
    }

    isFetchingSessionRef.current = true;
    let fastUnlockTimer: NodeJS.Timeout | null = null;

    try {
      // 0. Comprobar tiempo de vida de la sesión (8 horas límite estricto de jornada)
      const sessionStartTime = getSessionStartCookie();
      if (sessionStartTime && isSessionExpired(sessionStartTime)) {
        await logout('session-expired');
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[useDashboardSession] Navegador offline. Preservando sesión local activa de 8 horas.');
        return;
      }

      // 1. Leer sesión local en memoria/cookies sin bloquear red y lanzar /api/auth/me en paralelo
      const localSessionPromise = supabase.auth
        .getSession()
        .then((r) => r.data?.session?.user || null)
        .catch(() => null);

      // Si /api/auth/me tarda más de 1.5s pero ya tenemos sesión local válida en cookies,
      // desbloquear la pantalla de inmediato para no hacer esperar al usuario.
      if (!currentUserRef.current) {
        fastUnlockTimer = setTimeout(async () => {
          if (isLoggingOutRef.current || currentUserRef.current) return;
          const localUser = await localSessionPromise;
          if (localUser && !currentUserRef.current && !isLoggingOutRef.current) {
            applyUser(buildFallbackUserFromAuth(localUser));
          }
        }, 1500);
      }

      // 2. Obtener perfil persistido y permisos vigentes desde el backend seguro con timeout
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
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

          const localUser = await localSessionPromise;

          // Solo mantener sesión viva si ya existe usuario hidratado en pantalla o sesión local válida
          if (sessionStartTime && !isSessionExpired(sessionStartTime) && (currentUserRef.current || localUser)) {
            if (!currentUserRef.current && localUser) {
              applyUser(buildFallbackUserFromAuth(localUser));
            }
            console.warn('[useDashboardSession] Respuesta 401 transitoria durante sesión activa de 8 horas. Manteniendo sesión viva.');
            return;
          }

          await logout('unauthenticated');
          return;
        }

        if (res.ok) {
          const json = await res.json();
          if (json.user && !isLoggingOutRef.current) {
            lastCheckTimeRef.current = Date.now();
            applyUser(json.user);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('[useDashboardSession] No se pudo contactar /api/auth/me a tiempo, usando sesión local:', apiErr);
      }

      if (isLoggingOutRef.current) return;

      // 3. Fallback con sesión local (getSession o getUser)
      let fallbackAuthUser = await localSessionPromise;
      if (!fallbackAuthUser) {
        const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        fallbackAuthUser = authData?.user || null;
      }

      if (fallbackAuthUser) {
        lastCheckTimeRef.current = Date.now();
        applyUser(buildFallbackUserFromAuth(fallbackAuthUser));
        return;
      }

      // 4. Si no hay usuario en /api/auth/me ni en Supabase Auth ni en caché, redirigir a /login
      // para nunca quedar atrapado en "Preparando estación de trabajo"
      if (!currentUserRef.current) {
        await logout('unauthenticated');
      }
    } catch (err) {
      console.error('[useDashboardSession] Error verificando sesión de usuario:', err);
      if (!currentUserRef.current) {
        await logout('unauthenticated');
      }
    } finally {
      if (fastUnlockTimer) clearTimeout(fastUnlockTimer);
      isFetchingSessionRef.current = false;
      if (!isLoggingOutRef.current) {
        setIsLoadingSession(false);
      }
    }
  }, [applyUser, logout]);

  useEffect(() => {
    void fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (isLoggingOutRef.current) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        void (async () => {
          try {
            const { data } = await supabase.auth.getSession();
            if (!data?.session) {
              await logout('unauthenticated');
            }
          } catch {}
        })();
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void fetchSession();
      }
    });

    const sessionTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (
        typeof window !== 'undefined' &&
        ((window as any).__AMEX_AI_EXTRACTION_ACTIVE__ || (window as any).__AMEX_EXPORT_ACTIVE__)
      ) {
        return;
      }

      const sessionStart = getSessionStartCookie();
      if (sessionStart && isSessionExpired(sessionStart)) {
        void logout('session-expired');
        return;
      }
      void fetchSession();
    }, 60000);

    const handleFocus = () => {
      if (isLoggingOutRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastCheckTimeRef.current < 60000) return;

      if (focusDebounceTimerRef.current) clearTimeout(focusDebounceTimerRef.current);
      focusDebounceTimerRef.current = setTimeout(() => {
        void fetchSession();
      }, 2500);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(sessionTimer);
      if (focusDebounceTimerRef.current) clearTimeout(focusDebounceTimerRef.current);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      subscription.unsubscribe();
    };
  }, [fetchSession, logout]);

  return { currentUser, isLoadingSession, isLoggingOut, logout, refreshSession: fetchSession };
}
