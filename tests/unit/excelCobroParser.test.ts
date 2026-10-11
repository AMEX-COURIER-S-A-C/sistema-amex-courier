import { describe, it, expect } from 'vitest';
import { parseExcelCobroBlock } from '@/features/cobros/utils/excelCobroParser';

describe('excelCobroParser utility', () => {
  it('parses multi-row customer block from Excel with name on first row and TOTAL row at end', () => {
    const excelClipboard = `NOMBRE\tPESO\tPRECIO $\twr\tTRACKING
AMEX ALEJANDRO QUIJANO\t2.78\t\tWR000466682\tRAW7
\t3.26\t\tWR000466683\tRAW2
\t2.90\t\tWR000466684\tRAW1
\t3.20\t\tWR000466691\tRAW3
\t3.52\t\tWR000466699\tRAW4
\t2.54\t\tWR000466838\tRAW5
\t1.98\t\tWR000466861\tRAW6
TOTAL`;

    const parsed = parseExcelCobroBlock(excelClipboard, 7.0, 3.75);

    expect(parsed.clienteNombre).toBe('AMEX ALEJANDRO QUIJANO');
    expect(parsed.itemsWR).toHaveLength(7);
    expect(parsed.totalPeso).toBe(20.18);
    expect(parsed.itemsWR[0].wr).toBe('WR000466682');
    expect(parsed.itemsWR[0].pesoKg).toBe('2.78');
    expect(parsed.itemsWR[0].cajaNumero).toBe('RAW7');
    expect(parsed.itemsWR[6].wr).toBe('WR000466861');
    expect(parsed.itemsWR[6].pesoKg).toBe('1.98');
    expect(parsed.itemsWR[6].cajaNumero).toBe('RAW6');
    expect(parsed.totalUsd).toBeCloseTo(141.26, 1);
  });

  it('parses single package row without header and calculates price from weight and tariff', () => {
    const singleRow = `AMEX / IVAN LIENDO\t6.12\t\tWR000468641\tBOXDIEGO`;

    const parsed = parseExcelCobroBlock(singleRow, 7.0, 3.8);

    expect(parsed.clienteNombre).toBe('AMEX / IVAN LIENDO');
    expect(parsed.itemsWR).toHaveLength(1);
    expect(parsed.itemsWR[0].wr).toBe('WR000468641');
    expect(parsed.itemsWR[0].pesoKg).toBe('6.12');
    expect(parsed.itemsWR[0].cajaNumero).toBe('BOXDIEGO');
    expect(parsed.itemsWR[0].precioUsd).toBe('42.84');
    expect(parsed.totalPeso).toBe(6.12);
    expect(parsed.totalUsd).toBe(42.84);
  });

  it('handles empty or whitespace input gracefully', () => {
    const emptyResult = parseExcelCobroBlock('');
    expect(emptyResult.clienteNombre).toBe('');
    expect(emptyResult.itemsWR).toHaveLength(0);
    expect(emptyResult.totalPeso).toBe(0);
  });

  it('skips banner lines like COBROS REALIZADOS DEL DIA', () => {
    const withBanner = `COBROS REALIZADOS DEL DIA JUEVES 24-09-2026
NOMBRE\tPESO\tPRECIO $\twr\tTRACKING
AMEX FLAVIO MENDOZA\t9.62\t\tWR000467024\t877344720137
\t6.08\t\tWR000467518\t1ZR1C3154221232168
TOTAL`;

    const parsed = parseExcelCobroBlock(withBanner, 7.0, 3.75);

    expect(parsed.clienteNombre).toBe('AMEX FLAVIO MENDOZA');
    expect(parsed.itemsWR).toHaveLength(2);
    expect(parsed.totalPeso).toBe(15.7);
  });
});
