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

describe('excelPivotReport - Unit Tests', () => {
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

    it('sets SIN CLIENTE and SIN TIPO when fields are blank', () => {
      const paquetes: Paquete[] = [
        createMockPaquete({
          id: '1',
          estadoAmex: 'en_almacen',
          nombreConsignatario: '   ',
          tipoEmpaque: '',
          pesoKg: -1
        })
      ];

      const [row] = selectEnAlmacen(paquetes);
      expect(row.cliente).toBe('SIN CLIENTE');
      expect(row.tipo).toBe('SIN TIPO');
      expect(row.pesoKg).toBe(0);
    });

    it('normalizes weight to zero when null or negative', () => {
      const paquetes: Paquete[] = [
        createMockPaquete({ id: '1', estadoAmex: 'en_almacen', pesoKg: null as any }),
        createMockPaquete({ id: '2', estadoAmex: 'recibido', pesoKg: 0 }),
        createMockPaquete({ id: '3', estadoAmex: 'en_almacen', pesoKg: 12.345 })
      ];

      const rows = selectEnAlmacen(paquetes);
      expect(rows[0].pesoKg).toBe(0);
      expect(rows[1].pesoKg).toBe(0);
      expect(rows[2].pesoKg).toBe(12.35);
    });
  });

  describe('buildClientSummary', () => {
    it('groups by client, sums weights, and sorts descending by packages', () => {
      const rows = [
        { cliente: 'CLIENTE B', wr: 'WR1', tracking: 'TR1', pesoKg: 10, tipo: 'CAJA' },
        { cliente: 'CLIENTE A', wr: 'WR2', tracking: 'TR2', pesoKg: 5, tipo: 'SOBRE' },
        { cliente: 'CLIENTE A', wr: 'WR3', tracking: 'TR3', pesoKg: 15, tipo: 'CAJA' },
        { cliente: 'CLIENTE C', wr: 'WR4', tracking: 'TR4', pesoKg: 20, tipo: 'BULTO' },
        { cliente: 'CLIENTE A', wr: 'WR5', tracking: 'TR5', pesoKg: 2.5, tipo: 'CAJA' },
      ];

      const summary = buildClientSummary(rows);
      expect(summary).toHaveLength(3);
      // CLIENTE A has 3 packages (total weight 22.5)
      expect(summary[0].cliente).toBe('CLIENTE A');
      expect(summary[0].paquetes).toBe(3);
      expect(summary[0].pesoKg).toBe(22.5);
      expect(summary[0].wrs).toEqual(['WR2', 'WR3', 'WR5']);

      // CLIENTE B and C both have 1 package, but C has 20kg > B with 10kg
      expect(summary[1].cliente).toBe('CLIENTE C');
      expect(summary[1].paquetes).toBe(1);
      expect(summary[1].pesoKg).toBe(20);

      expect(summary[2].cliente).toBe('CLIENTE B');
      expect(summary[2].paquetes).toBe(1);
      expect(summary[2].pesoKg).toBe(10);
    });
  });

  describe('buildEnAlmacenReport - Multi-sheet Excel Generation', () => {
    it('throws error when no packages match "En Almacén"', async () => {
      const paquetes = [createMockPaquete({ estadoAmex: 'entregado' })];
      await expect(buildEnAlmacenReport(paquetes)).rejects.toThrow('No hay paquetes con Estado AMEX');
    });

    it('generates a clean, valid Excel workbook readable by SheetJS without errors', async () => {
      const paquetes: Paquete[] = [
        createMockPaquete({ id: '1', estadoAmex: 'en_almacen', numeroReciboBodega: 'WR1001', tracking: 'TRK1001', nombreConsignatario: 'CLIENTE ALPHA & CO', pesoKg: 12.5, tipoEmpaque: 'CAJA' }),
        createMockPaquete({ id: '2', estadoAmex: 'recibido', numeroReciboBodega: 'WR1002', tracking: 'TRK1002', nombreConsignatario: 'CLIENTE BETA', pesoKg: 7.2, tipoEmpaque: 'SOBRE' }),
        createMockPaquete({ id: '3', estadoAmex: 'en_almacen', numeroReciboBodega: 'WR1003', tracking: 'TRK1003', nombreConsignatario: 'CLIENTE ALPHA & CO', pesoKg: 3.1, tipoEmpaque: 'CAJA' }),
      ];

      const blob = await buildEnAlmacenReport(paquetes);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Verifies the two essential sheets exist
      expect(workbook.SheetNames).toEqual([
        'Resumen por Cliente',
        'Detalle de Paquetes'
      ]);

      // Sheet 1: Resumen por Cliente
      const sheet1 = workbook.Sheets['Resumen por Cliente'];
      expect(sheet1['A1'].v).toBe('N°');
      expect(sheet1['B1'].v).toBe('Cliente / Consignatario');
      expect(sheet1['C1'].v).toBe('Cant. Paquetes');
      expect(sheet1['D1'].v).toBe('Peso Total (Kg)');
      expect(sheet1['E1'].v).toBe('Guías WR en Almacén');

      // Row 2: CLIENTE ALPHA & CO has 2 packages
      expect(sheet1['B2'].v).toBe('CLIENTE ALPHA & CO');
      expect(sheet1['C2'].v).toBe(2);
      expect(sheet1['D2'].v).toBe(15.6);
      expect(sheet1['E2'].v).toContain('WR1001');
      expect(sheet1['E2'].v).toContain('WR1003');

      // Sheet 2: Detalle de Paquetes
      const sheet2 = workbook.Sheets['Detalle de Paquetes'];
      expect(sheet2['A1'].v).toBe('N°');
      expect(sheet2['B1'].v).toBe('Cliente / Consignatario');
      expect(sheet2['C1'].v).toBe('Guía WR');
      expect(sheet2['D1'].v).toBe('Tracking USA');
      expect(sheet2['E1'].v).toBe('Peso (Kg)');
      expect(sheet2['F1'].v).toBe('Tipo de Empaque');
      expect(sheet2['G1'].v).toBe('Estado AMEX');

      // Package 1
      expect(sheet2['B2'].v).toBe('CLIENTE ALPHA & CO');
      expect(sheet2['C2'].v).toBe('WR1001');
      expect(sheet2['D2'].v).toBe('TRK1001');
      expect(sheet2['E2'].v).toBe(12.5);
      expect(sheet2['F2'].v).toBe('CAJA');
      expect(sheet2['G2'].v).toBe('En Almacén');
    });
  });
});
