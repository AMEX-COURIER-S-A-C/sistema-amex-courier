import { describe, it, expect } from 'vitest';
import { isValidWr, cleanWr, WR_LENGTH, WR_PREFIX } from '@/lib/validations/wr';

describe('Bulk Location WR Format Validation — Módulo 6.5', () => {
  it('identifica correctamente WRs canónicos de 11 caracteres', () => {
    expect(isValidWr('WR000481855')).toBe(true);
    expect(isValidWr('WR000479861')).toBe(true);
    expect(isValidWr('WR000482016')).toBe(true);
  });

  it('detecta códigos con más de 11 caracteres (ej: caso real WR0004798611 de 12 car.)', () => {
    const code = 'WR0004798611';
    expect(code.length).toBe(12);
    expect(isValidWr(code)).toBe(false);
  });

  it('detecta códigos con menos de 11 caracteres (ej: WR481855)', () => {
    const shortCode = 'WR481855';
    expect(shortCode.length).toBe(8);
    expect(isValidWr(shortCode)).toBe(false);
  });

  it('detecta códigos que no inician con el prefijo WR obligatorio', () => {
    expect(isValidWr('TBA123456789')).toBe(false);
    expect(isValidWr('1Z9999999999')).toBe(false);
    expect(isValidWr('GUIA')).toBe(false);
    expect(isValidWr('TOTAL')).toBe(false);
  });

  it('función de auditoría en memoria clasifica con exactitud los códigos válidos e inválidos', () => {
    const samplePastedCodes = [
      'WR000481855',
      'WR0004798611', // 12 caracteres (inválido)
      'WR000482304',
      'WR481855',     // 8 caracteres (inválido)
      'GUIA'          // cabecera de texto (inválido)
    ];

    const invalid = samplePastedCodes
      .map((code, index) => {
        const clean = cleanWr(code);
        if (!clean.startsWith(WR_PREFIX)) {
          return { index: index + 1, code, motivo: `No comienza con "${WR_PREFIX}"` };
        }
        if (clean.length !== WR_LENGTH) {
          return { index: index + 1, code, motivo: `Longitud ${clean.length} distinta de ${WR_LENGTH}` };
        }
        if (!isValidWr(clean)) {
          return { index: index + 1, code, motivo: 'Caracteres no permitidos' };
        }
        return null;
      })
      .filter(Boolean);

    expect(invalid).toHaveLength(3);
    expect(invalid[0]?.code).toBe('WR0004798611');
    expect(invalid[1]?.code).toBe('WR481855');
    expect(invalid[2]?.code).toBe('GUIA');
  });
});
