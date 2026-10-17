import { describe, it, expect } from 'vitest';

describe('TIB Miami Radar & Daily Reception Logic', () => {
  it('filtra correctamente clientes que contienen AMEX (insensible a mayúsculas)', () => {
    const samplePackages = [
      { wr: '000481855', nclient: 'AMEX GABRIELA MORE', fecRegister: '2026-10-15 14:20:00', weight: '2.5' },
      { wr: '000481856', nclient: 'CLIENTE GENERAL OTRO', fecRegister: '2026-10-15 15:30:00', weight: '1.2' },
      { wr: '000481857', nclient: 'amex reynaldo murguia', fecRegister: '2026-10-15 18:40:00', weight: '5.0' },
      { wr: '000481858', nclient: 'CARLOS LOPEZ AMEX COURIER', fecRegister: '2026-10-15 19:15:30', weight: '3.1' },
      { wr: '000481859', nclient: 'AVT ADALI HUZCO', fecRegister: '2026-10-15 11:10:00', weight: '0.8' }
    ];

    const amexOnly = samplePackages.filter(p => (p.nclient || '').toUpperCase().includes('AMEX'));
    expect(amexOnly).toHaveLength(3);
    expect(amexOnly.map(p => p.wr)).toEqual(['000481855', '000481857', '000481858']);
  });

  it('calcula con precisión la primera y última hora de recepción (corte diario)', () => {
    const amexPackages = [
      { wr: '000481855', fecRegister: '2026-10-15 14:20:00', weight: '2.5' },
      { wr: '000481857', fecRegister: '2026-10-15 08:35:10', weight: '5.0' },
      { wr: '000481858', fecRegister: '2026-10-15 19:18:02', weight: '3.1' },
      { wr: '000481860', fecRegister: '2026-10-15 11:00:00', weight: '1.4' }
    ];

    const times = amexPackages.map(p => p.fecRegister.split(' ')[1]).sort();
    const primeraHora = times[0];
    const ultimaHora = times[times.length - 1];

    expect(primeraHora).toBe('08:35:10');
    expect(ultimaHora).toBe('19:18:02');

    const totalPeso = amexPackages.reduce((acc, p) => acc + Number(p.weight || 0), 0);
    expect(totalPeso).toBeCloseTo(12.0, 1);
  });

  it('formatea el código WR canónico con prefijo WR y 11 caracteres', () => {
    const rawWr = '000481855';
    const canonicalWr = rawWr.startsWith('WR') ? rawWr : `WR${rawWr.padStart(9, '0')}`;
    expect(canonicalWr).toBe('WR000481855');
    expect(canonicalWr.length).toBe(11);
  });
});
