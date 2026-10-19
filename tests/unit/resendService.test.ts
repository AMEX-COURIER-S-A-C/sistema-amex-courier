import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, DEFAULT_FROM_EMAIL } from '@/lib/email/resend';

describe('Resend Email Service Unit Tests', () => {
  it('tiene configurado el remitente oficial de AMEX Courier con el dominio verificado', () => {
    expect(DEFAULT_FROM_EMAIL).toContain('sistemaamexcourier.online');
    expect(DEFAULT_FROM_EMAIL).toContain('AMEX Courier');
  });

  it('exporta la función sendEmail preparada para envíos asíncronos', () => {
    expect(typeof sendEmail).toBe('function');
  });
});
