/**
 * Configuración centralizada de sesión para AMEX Courier.
 * Límite estricto de inicio de sesión: 8 horas (28,800 segundos).
 */

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 28,800 s (8 horas)
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000; // 28,800,000 ms

export const SESSION_START_COOKIE = 'amex_session_start';

export const AUTH_COOKIE_OPTIONS = {
  maxAge: SESSION_MAX_AGE_SECONDS,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Verifica si una marca de tiempo de sesión ha superado las 8 horas.
 */
export function isSessionExpired(sessionStartTime: number | string | null | undefined): boolean {
  if (!sessionStartTime) return false;
  const time = typeof sessionStartTime === 'string' ? Number(sessionStartTime) : sessionStartTime;
  if (isNaN(time) || time <= 0) return false;
  return Date.now() - time > SESSION_MAX_AGE_MS;
}

/**
 * Calcula los milisegundos restantes de una sesión de 8 horas.
 */
export function getRemainingSessionMs(sessionStartTime: number | string | null | undefined): number {
  if (!sessionStartTime) return SESSION_MAX_AGE_MS;
  const time = typeof sessionStartTime === 'string' ? Number(sessionStartTime) : sessionStartTime;
  if (isNaN(time) || time <= 0) return SESSION_MAX_AGE_MS;
  const elapsed = Date.now() - time;
  return Math.max(0, SESSION_MAX_AGE_MS - elapsed);
}
