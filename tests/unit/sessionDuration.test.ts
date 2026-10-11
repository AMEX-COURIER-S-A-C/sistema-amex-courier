import { describe, it, expect } from 'vitest';
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_MS,
  SESSION_START_COOKIE,
  isSessionExpired,
  getRemainingSessionMs,
} from '@/lib/auth/constants';

describe('Autenticación y Sesión — Límite de 8 horas de inicio de sesión', () => {
  it('la duración máxima de sesión debe estar configurada exactamente en 8 horas (28,800 segundos)', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(8 * 60 * 60);
    expect(SESSION_MAX_AGE_SECONDS).toBe(28800);
    expect(SESSION_MAX_AGE_MS).toBe(28800000);
    expect(SESSION_START_COOKIE).toBe('amex_session_start');
  });

  it('isSessionExpired debe retornar false para una sesión recién iniciada', () => {
    const now = Date.now();
    expect(isSessionExpired(now)).toBe(false);
    expect(isSessionExpired(String(now))).toBe(false);
  });

  it('isSessionExpired debe retornar false para una sesión de 7 horas y 59 minutos', () => {
    const sevenHoursFiftyNineMinAgo = Date.now() - (7 * 3600 + 59 * 60) * 1000;
    expect(isSessionExpired(sevenHoursFiftyNineMinAgo)).toBe(false);
  });

  it('isSessionExpired debe retornar true para una sesión que superó las 8 horas (8 horas y 1 segundo)', () => {
    const eightHoursAndOneSecondAgo = Date.now() - (8 * 3600 + 1) * 1000;
    expect(isSessionExpired(eightHoursAndOneSecondAgo)).toBe(true);
    expect(isSessionExpired(String(eightHoursAndOneSecondAgo))).toBe(true);
  });

  it('isSessionExpired debe retornar true para una sesión antigua de 24 horas', () => {
    const yesterday = Date.now() - 24 * 3600 * 1000;
    expect(isSessionExpired(yesterday)).toBe(true);
  });

  it('isSessionExpired debe ser resiliente ante valores nulos o vacíos', () => {
    expect(isSessionExpired(null)).toBe(false);
    expect(isSessionExpired(undefined)).toBe(false);
    expect(isSessionExpired('')).toBe(false);
  });

  it('getRemainingSessionMs debe calcular correctamente el tiempo restante y truncar a 0 si expiró', () => {
    const now = Date.now();
    const remaining = getRemainingSessionMs(now);
    expect(remaining).toBeGreaterThan(SESSION_MAX_AGE_MS - 1000);
    expect(remaining).toBeLessThanOrEqual(SESSION_MAX_AGE_MS);

    // Si pasaron 9 horas, el restante debe ser 0
    const nineHoursAgo = Date.now() - 9 * 3600 * 1000;
    expect(getRemainingSessionMs(nineHoursAgo)).toBe(0);
  });
});
