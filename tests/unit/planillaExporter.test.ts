import { describe, it, expect } from 'vitest';
import type { CellObject } from 'write-excel-file/browser';
import { generarHojasPlanillaCobros, type FilaResultadoCobro } from '@/features/cobros/services/planilla-exporter';
import {
  buildSimpleClientKeySet,
  classifyMultiWrGroup,
  extractAndNormalizeWrsFromCell,
  normalizeClientNameKey,
} from '@/features/cobros/services/wr-matching';
import { parseInstructivo } from '@/features/cobros/services/instructivo-parser';

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

  it('autocompleta códigos WR numéricos de 6 a 9 dígitos en parseInstructivo y extractAndNormalizeWrsFromCell', async () => {
    expect(extractAndNormalizeWrsFromCell('546987')).toEqual({
      wrs: ['WR000546987'],
      hadBareNumber: true,
    });
    expect(extractAndNormalizeWrsFromCell('453115-453113')).toEqual({
      wrs: ['WR000453115', 'WR000453113'],
      hadBareNumber: true,
    });
    expect(extractAndNormalizeWrsFromCell('WR000455412-WR000450716')).toEqual({
      wrs: ['WR000455412', 'WR000450716'],
      hadBareNumber: false,
    });

    const XLSX = (await import('xlsx')).default;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['#', 'CONSIGNATARIO', 'WR', 'OBSERVACIONES'],
      [1, 'OSCAR HURTADO', '453115', ''],
      [2, 'ALVARO ESPINOZA', 546987, ''],
      [3, 'GRUPO SIN PREFIJO', '453115-453113', ''],
      [4, 'CON PREFIJO', 'WR000455412', ''],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const parsed = await parseInstructivo(arrayBuffer, 'INSTRUCTIVO PRUEBA.xlsx');
    expect(parsed.totalFilas).toBe(4);
    expect(parsed.filas[0].wrs).toEqual(['WR000453115']);
    expect(parsed.filas[0].rawWr).toBe('WR000453115');
    expect(parsed.filas[1].wrs).toEqual(['WR000546987']);
    expect(parsed.filas[1].rawWr).toBe('WR000546987');
    expect(parsed.filas[2].esMultiWr).toBe(true);
    expect(parsed.filas[2].wrs).toEqual(['WR000453115', 'WR000453113']);
    expect(parsed.filas[2].rawWr).toBe('WR000453115 - WR000453113');
    expect(parsed.filas[3].rawWr).toBe('WR000455412');
  });

  it('promueve grupos homogéneos coincidentes en 1 celda combinada, extrae coincidentes parciales en grupos mixtos y colorea estados en Cruce Planilla', async () => {
    const simpleLiss: FilaResultadoCobro = {
      filaOriginal: 2,
      wr: 'WR000455650',
      wrs: ['WR000455650'],
      esMultiWr: false,
      delimiter: '',
      cliente: 'AMEX LISS CASTILLO',
      pesoTotal: 2.0,
      pesoFormateado: '2.00',
      tracking: 'TRK-S1',
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 1,
      totalWrsFila: 1,
      detalles: [],
    };

    const simpleCatalina: FilaResultadoCobro = {
      ...simpleLiss,
      filaOriginal: 3,
      wr: 'WR000455808',
      wrs: ['WR000455808'],
      cliente: 'AMEX CATALINA LICAS',
      pesoTotal: 1.5,
      pesoFormateado: '1.50',
      tracking: 'TRK-C1',
    };

    const simpleJosueDobleEspacio: FilaResultadoCobro = {
      ...simpleLiss,
      filaOriginal: 4,
      wr: 'WR000451409',
      wrs: ['WR000451409'],
      cliente: 'AMEX KDR JOSUE VENTONCILLA',
      pesoTotal: 1.0,
      pesoFormateado: '1.00',
      tracking: 'TRK-J1',
    };

    // Caso A: Grupo homogéneo cuyos WRs pertenecen a AMEX LISS CASTILLO (existe en simples) -> pasa como 1 fila combinada
    const grupoLissFullMatch: FilaResultadoCobro = {
      filaOriginal: 5,
      wr: 'WR000455631-WR000455639',
      wrs: ['WR000455631', 'WR000455639'],
      esMultiWr: true,
      delimiter: ' - ',
      cliente: 'AMEX LISS CASTILLO - AMEX LISS CASTILLO',
      pesoTotal: 4.5,
      pesoFormateado: '3.02 - 1.48',
      tracking: 'TRK-L1 - TRK-L2',
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 2,
      totalWrsFila: 2,
      detalles: [
        { wr: 'WR000455631', cliente: 'AMEX LISS CASTILLO', peso: 3.02, tracking: 'TRK-L1', tipo: 'CAJA', encontrado: true },
        { wr: 'WR000455639', cliente: 'AMEX LISS CASTILLO', peso: 1.48, tracking: 'TRK-L2', tipo: 'CAJA', encontrado: true },
      ],
    };

    // Caso B: Grupo homogéneo sin ningún WR simple (AMEX JHULINIO) -> NO pasa a hojas de cobro
    const grupoJhulinioSinSimple: FilaResultadoCobro = {
      filaOriginal: 6,
      wr: 'WR000450216-WR000450713',
      wrs: ['WR000450216', 'WR000450713'],
      esMultiWr: true,
      delimiter: ' - ',
      cliente: 'AMEX JHULINIO - AMEX JHULINIO',
      pesoTotal: 1.78,
      pesoFormateado: '1.02 - 0.76',
      tracking: 'TRK-JH1 - TRK-JH2',
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 2,
      totalWrsFila: 2,
      detalles: [
        { wr: 'WR000450216', cliente: 'AMEX JHULINIO', peso: 1.02, tracking: 'TRK-JH1', tipo: 'CAJA', encontrado: true },
        { wr: 'WR000450713', cliente: 'AMEX JHULINIO', peso: 0.76, tracking: 'TRK-JH2', tipo: 'CAJA', encontrado: true },
      ],
    };

    // Caso C: Grupo mixto donde uno coincide (AMEX CATALINA LICAS) y otro no (AMEX INK VALERIA)
    const grupoMixtoCatalina: FilaResultadoCobro = {
      filaOriginal: 7,
      wr: 'WR000455412-WR000450716',
      wrs: ['WR000455412', 'WR000450716'],
      esMultiWr: true,
      delimiter: ' - ',
      cliente: 'AMEX CATALINA LICAS - AMEX INK VALERIA',
      pesoTotal: 6.88,
      pesoFormateado: '6.46 - 0.42',
      tracking: 'TRK-M1 - -',
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 2,
      totalWrsFila: 2,
      detalles: [
        { wr: 'WR000455412', cliente: 'AMEX CATALINA LICAS', peso: 6.46, tracking: 'TRK-M1', tipo: 'CAJA', encontrado: true },
        { wr: 'WR000450716', cliente: 'AMEX INK VALERIA', peso: 0.42, tracking: '-', tipo: 'CAJA', encontrado: true },
      ],
    };

    // Caso D: Coincidencia con doble espacio en nombre de cliente TIB
    const grupoDobleEspacio: FilaResultadoCobro = {
      filaOriginal: 8,
      wr: 'WR000454239-WR000454687',
      wrs: ['WR000454239', 'WR000454687'],
      esMultiWr: true,
      delimiter: ' - ',
      cliente: 'AMEX FR SILVIA - AMEX  KDR JOSUE VENTONCILLA',
      pesoTotal: 0.94,
      pesoFormateado: '0.62 - 0.32',
      tracking: 'TRK-S - TRK-J2',
      tipo: 'CAJA',
      observaciones: '',
      descripcion: '',
      dni: '',
      encontrado: true,
      matchParcial: false,
      wrsEncontrados: 2,
      totalWrsFila: 2,
      detalles: [
        { wr: 'WR000454239', cliente: 'AMEX FR SILVIA', peso: 0.62, tracking: 'TRK-S', tipo: 'CAJA', encontrado: true },
        { wr: 'WR000454687', cliente: 'AMEX  KDR JOSUE VENTONCILLA', peso: 0.32, tracking: 'TRK-J2', tipo: 'CAJA', encontrado: true },
      ],
    };

    expect(normalizeClientNameKey('AMEX  KDR JOSUE VENTONCILLA')).toBe('AMEX KDR JOSUE VENTONCILLA');
    const keys = buildSimpleClientKeySet([simpleLiss, simpleCatalina, simpleJosueDobleEspacio]);
    expect(classifyMultiWrGroup(grupoLissFullMatch, keys).status).toBe('full-match');
    expect(classifyMultiWrGroup(grupoJhulinioSinSimple, keys).status).toBe('pending');
    expect(classifyMultiWrGroup(grupoMixtoCatalina, keys).status).toBe('partial-match');
    expect(classifyMultiWrGroup(grupoDobleEspacio, keys).status).toBe('partial-match');

    const { sheets, dataCruce, dataCobros, dataCobroConsolidado } = generarHojasPlanillaCobros(
      [
        simpleLiss,
        simpleCatalina,
        simpleJosueDobleEspacio,
        grupoLissFullMatch,
        grupoJhulinioSinSimple,
        grupoMixtoCatalina,
        grupoDobleEspacio,
      ],
      'PLANILLA COBROS 16.11.xlsx'
    );

    // En COBRO CONSOLIDADO: 1 header + 3 simples + 1 grupo Liss combinado + 2 extraídos parciales (Catalina WR000455412 y Josue WR000454687) + 1 TOTAL = 8 filas
    expect(dataCobroConsolidado).toHaveLength(8);
    const consolidadoWrValues = dataCobroConsolidado.slice(1, 7).map((r) => (r as CellObject[])[3].value);
    expect(consolidadoWrValues).toEqual([
      'WR000455650',
      'WR000455808',
      'WR000451409',
      'WR000455631 / WR000455639',
      'WR000455412',
      'WR000454687',
    ]);
    // Ninguno de Jhulinio, Valeria ni Silvia entró a Cobros
    expect(consolidadoWrValues.join(',')).not.toContain('WR000450216');
    expect(consolidadoWrValues.join(',')).not.toContain('WR000450716');
    expect(consolidadoWrValues.join(',')).not.toContain('WR000454239');

    // En COBRO DD.MM (Hoja 2) también debe estar la celda agrupada de Liss y los extraídos
    const hoja2WrValues = dataCobros.map((r) => (r[4] as CellObject | null | undefined)?.value).filter(Boolean);
    expect(hoja2WrValues).toContain('WR000455631 / WR000455639');
    expect(hoja2WrValues).toContain('WR000455412');
    expect(hoja2WrValues).toContain('WR000454687');
    expect(hoja2WrValues).not.toContain('WR000450216');

    // En Cruce Planilla (Hoja 1) verificar colores diferenciados en los grupos:
    const bannerCatalina = dataCruce.find(
      (r) => typeof (r[0] as CellObject | null)?.value === 'string' && String((r[0] as CellObject).value).includes('WR000455412-WR000450716')
    );
    expect((bannerCatalina?.[0] as CellObject).backgroundColor).toBe('#FFEDD5'); // Naranja parcial
    const wrCatalinaMovedRow = dataCruce.find((r) => (r[2] as CellObject | null)?.value === 'WR000455412');
    const wrValeriaPendingRow = dataCruce.find((r) => (r[2] as CellObject | null)?.value === 'WR000450716');
    expect((wrCatalinaMovedRow?.[0] as CellObject).backgroundColor).toBe('#DCFCE7'); // Verde movido
    expect((wrValeriaPendingRow?.[0] as CellObject).backgroundColor).toBe('#FEE2E2'); // Rojo pendiente

    const bannerLiss = dataCruce.find(
      (r) => typeof (r[0] as CellObject | null)?.value === 'string' && String((r[0] as CellObject).value).includes('WR000455631-WR000455639')
    );
    expect((bannerLiss?.[0] as CellObject).backgroundColor).toBe('#DCFCE7'); // Verde completo

    const { default: writeXlsxFileNode } = await import('write-excel-file/node');
    const buffer = await writeXlsxFileNode(sheets).toBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
