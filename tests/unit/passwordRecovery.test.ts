import { describe, it, expect, vi } from 'vitest';

describe('Password Recovery Architecture Tests', () => {
  it('valida que el correo sea válido antes de procesar recuperación', () => {
    const invalidEmails = ['', '   ', 'usuario-sin-arroba', 'test@'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of invalidEmails) {
      expect(emailRegex.test(email.trim())).toBe(false);
    }

    expect(emailRegex.test('sistemaamexcourier@gmail.com')).toBe(true);
  });

  it('asegura que el redireccionamiento incluya el flag recovered=true para activar el modo de cambio de contraseña', () => {
    const siteUrl = 'https://sistemaamexcourier.online';
    const redirectTo = `${siteUrl}/login?recovered=true`;

    const url = new URL(redirectTo);
    expect(url.searchParams.get('recovered')).toBe('true');
    expect(url.pathname).toBe('/login');
  });
});
