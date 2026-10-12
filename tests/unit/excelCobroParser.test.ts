import { describe, it, expect } from 'vitest';
import { parseExcelCobroBlock, parsePesoTotal, extractWeightsList } from '@/features/cobros/utils/excelCobroParser';

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

    expect(parsed.itemsWR).toHaveLength(2);
    expect(parsed.totalPeso).toBe(15.7);
  });

  it('intelligently detects custom tariff per kg ($7.50/kg) from pasted Excel cells with weight and price', () => {
    const excelBlock = `NOMBRE\tPESO\tPRECIO $\twr
AMEX HENRY JARED ABURTO TITO\t0.98\t$ 7.35\tWR000464276
\t3.46\t$ 25.95\tWR000462987
\t3.46\t$ 25.95\tWR000462986
TOTAL\t\t$ 59.25`;

    const parsed = parseExcelCobroBlock(excelBlock, 7.0, 3.75);

    expect(parsed.clienteNombre).toBe('AMEX HENRY JARED ABURTO TITO');
    expect(parsed.itemsWR).toHaveLength(3);
    expect(parsed.totalPeso).toBe(7.9);
    expect(parsed.totalUsd).toBe(59.25);
    expect(parsed.tarifaDetectada).toBe(7.5);
    expect(parsed.esTarifaDetectada).toBe(true);
    expect(parsed.itemsWR[0].precioUsd).toBe('7.35');
  });

  it('calculates missing prices using detected tariff from other rows', () => {
    const mixedBlock = `NOMBRE\tPESO\tPRECIO $\twr
CLIENTE TEST\t2.00\t15.00\tWR001
\t4.00\t\tWR002`;

    const parsed = parseExcelCobroBlock(mixedBlock, 7.0, 3.75);

    expect(parsed.tarifaDetectada).toBe(7.5);
    expect(parsed.itemsWR[0].precioUsd).toBe('15.00');
    // Row 2 should be calculated with 7.50, not the default 7.0!
    expect(parsed.itemsWR[1].precioUsd).toBe('30.00');
  });

  it('handles cells with multiple weights separated by hyphens and newlines (REINA SOFIA case)', () => {
    const reinaSofiaBlock = `NOMBRE\tPESO\tPRECIO $\twr
REINA SOFIA\t"2.68 - 0.34 - 3.46 -\n2.14 - 3.46 - 3.48"\t$ 93.36\t"WR000464925-WR000464855-\nWR000464850-WR000464776-\nWR000465273-WR000465272"
\t"3.44  5.50 - 1.92 -\n4.62"\t$ 92.88\t"WR000465269 WR000465264\nWR000465841-WR000465833"`;

    const parsed = parseExcelCobroBlock(reinaSofiaBlock, 7.0, 3.75);

    expect(parsed.clienteNombre).toBe('REINA SOFIA');
    expect(parsed.itemsWR).toHaveLength(2);

    // Row 1: 2.68 + 0.34 + 3.46 + 2.14 + 3.46 + 3.48 = 15.56 kg
    expect(parsed.itemsWR[0].pesoKg).toBe('2.68 - 0.34 - 3.46 - 2.14 - 3.46 - 3.48');
    expect(parsed.itemsWR[0].precioUsd).toBe('93.36');
    expect(parsed.itemsWR[0].wr).toBe('WR000464925-WR000464855-WR000464850-WR000464776-WR000465273-WR000465272');

    // Row 2: 3.44 + 5.50 + 1.92 + 4.62 = 15.48 kg
    expect(parsed.itemsWR[1].pesoKg).toBe('3.44 - 5.50 - 1.92 - 4.62');
    expect(parsed.itemsWR[1].precioUsd).toBe('92.88');

    // Total peso = 15.56 + 15.48 = 31.04 kg
    expect(parsed.totalPeso).toBe(31.04);
    // Total USD = 93.36 + 92.88 = 186.24 USD
    expect(parsed.totalUsd).toBe(186.24);

    // Tariff detection: 186.24 / 31.04 = $6.00/kg!
    expect(parsed.tarifaDetectada).toBe(6.0);
    expect(parsed.esTarifaDetectada).toBe(true);
  });

  it('correctly extracts and sums lists of weights in various formats', () => {
    expect(extractWeightsList('2.68 - 0.34 - 3.46')).toEqual([2.68, 0.34, 3.46]);
    expect(extractWeightsList('2,68 - 0,34 - 3,46')).toEqual([2.68, 0.34, 3.46]);
    expect(extractWeightsList('3.44  5.50 / 1.92\n4.62')).toEqual([3.44, 5.50, 1.92, 4.62]);
    expect(parsePesoTotal('2.68 - 0.34 - 3.46 - 2.14 - 3.46 - 3.48')).toBe(15.56);
    expect(parsePesoTotal('3.44  5.50 - 1.92 - 4.62')).toBe(15.48);
    expect(parsePesoTotal('0.98')).toBe(0.98);
    expect(parsePesoTotal('')).toBe(0);
  });
});



