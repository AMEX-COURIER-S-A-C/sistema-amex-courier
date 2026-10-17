import { describe, it, expect } from 'vitest';

describe('Cambio de Contraseña Seguro Unit Tests', () => {
  it('exige contraseña de al menos 8 caracteres', () => {
    const isValida = (pwd: string) => typeof pwd === 'string' && pwd.length >= 8;
    expect(isValida('1234567')).toBe(false);
    expect(isValida('')).toBe(false);
    expect(isValida('12345678')).toBe(true);
    expect(isValida('Amex2026!')).toBe(true);
  });

  it('valida que las dos contraseñas coincidan con precisión', () => {
    const areMatching = (p1: string, p2: string) => p1 === p2;
    expect(areMatching('MiClaveSegura2026', 'MiClaveSegura2026')).toBe(true);
    expect(areMatching('MiClaveSegura2026', 'MiClaveSegura2026 ')).toBe(false);
    expect(areMatching('MiClaveSegura2026', 'miclavesegura2026')).toBe(false);
  });

  it('valida que se requiera el accessToken para autenticar el cambio administrativo', () => {
    const validateRequest = (body: { accessToken?: string; newPassword?: string }) => {
      if (!body.newPassword || body.newPassword.length < 8) {
        return { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
      }
      if (!body.accessToken || typeof body.accessToken !== 'string') {
        return { ok: false, error: 'No se encontró el token de seguridad.' };
      }
      return { ok: true };
    };

    expect(validateRequest({}).ok).toBe(false);
    expect(validateRequest({ newPassword: '123' }).ok).toBe(false);
    expect(validateRequest({ newPassword: 'MiClaveValida2026' }).ok).toBe(false);
    expect(validateRequest({ newPassword: 'MiClaveValida2026', accessToken: 'valid_jwt_token' }).ok).toBe(true);
  });
});
