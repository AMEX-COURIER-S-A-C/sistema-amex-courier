import { describe, it, expect } from 'vitest';
import { generarHojasPlanillaCobros, type FilaResultadoCobro } from '@/features/cobros/services/planilla-exporter';

describe('Módulo 4: Cobros — Exportación de Planilla Excel (Sin Merge & Center)', () => {
  it('no debe aplicar rowSpan (Merge & Center) cuando un cliente tiene múltiples WRs, dejando el nombre solo en la primera celda con bordes en las subsiguientes', () => {
    const makeMockFila = (wr: string, peso: number, tracking: string): FilaResultadoCobro => ({
      filaOriginal: 1,
      wr,
      wrs: [wr],
      esMultiWr: false,
      delimiter: '',
      cliente: 'AMEX ALEJANDRO QUIJANO',
      pesoTotal: peso,
      pesoFormateado: peso.toFixed(2),
      tracking,
      tipo: 'Aéreo',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 1,
      totalWrsFila: 1,
      detalles: [],
    });

    const mockFilas: FilaResultadoCobro[] = [
      makeMockFila('WR000466682', 2.78, 'RAW7'),
      makeMockFila('WR000466683', 3.26, 'RAW2'),
      makeMockFila('WR000466684', 2.90, 'RAW1'),
    ];

    const { dataCobros, sheets } = generarHojasPlanillaCobros(mockFilas, 'PLANILLA COBROS PRUEBA 24 SET.xlsx');

    expect(sheets).toHaveLength(2);
    expect(sheets[0].sheet).toBe('Cruce Planilla');

    // Fila 0: Título
    // Fila 1: Cabecera [null, NOMBRE, PESO, PRECIO $, wr, TRACKING]
    const headerRow = dataCobros[1];
    expect((headerRow[1] as any)?.value).toBe('NOMBRE');

    // Fila 2: Primer WR del cliente (i = 0)
    const primeraFila = dataCobros[2];
    const celdaNombre1 = primeraFila[1] as any;
    expect(celdaNombre1.value).toBe('AMEX ALEJANDRO QUIJANO');
    expect(celdaNombre1.rowSpan).toBeUndefined(); // Sin Merge & Center
    expect(celdaNombre1.borderColor).toBe('#000000');
    expect(celdaNombre1.borderStyle).toBe('thin');

    // Fila 3: Segundo WR del cliente (i = 1) -> Celda vacía con bordes, sin combinar
    const segundaFila = dataCobros[3];
    const celdaNombre2 = segundaFila[1] as any;
    expect(celdaNombre2.value).toBeUndefined();
    expect(celdaNombre2.rowSpan).toBeUndefined(); // Sin Merge & Center
    expect(celdaNombre2.borderColor).toBe('#000000');
    expect(celdaNombre2.borderStyle).toBe('thin');

    // Fila 4: Tercer WR del cliente (i = 2) -> Celda vacía con bordes, sin combinar
    const terceraFila = dataCobros[4];
    const celdaNombre3 = terceraFila[1] as any;
    expect(celdaNombre3.value).toBeUndefined();
    expect(celdaNombre3.rowSpan).toBeUndefined(); // Sin Merge & Center
    expect(celdaNombre3.borderColor).toBe('#000000');
    expect(celdaNombre3.borderStyle).toBe('thin');

    // Fila 5: Fila TOTAL
    const filaTotal = dataCobros[5];
    expect((filaTotal[1] as any)?.value).toBe('TOTAL');

    // Verificación Hoja 1: "Cruce Planilla" SIN columna "PRECIO $"
    const hojaCruce = sheets[0];
    expect(hojaCruce.columns).toHaveLength(6); // [NOMBRE, PESO, CODIGO WAREHOUSE, TRACKING, TIPO DE PAQUETE, OBSERVACIONES]

    const headerRowCruce = hojaCruce.data[2] as any[];
    const encabezados = headerRowCruce.map((c) => c?.value);
    expect(encabezados).toEqual([
      'NOMBRE',
      'PESO',
      'CODIGO WAREHOUSE',
      'TRACKING',
      'TIPO DE PAQUETE',
      'OBSERVACIONES',
    ]);
    expect(encabezados).not.toContain('PRECIO $');

    // Primera fila de datos de Cruce Planilla: índice 2 debe ser CODIGO WAREHOUSE, no PRECIO $
    const primeraFilaCruce = hojaCruce.data[3] as any[];
    expect(primeraFilaCruce[0]?.value).toBe('AMEX ALEJANDRO QUIJANO');
    expect(primeraFilaCruce[1]?.value).toBe(2.78);
    expect(primeraFilaCruce[2]?.value).toBe('WR000466682'); // CODIGO WAREHOUSE directo sin PRECIO $
    expect(primeraFilaCruce[3]?.value).toBe('RAW7'); // TRACKING
  });
});
