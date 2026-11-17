import { describe, it, expect } from 'vitest';
import type { CellObject } from 'write-excel-file/browser';
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

    expect(sheets).toHaveLength(3);
    expect(sheets[0].sheet).toBe('Cruce Planilla');
    expect(sheets[2].sheet).toBe('COBRO CONSOLIDADO');

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

  it('genera la 3ra hoja COBRO CONSOLIDADO solo con WRs simples en orden del instructivo, rowSpan en consecutivos, PRECIO $ libre y fórmula SUM en TOTAL', async () => {
    const makeFila = (
      filaOriginal: number,
      cliente: string,
      wr: string,
      peso: number,
      tracking: string,
      esMultiWr = false
    ): FilaResultadoCobro => ({
      filaOriginal,
      wr,
      wrs: esMultiWr ? wr.split(' / ') : [wr],
      esMultiWr,
      delimiter: esMultiWr ? ' / ' : '',
      cliente,
      pesoTotal: peso,
      pesoFormateado: peso.toFixed(2),
      tracking,
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 1,
      totalWrsFila: esMultiWr ? 2 : 1,
      detalles: [],
    });

    // Simulamos filas ya ordenadas alfabéticamente por UI, pero con filaOriginal del instructivo:
    // Orden real en instructivo:
    // fila 2: FLAVIO MENDOZA (2.16)
    // fila 3: FLAVIO MENDOZA (3.70)  -> consecutivo con fila 2 => rowSpan: 2
    // fila 4: [MULTI-WR] GABRIELLA MORE -> excluido de COBRO CONSOLIDADO
    // fila 5: IVAN LIENDO (0.98)
    // fila 6: WHINY ESTEBAN (11.60)
    // fila 7: IVAN LIENDO (0.58)     -> mismo cliente pero NO consecutivo => fila separada sin unir con fila 5
    const inputOrdenadoPorCliente: FilaResultadoCobro[] = [
      makeFila(2, 'FLAVIO MENDOZA', 'WR000453710', 2.16, '-'),
      makeFila(3, 'FLAVIO MENDOZA', 'WR000454346', 3.70, ''),
      makeFila(4, 'GABRIELLA MORE', 'WR000452047 / WR000452238', 12.28, 'TBA1 / TBA2', true),
      makeFila(5, 'IVAN LIENDO', 'WR000454878', 0.98, ''),
      makeFila(7, 'IVAN LIENDO', 'WR000452841', 0.58, ''),
      makeFila(6, 'WHINY ESTEBAN', 'WR000454524', 11.60, '1Z78Y4120425181046'),
    ];

    const { sheets, dataCobroConsolidado } = generarHojasPlanillaCobros(
      inputOrdenadoPorCliente,
      'PLANILLA COBROS 16.11.xlsx',
      { getTarifaCliente: () => ({ tarifa: 10, personalizada: true }) }
    );

    const hojaConsolidado = sheets[2];
    expect(hojaConsolidado.sheet).toBe('COBRO CONSOLIDADO');
    expect(hojaConsolidado.columns).toHaveLength(5);

    // Fila 1 (índice 0): Cabeceras desde Columna A
    const header = dataCobroConsolidado[0] as CellObject[];
    expect(header.map((c) => c.value)).toEqual(['NOMBRE', 'PESO', 'PRECIO $', 'wr', 'tracking']);
    expect(header[0].backgroundColor).toBe('#4472C4');

    // Filas 2..6 (índices 1..5): 5 WRs simples en orden del instructivo (multi-WR excluido)
    expect(dataCobroConsolidado).toHaveLength(7); // 1 header + 5 datos + 1 TOTAL

    const row2 = dataCobroConsolidado[1] as CellObject[];
    expect(row2[0].value).toBe('FLAVIO MENDOZA');
    expect(row2[0].rowSpan).toBe(2);
    expect(row2[0].backgroundColor).toBe('#E2EFDA');
    expect(row2[1].value).toBe(2.16);
    expect(row2[1].backgroundColor).toBe('#D9E1F2');
    expect(row2[2].value).toBeUndefined(); // PRECIO $ libre incluso si tiene tarifa personalizada
    expect(row2[3].value).toBe('WR000453710');
    expect(row2[4].value).toBeUndefined(); // '-' limpiado a vacío

    const row3 = dataCobroConsolidado[2] as CellObject[];
    expect(row3[0]).toBeNull(); // Celda cubierta por rowSpan: 2
    expect(row3[3].value).toBe('WR000454346');

    const row4 = dataCobroConsolidado[3] as CellObject[];
    expect(row4[0].value).toBe('IVAN LIENDO');
    expect(row4[0].rowSpan).toBeUndefined();

    const row5 = dataCobroConsolidado[4] as CellObject[];
    expect(row5[0].value).toBe('WHINY ESTEBAN');
    expect(row5[4].value).toBe('1Z78Y4120425181046');

    const row6 = dataCobroConsolidado[5] as CellObject[];
    expect(row6[0].value).toBe('IVAN LIENDO');
    expect(row6[0].rowSpan).toBeUndefined();

    // Fila 7 (índice 6): TOTAL con fórmula SUM(C2:C6)
    const rowTotal = dataCobroConsolidado[6] as CellObject[];
    expect(rowTotal[1].value).toBe('TOTAL');
    expect(rowTotal[2].type).toBe('Formula');
    expect(rowTotal[2].value).toBe('SUM(C2:C6)');

    // Validar generación real del .xlsx con write-excel-file/node + JSZip
    const { default: writeXlsxFileNode } = await import('write-excel-file/node');
    const JSZip = (await import('jszip')).default;
    const buffer = await writeXlsxFileNode(sheets).toBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const sheet3Xml = await zip.file('xl/worksheets/sheet3.xml')?.async('string');
    expect(sheet3Xml).toBeDefined();
    expect(sheet3Xml).toContain('<mergeCell ref="A2:A3"/>');
    expect(sheet3Xml).toContain('<f>SUM(C2:C6)</f>');
  });
});
