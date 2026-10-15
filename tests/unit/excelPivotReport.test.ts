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

describe('excelPivotReport - Multi-Row per Client Tests', () => {
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

    it('sets default fallback labels when fields are empty', () => {
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
      expect(row.tipo).toBe('CAJA');
      expect(row.pesoKg).toBe(0);
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

      // CLIENTE A has 3 packages and items length 3
      expect(summary[0].cliente).toBe('CLIENTE A');
      expect(summary[0].paquetes).toBe(3);
      expect(summary[0].pesoKg).toBe(22.5);
      expect(summary[0].items).toHaveLength(3);
      expect(summary[0].items.map(i => i.wr)).toEqual(['WR2', 'WR3', 'WR5']);

      // CLIENTE C has 1 package, 20kg
      expect(summary[1].cliente).toBe('CLIENTE C');
      expect(summary[1].paquetes).toBe(1);
      expect(summary[1].pesoKg).toBe(20);

      // CLIENTE B has 1 package, 10kg
      expect(summary[2].cliente).toBe('CLIENTE B');
      expect(summary[2].paquetes).toBe(1);
      expect(summary[2].pesoKg).toBe(10);
    });
  });

  describe('buildEnAlmacenReport - Separate Rows for Multiple Packages', () => {
    it('generates multi-row structure where each package has its own dedicated row', async () => {
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

      // Row 1: Header
      expect(sheet1['A1'].v).toBe('N° Cliente');
      expect(sheet1['B1'].v).toBe('Cliente / Consignatario');
      expect(sheet1['C1'].v).toBe('Cant. Total Pqtes');
      expect(sheet1['D1'].v).toBe('Pqte N°');
      expect(sheet1['E1'].v).toBe('Guía WR');
      expect(sheet1['F1'].v).toBe('Tracking USA');
      expect(sheet1['G1'].v).toBe('Peso (Kg)');
      expect(sheet1['H1'].v).toBe('Tipo de Empaque');

      // Client ALPHA & CO has 2 packages -> Row 2 and Row 3 are separate rows!
      // Row 2: package 1 of 2
      expect(sheet1['A2'].v).toBe(1);
      expect(sheet1['B2'].v).toBe('CLIENTE ALPHA & CO');
      expect(sheet1['C2'].v).toBe(2);
      expect(sheet1['D2'].v).toBe('1 de 2');
      expect(sheet1['E2'].v).toBe('WR1001');
      expect(sheet1['F2'].v).toBe('TRK1001');
      expect(sheet1['G2'].v).toBe(12.5);
      expect(sheet1['H2'].v).toBe('CAJA');

      // Row 3: package 2 of 2 (Same client, dedicated separate row!)
      expect(sheet1['A3'].v).toBe(1);
      expect(sheet1['B3'].v).toBe('CLIENTE ALPHA & CO');
      expect(sheet1['C3'].v).toBe(2);
      expect(sheet1['D3'].v).toBe('2 de 2');
      expect(sheet1['E3'].v).toBe('WR1003');
      expect(sheet1['F3'].v).toBe('TRK1003');
      expect(sheet1['G3'].v).toBe(3.1);
      expect(sheet1['H3'].v).toBe('CAJA');

      // Row 4: Client BETA (1 package)
      expect(sheet1['A4'].v).toBe(2);
      expect(sheet1['B4'].v).toBe('CLIENTE BETA');
      expect(sheet1['C4'].v).toBe(1);
      expect(sheet1['D4'].v).toBe('1 de 1');
      expect(sheet1['E4'].v).toBe('WR1002');
      expect(sheet1['F4'].v).toBe('TRK1002');
      expect(sheet1['G4'].v).toBe(7.2);
      expect(sheet1['H4'].v).toBe('SOBRE');
    });
  });
});
