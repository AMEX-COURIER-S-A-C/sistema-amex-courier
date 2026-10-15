import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  selectEnAlmacen,
  buildClientSummary,
  buildEnAlmacenReport,
  escapeXml
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
  describe('escapeXml', () => {
    it('escapes standard XML special characters and strips invalid control chars', () => {
      const input = 'Empresa & Hijos <Lima> "VIP" \'2026\' \x00\x08test\x1F';
      const output = escapeXml(input);
      expect(output).toContain('&amp;');
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
      expect(output).toContain('&quot;');
      expect(output).toContain('&apos;');
      expect(output).not.toContain('\x00');
      expect(output).not.toContain('\x08');
      expect(output).not.toContain('\x1F');
      expect(output).toContain('test');
    });

    it('handles null, undefined and numbers safely', () => {
      expect(escapeXml(null)).toBe('');
      expect(escapeXml(undefined)).toBe('');
      expect(escapeXml(123.45)).toBe('123.45');
    });
  });

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

      // CLIENTE B and C both have 1 package, but C has 20kg > B with 10kg
      expect(summary[1].cliente).toBe('CLIENTE C');
      expect(summary[1].paquetes).toBe(1);
      expect(summary[1].pesoKg).toBe(20);

      expect(summary[2].cliente).toBe('CLIENTE B');
      expect(summary[2].paquetes).toBe(1);
      expect(summary[2].pesoKg).toBe(10);
    });
  });

  describe('buildEnAlmacenReport - OpenXML Package Verification', () => {
    it('throws error when no packages match "En Almacén"', async () => {
      const paquetes = [createMockPaquete({ estadoAmex: 'entregado' })];
      await expect(buildEnAlmacenReport(paquetes)).rejects.toThrow('No hay paquetes con Estado AMEX');
    });

    it('generates a valid OpenXML ZIP containing all required parts and sheets', async () => {
      const paquetes: Paquete[] = [
        createMockPaquete({ id: '1', estadoAmex: 'en_almacen', nombreConsignatario: 'CLIENTE ALPHA & CO', pesoKg: 12.5, tipoEmpaque: 'CAJA' }),
        createMockPaquete({ id: '2', estadoAmex: 'recibido', nombreConsignatario: 'CLIENTE BETA <PERU>', pesoKg: 7.2, tipoEmpaque: 'SOBRE' }),
        createMockPaquete({ id: '3', estadoAmex: 'en_almacen', nombreConsignatario: 'CLIENTE ALPHA & CO', pesoKg: 3.1, tipoEmpaque: 'CAJA' }),
      ];

      const blob = await buildEnAlmacenReport(paquetes);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Verify all required parts
      const expectedFiles = [
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/workbook.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/worksheets/sheet1.xml',
        'xl/worksheets/_rels/sheet1.xml.rels',
        'xl/worksheets/sheet2.xml',
        'xl/worksheets/sheet3.xml',
        'xl/worksheets/_rels/sheet3.xml.rels',
        'xl/worksheets/sheet4.xml',
        'xl/drawings/drawing1.xml',
        'xl/drawings/_rels/drawing1.xml.rels',
        'xl/charts/chart1.xml',
        'xl/pivotCache/pivotCacheDefinition1.xml',
        'xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels',
        'xl/pivotCache/pivotCacheRecords1.xml',
        'xl/pivotTables/pivotTable1.xml',
        'xl/pivotTables/_rels/pivotTable1.xml.rels'
      ];

      for (const filePath of expectedFiles) {
        expect(zip.file(filePath), `Falta el archivo requerido en el ZIP: ${filePath}`).not.toBeNull();
      }

      // Check XML formatting and special characters in sheet4 (Datos)
      const sheet4Xml = await zip.file('xl/worksheets/sheet4.xml')!.async('string');
      expect(sheet4Xml).toContain('CLIENTE ALPHA &amp; CO');
      expect(sheet4Xml).toContain('CLIENTE BETA &lt;PERU&gt;');

      // Check Pivot Cache definition contains refreshOnLoad
      const pivotCacheXml = await zip.file('xl/pivotCache/pivotCacheDefinition1.xml')!.async('string');
      expect(pivotCacheXml).toContain('refreshOnLoad="1"');
      expect(pivotCacheXml).toContain('sheet="Datos"');

      // Check Chart XML contains references to Resumen Clientes
      const chartXml = await zip.file('xl/charts/chart1.xml')!.async('string');
      expect(chartXml).toContain('&apos;Resumen Clientes&apos;!$A$2:$A$3');
      expect(chartXml).toContain('c:barChart');

      // Verify that SheetJS (XLSX) can read the file and inspect sheets
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      expect(workbook.SheetNames).toEqual([
        'Dashboard',
        'Resumen Clientes',
        'Tabla Dinámica',
        'Datos'
      ]);

      const datosSheet = workbook.Sheets['Datos'];
      expect(datosSheet['A1'].v).toBe('Cliente');
      expect(datosSheet['B1'].v).toBe('WR');
      expect(datosSheet['C1'].v).toBe('Tracking');
      expect(datosSheet['D1'].v).toBe('Peso (kg)');
      expect(datosSheet['E1'].v).toBe('Tipo de paquete');

      // Row 2
      expect(datosSheet['A2'].v).toBe('CLIENTE ALPHA & CO');
      expect(datosSheet['D2'].v).toBe(12.5);

      // Resumen Clientes Sheet
      const resumenSheet = workbook.Sheets['Resumen Clientes'];
      expect(resumenSheet['A1'].v).toBe('Cliente');
      expect(resumenSheet['B1'].v).toBe('Paquetes en Almacén');
      expect(resumenSheet['C1'].v).toBe('Peso Total (kg)');
      expect(resumenSheet['A2'].v).toBe('CLIENTE ALPHA & CO');
      expect(resumenSheet['B2'].v).toBe(2);
      expect(resumenSheet['C2'].v).toBe(15.6);
    });
  });
});
