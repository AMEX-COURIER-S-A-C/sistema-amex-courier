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
  const isFetchingSessionRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const focusDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (isLoggingOutRef.current || isFetchingSessionRef.current) return;

    // Si hay una extracción con AMEXito IA o una exportación pesada activa en el cliente, pausar el sondeo
    if (
      typeof window !== 'undefined' &&
      ((window as any).__AMEX_AI_EXTRACTION_ACTIVE__ || (window as any).__AMEX_EXPORT_ACTIVE__)
    ) {
      return;
    }

    isFetchingSessionRef.current = true;

    try {
      // 0. Comprobar tiempo de vida de la sesión (8 horas límite estricto de jornada)
      let sessionStartTime: string | null = null;
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
        sessionStartTime = match ? match[2] : null;

        if (sessionStartTime && isSessionExpired(sessionStartTime)) {
          await logout('session-expired');
          return;
        }
      }

      // Si el navegador está completamente offline (sin conexión a internet o reconectando Wi-Fi tras reposo),
      // NO cerrar sesión; preservar el usuario localmente hasta que la red se restablezca.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[useDashboardSession] Navegador offline. Preservando sesión local activa de 8 horas.');
        return;
      }

      // 1. Consultar sesión en cliente Supabase local
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (isLoggingOutRef.current) return;

      // Si no hay usuario y no existe cookie de inicio de 8 horas, redirigir a login
      if (!authData?.user && !sessionStartTime) {
        await logout('unauthenticated');
        return;
      }

      // 2. Obtener perfil persistido y permisos vigentes desde el backend seguro
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (isLoggingOutRef.current) return;

        if (res.status === 401 || res.status === 403) {
          const json = await res.json().catch(() => ({}));

          // Revocación o desactivación administrativa expresa: cerrar sesión de inmediato
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

          // Si es un 401 transitorio (ej: refresco de token concurrente o microcorte)
          // pero el usuario tiene su cookie de 8 horas activa y usuario en pantalla, NO expulsarlo.
          if (sessionStartTime && !isSessionExpired(sessionStartTime)) {
            console.warn('[useDashboardSession] Respuesta 401 transitoria durante sesión activa de 8 horas. Manteniendo sesión viva.');
            return;
          }

          // Solo si no hay sesión válida ni cookie de 8 horas
          await logout('unauthenticated');
          return;
        }

        if (res.ok) {
          const json = await res.json();
          if (json.user && !isLoggingOutRef.current) {
            lastCheckTimeRef.current = Date.now();
            setCurrentUser(json.user);
            setIsLoadingSession(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('[useDashboardSession] No se pudo contactar /api/auth/me (posible reconexión o reposo), usando sesión local:', apiErr);
      }

      if (isLoggingOutRef.current) return;

      // 3. Fallback de contingencia con metadatos del token local de Auth
      if (authData?.user) {
        lastCheckTimeRef.current = Date.now();
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
      }
    } catch (err) {
      console.error('[useDashboardSession] Error verificando sesión de usuario:', err);
    } finally {
      isFetchingSessionRef.current = false;
      if (!isLoggingOutRef.current) {
        setIsLoadingSession(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    void fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (isLoggingOutRef.current) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        // Solo desloguear si la sesión realmente fue terminada
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

    // Monitor activo de jornada: Comprueba periódicamente cada 60s
    // REGLA CLAVE: Si la pestaña está oculta o en reposo (inactiva), NO sondear la red para no generar colisiones
    const sessionTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (
        typeof window !== 'undefined' &&
        ((window as any).__AMEX_AI_EXTRACTION_ACTIVE__ || (window as any).__AMEX_EXPORT_ACTIVE__)
      ) {
        return;
      }

      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + SESSION_START_COOKIE + '=([^;]*)'));
        if (match && isSessionExpired(match[2])) {
          void logout('session-expired');
          return;
        }
      }
      void fetchSession();
    }, 60000);

    // Al regresar a la pestaña tras inactividad o cambio de ventana:
    // 1. Si la pestaña sigue oculta, no hacer nada.
    // 2. Si ya se verificó hace menos de 60 segundos, omitir para no saturar.
    // 3. Aplicar debounce de 2500ms para permitir que la conexión Wi-Fi / sockets se reanuden limpiamente.
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
