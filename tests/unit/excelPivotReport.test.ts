import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  selectEnAlmacen,
  buildClientSummary,
  buildEnAlmacenReport
} from '@/lib/excelPivotReport';
import { Paquete } from '@/types';

function createMockPaquete(overrides: Partial<Paquete>): Paquete {
  return {
    id: 'pkg-default-id',
    numeroReciboBodega: 'WR12345',
    tracking: '1Z9999999999999999',
    nombreConsignatario: 'CLIENTE PRUEBA',
    tipoEmpaque: 'CAJA',
    pesoKg: 5.5,
    estadoAmex: 'en_almacen',
    estadoTib: 'Recibido',
    estadoEntrega: 'Recibido',
    ubicacionActual: 'Almacén Central Lince',
    posicionEstante: 'A-1',
    usuarioEmail: 'admin@amex.com',
    creadoEn: '2026-10-15T10:00:00Z',
    actualizadoEn: '2026-10-15T10:00:00Z',
    ...overrides
  } as Paquete;
}

describe('excelPivotReport - Merged Cells and Clean Border Tests', () => {
  describe('selectEnAlmacen', () => {
    it('includes en_almacen and recibido, while excluding other states', () => {
      const paquetes: Paquete[] = [
        createMockPaquete({ id: '1', estadoAmex: 'en_almacen', nombreConsignatario: 'JUAN PEREZ' }),
        createMockPaquete({ id: '2', estadoAmex: 'recibido', nombreConsignatario: 'MARIA LOPEZ' }),
        createMockPaquete({ id: '3', estadoAmex: 'entregado', nombreConsignatario: 'CARLOS DIAZ' }),
        createMockPaquete({ id: '4', estadoAmex: 'en_ruta', nombreConsignatario: 'ANA TORRES' }),
        createMockPaquete({ id: '5', estadoAmex: 'listo_recojo', nombreConsignatario: 'PEDRO RUIZ' }),
      ];

      const rows = selectEnAlmacen(paquetes);
      expect(rows).toHaveLength(2);
      expect(rows.map(r => r.cliente)).toEqual(['JUAN PEREZ', 'MARIA LOPEZ']);
    });
  });

  describe('buildClientSummary', () => {
    it('aggregates packages, holds individual items, and sorts descending by count', () => {
      const rows = [
        { cliente: 'CLIENTE B', wr: 'WR1', tracking: 'TR1', pesoKg: 10, tipo: 'CAJA' },
        { cliente: 'CLIENTE A', wr: 'WR2', tracking: 'TR2', pesoKg: 5, tipo: 'SOBRE' },
        { cliente: 'CLIENTE A', wr: 'WR3', tracking: 'TR3', pesoKg: 15, tipo: 'CAJA' },
        { cliente: 'CLIENTE C', wr: 'WR4', tracking: 'TR4', pesoKg: 20, tipo: 'BULTO' },
        { cliente: 'CLIENTE A', wr: 'WR5', tracking: 'TR5', pesoKg: 2.5, tipo: 'CAJA' },
      ];

      const summary = buildClientSummary(rows);
      expect(summary).toHaveLength(3);

      expect(summary[0].cliente).toBe('CLIENTE A');
      expect(summary[0].paquetes).toBe(3);
      expect(summary[0].items).toHaveLength(3);
      expect(summary[0].items.map(i => i.wr)).toEqual(['WR2', 'WR3', 'WR5']);
    });
  });

  describe('buildEnAlmacenReport - Merged Cells (Combinar y Centrar) Verification', () => {
    it('merges client name, client number, and package count across multiple rows', async () => {
      const paquetes: Paquete[] = [
        createMockPaquete({
          id: '1',
          estadoAmex: 'en_almacen',
          numeroReciboBodega: 'WR1001',
          tracking: 'TRK1001',
          nombreConsignatario: 'CLIENTE ALPHA & CO',
          pesoKg: 12.5,
          tipoEmpaque: 'CAJA'
        }),
        createMockPaquete({
          id: '2',
          estadoAmex: 'recibido',
          numeroReciboBodega: 'WR1002',
          tracking: 'TRK1002',
          nombreConsignatario: 'CLIENTE BETA',
          pesoKg: 7.2,
          tipoEmpaque: 'SOBRE'
        }),
        createMockPaquete({
          id: '3',
          estadoAmex: 'en_almacen',
          numeroReciboBodega: 'WR1003',
          tracking: 'TRK1003',
          nombreConsignatario: 'CLIENTE ALPHA & CO',
          pesoKg: 3.1,
          tipoEmpaque: 'CAJA'
        }),
      ];

      const blob = await buildEnAlmacenReport(paquetes);
      expect(blob).toBeInstanceOf(Blob);

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      expect(workbook.SheetNames).toEqual([
        'Carga por Cliente',
        'Totales por Cliente'
      ]);

      const sheet1 = workbook.Sheets['Carga por Cliente'];

      // Row 1: Header (unpainted, clean)
      expect(sheet1['A1'].v).toBe('N° Cliente');
      expect(sheet1['B1'].v).toBe('Cliente / Consignatario');
      expect(sheet1['C1'].v).toBe('Cant. Total Pqtes');
      expect(sheet1['D1'].v).toBe('Pqte N°');
      expect(sheet1['E1'].v).toBe('Guía WR');

      // Client ALPHA & CO (has 2 packages) has merged cells for Cols A, B, and C
      expect(sheet1['!merges']).toBeDefined();
      const merges = sheet1['!merges']!;
      expect(merges.length).toBeGreaterThanOrEqual(3);

      // Verify merge for Column B (Client name) spanning row index 1 to 2 (Excel rows 2 to 3)
      const clientNameMerge = merges.find(m => m.s.c === 1 && m.s.r === 1);
      expect(clientNameMerge).toBeDefined();
      expect(clientNameMerge!.e.r).toBe(2);

      // Package 1 of ALPHA & CO (row 2)
      expect(sheet1['B2'].v).toBe('CLIENTE ALPHA & CO');
      expect(sheet1['E2'].v).toBe('WR1001');

      // Package 2 of ALPHA & CO (row 3)
      expect(sheet1['E3'].v).toBe('WR1003');

      // Client BETA (row 4)
      expect(sheet1['B4'].v).toBe('CLIENTE BETA');
      expect(sheet1['E4'].v).toBe('WR1002');
    });
  });
});
