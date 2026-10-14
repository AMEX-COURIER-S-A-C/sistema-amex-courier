import { describe, it, expect } from 'vitest';
import {
  formatClientAndWrTabbed,
  formatClientAndWrHyphen,
  formatOnlyWrs,
  formatWhatsAppSummary,
  formatFullTableTsv,
  formatClientWrAndLocation,
  formatTrackingAndWr,
  copyTextToClipboard
} from '@/features/inventory/utils/clipboardFormats';
import { Paquete } from '@/types';

describe('clipboardFormats utilities', () => {
  const mockPackages: Paquete[] = [
    {
      id: 'pkg-1',
      numeroReciboBodega: 'WR000476345',
      tracking: 'UUS6A10880941526200',
      tipoEmpaque: 'BOLSA',
      nombreConsignatario: 'AMEX LUISA CASTILLO',
      descripcion: 'Mercadería',
      pesoKg: 1.54,
      ubicacionActual: 'AmexLince',
      posicionEstante: 'A2-P3',
      estadoAmex: 'en_almacen',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-14T10:00:00Z'
    },
    {
      id: 'pkg-2',
      numeroReciboBodega: 'WR000479920',
      tracking: 'TBA335334746477',
      tipoEmpaque: 'CAJA',
      nombreConsignatario: 'AMEX MICHAEL NIETO',
      descripcion: 'Zapatillas',
      pesoKg: 0.72,
      ubicacionActual: 'AmexLince',
      posicionEstante: 'A1-P3',
      estadoAmex: 'en_almacen',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-14T10:00:00Z'
    }
  ];

  it('formats client and WR in 2 tab-separated columns correctly', () => {
    const res = formatClientAndWrTabbed(mockPackages);
    const lines = res.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('AMEX LUISA CASTILLO\tWR000476345');
    expect(lines[1]).toBe('AMEX MICHAEL NIETO\tWR000479920');
  });

  it('formats client and WR with hyphen for chat messages', () => {
    const res = formatClientAndWrHyphen(mockPackages);
    const lines = res.split('\n');
    expect(lines[0]).toBe('AMEX LUISA CASTILLO - WR000476345');
    expect(lines[1]).toBe('AMEX MICHAEL NIETO - WR000479920');
  });

  it('formats only WRs one per line', () => {
    const res = formatOnlyWrs(mockPackages);
    expect(res).toBe('WR000476345\nWR000479920');
  });

  it('formats WhatsApp structured summary with emojis and totals', () => {
    const res = formatWhatsAppSummary(mockPackages);
    expect(res).toContain('AMEX COURIER - CONTROL DE PAQUETES');
    expect(res).toContain('2 bultos (2.26 kg)');
    expect(res).toContain('AMEX LUISA CASTILLO');
    expect(res).toContain('WR000476345');
    expect(res).toContain('A2-P3');
  });

  it('formats full table TSV with header', () => {
    const res = formatFullTableTsv(mockPackages);
    const lines = res.split('\n');
    expect(lines[0]).toContain('Guía WR\tTracking\tCliente / Consignatario');
    expect(lines[1]).toContain('WR000476345\tUUS6A10880941526200\tAMEX LUISA CASTILLO');
  });

  it('formats 3 columns (client, WR, location)', () => {
    const res = formatClientWrAndLocation(mockPackages);
    expect(res).toBe('AMEX LUISA CASTILLO\tWR000476345\tA2-P3\nAMEX MICHAEL NIETO\tWR000479920\tA1-P3');
  });

  it('formats tracking and WR', () => {
    const res = formatTrackingAndWr(mockPackages);
    expect(res).toBe('UUS6A10880941526200\tWR000476345\tAMEX LUISA CASTILLO\nTBA335334746477\tWR000479920\tAMEX MICHAEL NIETO');
  });

  it('handles empty input gracefully in copyTextToClipboard', async () => {
    const res = await copyTextToClipboard('');
    expect(res).toBe(false);
  });
});
