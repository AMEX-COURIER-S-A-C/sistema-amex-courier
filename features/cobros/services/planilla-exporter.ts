import writeXlsxFile, { type SheetData, type Row } from 'write-excel-file/browser';
import type { FilaResultadoCobro } from '@/app/api/cobros/cruzar-planilla/route';
import {
  buildSimpleClientKeySet,
  classifyMultiWrGroup,
  cleanTrackingValue,
  isGroupedWrRow,
  normalizeClientNameKey,
  type MultiWrGroupClassification,
} from './wr-matching';

export type { FilaResultadoCobro };

export interface OpcionesExportarPlanilla {
  getTarifaCliente?: (clienteNombre: string) => { tarifa: number; personalizada: boolean };
  fechaReferencia?: string;
}

/**
 * Extrae la fecha del nombre del archivo instructivo o toma la fecha actual
 */
export function obtenerInfoFecha(fechaRef?: string) {
  const mesesAbrev: Record<string, number> = {
    ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
    JUL: 6, AGO: 7, SET: 8, SEP: 8, OCT: 9, NOV: 10, DIC: 11
  };
  const diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  let fecha = new Date();
  if (fechaRef) {
    const m1 = fechaRef.match(/(\d{1,2})\s*(SET|SEP|OCT|NOV|DIC|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO)/i);
    if (m1) {
      const d = parseInt(m1[1], 10);
      const m = mesesAbrev[m1[2].toUpperCase().slice(0, 3)];
      const y = fecha.getFullYear();
      fecha = new Date(y, m, d);
    } else {
      const m2 = fechaRef.match(/(\d{1,2})[-.](\d{1,2})/);
      if (m2) {
        const d = parseInt(m2[1], 10);
        const m = parseInt(m2[2], 10) - 1;
        const y = fecha.getFullYear();
        fecha = new Date(y, m, d);
      }
    }
  }

  const diaNombre = diasSemana[fecha.getDay()] || 'HOY';
  const diaStr = String(fecha.getDate()).padStart(2, '0');
  const mesStr = String(fecha.getMonth() + 1).padStart(2, '0');
  const anioStr = String(fecha.getFullYear());

  // Título sin la terminación KMMQ
  const tituloCobros = `COBROS REALIZADOS DEL DIA ${diaNombre} ${diaStr}-${mesStr}-${anioStr}`;
  const nombreHojaCobro = `COBRO ${diaStr}.${mesStr}`;

  return { fecha, diaNombre, diaStr, mesStr, anioStr, tituloCobros, nombreHojaCobro };
}

const ACCOUNTING_USD_FORMAT = '_("$ "* #,##0.00_);_("$ "* (#,##0.00);_("$ "* "-"??_);_(@_)';

/**
 * Construye la 3ra hoja ("COBRO CONSOLIDADO"):
 * - Incluye únicamente los WRs simples (1 WR por fila), preservando el orden del instructivo.
 * - Tabla continua desde la columna A: NOMBRE | PESO | PRECIO $ | wr | tracking.
 * - Combina verticalmente (rowSpan) la celda NOMBRE solo cuando hay filas consecutivas del mismo cliente TIB.
 * - Columna PRECIO $ vacía para llenado manual, con fila TOTAL al final usando fórmula =SUM(...).
 */
export function buildCobroConsolidadoSheetData(filasSimples: FilaResultadoCobro[]): SheetData {
  const ordenadasPorInstructivo = [...filasSimples].sort(
    (a, b) => (a.filaOriginal ?? Number.MAX_SAFE_INTEGER) - (b.filaOriginal ?? Number.MAX_SAFE_INTEGER)
  );

  const thinBlackBorder = {
    borderColor: '#000000',
    borderStyle: 'thin' as const,
  };

  const headerStyle = {
    fontWeight: 'bold' as const,
    backgroundColor: '#4472C4',
    textColor: '#ffffff',
    align: 'center' as const,
    alignVertical: 'center' as const,
    height: 22,
    ...thinBlackBorder,
  };

  const greenCellBase = {
    backgroundColor: '#E2EFDA',
    align: 'center' as const,
    alignVertical: 'center' as const,
    ...thinBlackBorder,
  };

  const blueCellBase = {
    backgroundColor: '#D9E1F2',
    alignVertical: 'center' as const,
    ...thinBlackBorder,
  };

  const precioCellBase = {
    align: 'right' as const,
    alignVertical: 'center' as const,
    format: ACCOUNTING_USD_FORMAT,
    ...thinBlackBorder,
  };

  const sheetData: SheetData = [
    [
      { value: 'NOMBRE', ...headerStyle },
      { value: 'PESO', ...headerStyle },
      { value: 'PRECIO $', ...headerStyle },
      { value: 'wr', ...headerStyle },
      { value: 'tracking', ...headerStyle },
    ],
  ];

  if (ordenadasPorInstructivo.length === 0) {
    return sheetData;
  }

  let idx = 0;
  while (idx < ordenadasPorInstructivo.length) {
    const clienteActual = normalizeClientNameKey(ordenadasPorInstructivo[idx].cliente) || 'SIN NOMBRE';
    let runEnd = idx + 1;
    while (
      runEnd < ordenadasPorInstructivo.length &&
      (normalizeClientNameKey(ordenadasPorInstructivo[runEnd].cliente) || 'SIN NOMBRE') === clienteActual
    ) {
      runEnd++;
    }
    const runLength = runEnd - idx;

    for (let j = idx; j < runEnd; j++) {
      const it = ordenadasPorInstructivo[j];
      const pesoNum = typeof it.pesoTotal === 'number' && it.pesoTotal > 0
        ? it.pesoTotal
        : (parseFloat(String(it.pesoFormateado || '0').replace(',', '.')) || 0);

      const cleanTracking = cleanTrackingValue(it.tracking);

      const nombreCell = j === idx
        ? {
            value: clienteActual,
            type: String,
            wrap: true,
            ...(runLength > 1 ? { rowSpan: runLength } : {}),
            ...greenCellBase,
          }
        : null;

      sheetData.push([
        nombreCell,
        {
          value: pesoNum,
          type: Number,
          format: '#,##0.00',
          align: 'right' as const,
          ...blueCellBase,
        },
        { type: Number, ...precioCellBase },
        {
          value: it.wr || '',
          type: String,
          wrap: true,
          ...greenCellBase,
        },
        cleanTracking
          ? {
              value: cleanTracking,
              type: String,
              align: 'left' as const,
              wrap: true,
              ...blueCellBase,
            }
          : {
              align: 'left' as const,
              ...blueCellBase,
            },
      ]);
    }

    idx = runEnd;
  }

  const lastDataExcelRow = ordenadasPorInstructivo.length + 1;
  sheetData.push([
    { ...greenCellBase },
    {
      value: 'TOTAL',
      type: String,
      fontWeight: 'bold' as const,
      align: 'right' as const,
      ...blueCellBase,
    },
    {
      value: `SUM(C2:C${lastDataExcelRow})`,
      type: 'Formula',
      fontWeight: 'bold' as const,
      ...precioCellBase,
    },
    { ...greenCellBase },
    { ...blueCellBase },
  ]);

  return sheetData;
}

/**
 * Genera la planilla de cobros (.xlsx) con 3 hojas:
 *
 * 1. Hoja "Cruce Planilla":
 *    - Cada fila individual lleva explícitamente el nombre de a quién le pertenece ese WR.
 *    - Pesos individuales correspondientes, sin subtotales de clientes.
 *    - Separación con 3 espacios en blanco al final.
 *    - Sección final: Celdas con WRs agrupados (con '-' o '/'), nombres concatenados y pesos delimitados.
 *
 * 2. Hoja "Plantilla Cobros" (ej. "COBRO 22.09" o "COBRO 24.09"):
 *    - Formato TAL CUAL como el archivo oficial de Cobros 22 Septiembre.
 *    - SOLO incluye los WRs que están solos y NO están agrupados varios en una celda (los agrupados los gestiona manualmente el operador).
 *    - Columna A libre (vacía, margen para operador).
 *    - Agrupado por cliente con encabezados azul amex (#4472C4) y texto blanco: NOMBRE (B) | PESO (C) | PRECIO $ (D) | wr (E) | TRACKING (F).
 *    - Nombre del cliente solo en la primera celda por cada grupo de paquetes, sin combinar celdas (sin Merge & Center) para facilitar ordenamiento y filtrado.
 *    - Columna "PRECIO $" vacía (sin cálculo automático, libre para que el operador lo llene manualmente).
 *    - Columna F con TRACKING al costado derecho del WR.
 *    - Fila TOTAL por cliente y separación limpia de 1 fila en blanco.
 *    - Título centrado sin sufijo KMMQ.
 *
 * 3. Hoja "COBRO CONSOLIDADO":
 *    - SOLO incluye WRs simples en filas individuales respetando el orden original del instructivo.
 *    - Tabla unificada desde columna A (NOMBRE | PESO | PRECIO $ | wr | tracking) con combinación vertical en filas consecutivas del mismo cliente.
 *    - Columna PRECIO $ vacía para llenado manual y fila final TOTAL con fórmula =SUM(...).
 */
export function generarHojasPlanillaCobros(
  filas: FilaResultadoCobro[],
  nombreArchivo = `PLANILLA COBROS ${new Date().toISOString().slice(0, 10)}.xlsx`,
  opciones?: OpcionesExportarPlanilla
) {
  if (filas.length === 0) {
    throw new Error('No hay filas para exportar la planilla.');
  }

  const { tituloCobros, nombreHojaCobro, diaStr, mesStr, anioStr } = obtenerInfoFecha(
    opciones?.fechaReferencia || nombreArchivo
  );

  // 1. Separar filas individuales de filas con WRs agrupados (- o /)
  const filasSimples: FilaResultadoCobro[] = [];
  const filasAgrupadas: FilaResultadoCobro[] = [];

  for (const f of filas) {
    if (isGroupedWrRow(f)) {
      filasAgrupadas.push(f);
    } else {
      filasSimples.push(f);
    }
  }

  // Ordenar alfabéticamente por cliente dentro de cada sección
  filasSimples.sort((a, b) =>
    (a.cliente || '').localeCompare(b.cliente || '', 'es') || (a.wr || '').localeCompare(b.wr || '')
  );
  filasAgrupadas.sort((a, b) =>
    (a.cliente || '').localeCompare(b.cliente || '', 'es') || (a.wr || '').localeCompare(b.wr || '')
  );

  // Clasificar grupos contra clientes de WRs simples y reunir filas promovidas a Cobros
  const simplesClientKeys = buildSimpleClientKeySet(filasSimples);
  const clasificacionesGrupos = new Map<FilaResultadoCobro, MultiWrGroupClassification>();
  const filasPromovidasACobros: FilaResultadoCobro[] = [];

  for (const g of filasAgrupadas) {
    const cls = classifyMultiWrGroup(g, simplesClientKeys);
    clasificacionesGrupos.set(g, cls);
    if (cls.status === 'full-match' && cls.combinedBillingRow) {
      filasPromovidasACobros.push(cls.combinedBillingRow);
    } else if (cls.status === 'partial-match' && cls.extractedBillingRows.length > 0) {
      filasPromovidasACobros.push(...cls.extractedBillingRows);
    }
  }

  const filasParaCobros: FilaResultadoCobro[] = [...filasSimples, ...filasPromovidasACobros];

  // =========================================================================
  // HOJA 1: "Cruce Planilla" (Referencia completa con agrupados al final)
  // =========================================================================
  const headerRowCruce: Row = [
    { value: 'NOMBRE', fontWeight: 'bold' as const },
    { value: 'PESO', fontWeight: 'bold' as const },
    { value: 'CODIGO WAREHOUSE', fontWeight: 'bold' as const },
    { value: 'TRACKING', fontWeight: 'bold' as const },
    { value: 'TIPO DE PAQUETE', fontWeight: 'bold' as const },
    { value: 'OBSERVACIONES', fontWeight: 'bold' as const },
  ];

  const dataCruce: SheetData = [
    [
      {
        value: `CRUCE PLANILLA DE INSTRUCTIVO DE EMBARQUE — ${diaStr}/${mesStr}/${anioStr} (${filas.length} FILAS TOTALES)`,
        fontWeight: 'bold' as const,
        fontSize: 12,
      },
    ],
    [],
    headerRowCruce,
  ];

  // Sección 1: WRs individuales
  for (const it of filasSimples) {
    const nombreCliente = String(it.cliente || 'SIN NOMBRE').trim().toUpperCase();
    const pesoVal = typeof it.pesoTotal === 'number' && it.pesoTotal > 0
      ? { value: it.pesoTotal, type: Number, format: '#,##0.00' }
      : { value: it.pesoFormateado || '—', type: String };

    dataCruce.push([
      { value: nombreCliente, type: String },
      pesoVal,
      { value: it.wr || '', type: String },
      it.tracking ? { value: it.tracking, type: String } : null,
      it.tipo ? { value: it.tipo, type: String } : null,
      it.observaciones ? { value: it.observaciones, type: String } : null,
    ]);
  }

  // Separación: 3 espacios en blanco antes de los WRs agrupados
  if (filasAgrupadas.length > 0) {
    dataCruce.push([]);
    dataCruce.push([]);
    dataCruce.push([]);

    dataCruce.push([
      {
        value: `WRS AGRUPADOS (${filasAgrupadas.length} GRUPOS DE GUÍAS COMBINADAS EN EL INSTRUCTIVO — SEPARADOS POR FILAS CON SU RECUADRO)`,
        fontWeight: 'bold' as const,
        fontSize: 11,
      },
    ]);
    dataCruce.push(headerRowCruce);

    let grupoIndex = 0;
    for (const it of filasAgrupadas) {
      grupoIndex++;

      const cls = clasificacionesGrupos.get(it)!;
      const detallesList = cls.detalles;
      const cantPaquetes = detallesList.length;
      const filaOriginalStr = it.filaOriginal ? `FILA INSTRUCTIVO ${it.filaOriginal}` : `GRUPO ${grupoIndex}`;

      const groupPalette =
        cls.status === 'full-match'
          ? {
              headerBg: '#DCFCE7',
              rowBg: '#F0FDF4',
              borderColor: '#16A34A',
              headerTextColor: '#166534',
              bannerText: `✅ GRUPO ${grupoIndex} — ${filaOriginalStr} | ${cantPaquetes} PAQUETES ("${it.wr}") — PASADO COMPLETO A COBRO`,
              subtotalStatus: `✓ MOVIDO A COBRO (${cantPaquetes}/${cantPaquetes})`,
              subtotalTextColor: '#15803d',
            }
          : cls.status === 'partial-match'
            ? {
                headerBg: '#FFEDD5',
                rowBg: '#FFFBEB',
                borderColor: '#EA580C',
                headerTextColor: '#9A3412',
                bannerText: `⚡ GRUPO ${grupoIndex} — ${filaOriginalStr} | ${cantPaquetes} PAQUETES ("${it.wr}") — PARCIAL: ${cls.matchedCount} A COBRO · ${cls.pendingCount} PENDIENTE`,
                subtotalStatus: `⚡ ${cls.matchedCount} A COBRO / ${cls.pendingCount} PENDIENTE`,
                subtotalTextColor: '#c2410c',
              }
            : {
                headerBg: '#FEF3C7',
                rowBg: '#FFFBEB',
                borderColor: '#D97706',
                headerTextColor: '#92400E',
                bannerText: `📦 GRUPO ${grupoIndex} — ${filaOriginalStr} | ${cantPaquetes} PAQUETES ("${it.wr}") — SIN COINCIDENCIA EN SIMPLES`,
                subtotalStatus: it.encontrado ? '⚠ SIN WR SIMPLE (NO PASADO A COBRO)' : '⚠ MATCH PARCIAL O PENDIENTE',
                subtotalTextColor: '#b45309',
              };

      // Fila vacía de separación antes de cada recuadro para que respire visualmente
      dataCruce.push([]);

      // 1. Fila de Encabezado del Recuadro de Grupo (span 6 columnas)
      dataCruce.push([
        {
          value: groupPalette.bannerText,
          columnSpan: 6,
          fontWeight: 'bold' as const,
          fontSize: 10.5,
          textColor: groupPalette.headerTextColor,
          backgroundColor: groupPalette.headerBg,
          align: 'left' as const,
          alignVertical: 'center' as const,
          height: 22,
          borderColor: groupPalette.borderColor,
          borderStyle: 'thin' as const,
          topBorderStyle: 'medium' as const,
          leftBorderStyle: 'medium' as const,
          rightBorderStyle: 'medium' as const,
        },
        null,
        null,
        null,
        null,
        null,
      ]);

      // 2. Filas individuales de cada WR dentro del recuadro
      let sumaPesosGrupo = 0;
      let tienePesos = false;

      for (let i = 0; i < detallesList.length; i++) {
        const d = detallesList[i];
        const nombreCliente = String(d.cliente || it.cliente || 'SIN NOMBRE').trim().toUpperCase();

        let pesoVal: { value: number | string; type: typeof Number | typeof String; format?: string };
        if (typeof d.peso === 'number' && d.peso > 0) {
          pesoVal = { value: d.peso, type: Number, format: '#,##0.00' };
          sumaPesosGrupo += d.peso;
          tienePesos = true;
        } else {
          pesoVal = { value: '—', type: String };
        }

        const rowBg =
          cls.status === 'partial-match'
            ? (d.matchesSimple ? '#DCFCE7' : '#FEE2E2')
            : groupPalette.rowBg;
        const rowTextColor =
          cls.status === 'partial-match'
            ? (d.matchesSimple ? '#166534' : '#991B1B')
            : undefined;
        const obsNote =
          cls.status === 'full-match'
            ? (it.observaciones ? `${it.observaciones} · ✓ Pasado a Cobro` : '✓ Pasado a Cobro')
            : cls.status === 'partial-match'
              ? (d.matchesSimple
                  ? (it.observaciones ? `${it.observaciones} · ✓ PASADO A COBRO` : '✓ PASADO A COBRO')
                  : (it.observaciones ? `${it.observaciones} · ⚠ PENDIENTE (SIN WR SIMPLE)` : '⚠ PENDIENTE (SIN WR SIMPLE)'))
              : (it.observaciones || '');

        const baseStyle = {
          backgroundColor: rowBg,
          borderColor: groupPalette.borderColor,
          borderStyle: 'thin' as const,
          alignVertical: 'center' as const,
          height: 20,
        };

        dataCruce.push([
          // Col 0: NOMBRE (Borde izquierdo medium para cerrar el recuadro por la izquierda)
          {
            ...baseStyle,
            value: nombreCliente,
            type: String,
            ...(rowTextColor ? { textColor: rowTextColor, fontWeight: 'bold' as const } : {}),
            leftBorderStyle: 'medium' as const,
          },
          // Col 1: PESO
          {
            ...baseStyle,
            ...pesoVal,
            align: 'center' as const,
            fontWeight: 'bold' as const,
            textColor: cls.status === 'partial-match' && !d.matchesSimple ? '#991B1B' : '#047857',
          },
          // Col 2: CODIGO WAREHOUSE
          {
            ...baseStyle,
            value: d.wr || '',
            type: String,
            align: 'center' as const,
            fontWeight: 'bold' as const,
            ...(rowTextColor ? { textColor: rowTextColor } : {}),
          },
          // Col 3: TRACKING
          {
            ...baseStyle,
            value: cleanTrackingValue(d.tracking) || '—',
            type: String,
            align: 'center' as const,
          },
          // Col 4: TIPO DE PAQUETE
          {
            ...baseStyle,
            value: d.tipo || it.tipo || 'CAJA',
            type: String,
            align: 'center' as const,
          },
          // Col 5: OBSERVACIONES (Borde derecho medium para cerrar el recuadro por la derecha)
          {
            ...baseStyle,
            value: obsNote,
            type: String,
            ...(rowTextColor ? { textColor: rowTextColor, fontWeight: 'bold' as const } : {}),
            rightBorderStyle: 'medium' as const,
          },
        ]);
      }

      // 3. Fila de Subtotal de Peso del Grupo (Cierre inferior del recuadro)
      const pesoTotalGrupo = tienePesos
        ? Math.round(sumaPesosGrupo * 100) / 100
        : (it.pesoTotal || 0);

      const subtotalStyle = {
        backgroundColor: groupPalette.headerBg,
        borderColor: groupPalette.borderColor,
        borderStyle: 'thin' as const,
        bottomBorderStyle: 'medium' as const,
        alignVertical: 'center' as const,
        height: 21,
      };

      dataCruce.push([
        // Col 0: Etiqueta Subtotal
        {
          ...subtotalStyle,
          value: `SUBTOTAL GRUPO ${grupoIndex} (${cantPaquetes} PAQUETES):`,
          type: String,
          align: 'right' as const,
          fontWeight: 'bold' as const,
          fontSize: 9.5,
          textColor: groupPalette.headerTextColor,
          leftBorderStyle: 'medium' as const,
        },
        // Col 1: Peso Total del Grupo
        {
          ...subtotalStyle,
          value: pesoTotalGrupo > 0 ? pesoTotalGrupo : (it.pesoFormateado || '—'),
          type: pesoTotalGrupo > 0 ? Number : String,
          format: pesoTotalGrupo > 0 ? '#,##0.00' : undefined,
          align: 'center' as const,
          fontWeight: 'bold' as const,
          textColor: '#047857',
        },
        // Col 2: Estado general del grupo
        {
          ...subtotalStyle,
          value: groupPalette.subtotalStatus,
          type: String,
          align: 'center' as const,
          fontWeight: 'bold' as const,
          fontSize: 9,
          textColor: groupPalette.subtotalTextColor,
        },
        // Col 3: Celda original
        {
          ...subtotalStyle,
          value: `Original: ${it.wr}`,
          type: String,
          fontSize: 8.5,
          textColor: '#64748b',
        },
        // Col 4: Tipo
        {
          ...subtotalStyle,
          value: '',
          type: String,
        },
        // Col 5: Borde derecho
        {
          ...subtotalStyle,
          value: '',
          type: String,
          rightBorderStyle: 'medium' as const,
        },
      ]);
    }
  }

  // =========================================================================
  // HOJA 2: "Plantilla Cobros" (TAL CUAL como archivo COBRO 22.09)
  // Incluye WRs simples + los promovidos desde grupos coincidentes.
  // Columna A libre. Columna B: NOMBRE, C: PESO, D: PRECIO $, E: wr, F: TRACKING.
  // Sin cálculo de precio (libre para operador). Título sin KMMQ.
  // =========================================================================
  const gruposPorCliente = new Map<string, FilaResultadoCobro[]>();
  for (const it of filasParaCobros) {
    const key = normalizeClientNameKey(it.cliente) || 'SIN NOMBRE';
    if (!gruposPorCliente.has(key)) {
      gruposPorCliente.set(key, []);
    }
    gruposPorCliente.get(key)!.push(it);
  }

  const clientesOrdenados = Array.from(gruposPorCliente.keys()).sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  const dataCobros: SheetData = [
    // Fila 1: Columna A libre, Título general centrado sobre las 5 columnas B..F (sin KMMQ)
    [
      null, // Columna A libre
      {
        value: tituloCobros,
        columnSpan: 5,
        fontWeight: 'bold' as const,
        fontSize: 13,
        align: 'center' as const,
        alignVertical: 'center' as const,
        height: 26,
      },
      null,
      null,
      null,
      null,
    ],
  ];

  for (const clienteNombre of clientesOrdenados) {
    const items = gruposPorCliente.get(clienteNombre) || [];
    const n = items.length;
    if (n === 0) continue;

    // Fila cabecera del cliente (Col A libre | B: NOMBRE | C: PESO | D: PRECIO $ | E: wr | F: TRACKING)
    dataCobros.push([
      null, // Columna A libre
      {
        value: 'NOMBRE',
        fontWeight: 'bold' as const,
        backgroundColor: '#4472C4',
        textColor: '#ffffff',
        align: 'center' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
        height: 20,
      },
      {
        value: 'PESO ',
        fontWeight: 'bold' as const,
        backgroundColor: '#4472C4',
        textColor: '#ffffff',
        align: 'center' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
      {
        value: 'PRECIO $',
        fontWeight: 'bold' as const,
        backgroundColor: '#4472C4',
        textColor: '#ffffff',
        align: 'center' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
      {
        value: 'wr',
        fontWeight: 'bold' as const,
        backgroundColor: '#4472C4',
        textColor: '#ffffff',
        align: 'center' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
      {
        value: 'TRACKING',
        fontWeight: 'bold' as const,
        backgroundColor: '#4472C4',
        textColor: '#ffffff',
        align: 'center' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
    ]);

    // Tarifa personalizada asignada al cliente desde el Directorio
    const tarifaInfo = opciones?.getTarifaCliente ? opciones.getTarifaCliente(clienteNombre) : null;
    const tieneTarifa = Boolean(tarifaInfo && tarifaInfo.personalizada && tarifaInfo.tarifa > 0);
    const tarifaPorKg = tieneTarifa ? tarifaInfo!.tarifa : null;
    let sumaPrecioTotal = 0;

    // Filas de datos para cada WR individual
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const pesoNum = typeof it.pesoTotal === 'number' && it.pesoTotal > 0
        ? it.pesoTotal
        : (parseFloat(it.pesoFormateado || '0') || 0);

      const precioFila = tieneTarifa && pesoNum > 0
        ? Math.round(pesoNum * tarifaPorKg! * 100) / 100
        : null;

      if (precioFila !== null) {
        sumaPrecioTotal += precioFila;
      }

      dataCobros.push([
        null, // Columna A libre
        i === 0
          ? {
              value: clienteNombre,
              align: 'center' as const,
              alignVertical: 'center' as const,
              borderColor: '#000000',
              borderStyle: 'thin' as const,
            }
          : {
              // Celdas subsiguientes sin combinar (sin Merge & Center), vacías con borde individual
              borderColor: '#000000',
              borderStyle: 'thin' as const,
            },
        {
          value: pesoNum,
          type: Number,
          format: '#,##0.00',
          align: 'center' as const,
          alignVertical: 'center' as const,
          borderColor: '#000000',
          borderStyle: 'thin' as const,
        },
        // PRECIO $: Calculado con la tarifa cruzada o vacío para llenado manual si no tiene tarifa
        precioFila !== null
          ? {
              value: precioFila,
              type: Number,
              format: '$#,##0.00',
              align: 'center' as const,
              alignVertical: 'center' as const,
              borderColor: '#000000',
              borderStyle: 'thin' as const,
            }
          : {
              borderColor: '#000000',
              borderStyle: 'thin' as const,
            },
        {
          value: it.wr || '',
          type: String,
          wrap: true,
          align: 'center' as const,
          alignVertical: 'center' as const,
          borderColor: '#000000',
          borderStyle: 'thin' as const,
        },
        {
          value: cleanTrackingValue(it.tracking),
          type: String,
          wrap: true,
          align: 'center' as const,
          alignVertical: 'center' as const,
          borderColor: '#000000',
          borderStyle: 'thin' as const,
        },
      ]);
    }

    // Fila TOTAL del cliente (PRECIO $ total calculado si tiene tarifa asignada; vacío si es manual)
    dataCobros.push([
      null, // Columna A libre
      {
        value: 'TOTAL',
        fontWeight: 'bold' as const,
        align: 'right' as const,
        alignVertical: 'center' as const,
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
      {
        borderColor: '#000000',
        borderStyle: 'thin' as const,
      },
      tieneTarifa && sumaPrecioTotal > 0
        ? {
            value: Math.round(sumaPrecioTotal * 100) / 100,
            type: Number,
            format: '$#,##0.00',
            fontWeight: 'bold' as const,
            align: 'center' as const,
            alignVertical: 'center' as const,
            borderColor: '#000000',
            borderStyle: 'thin' as const,
          }
        : {
            borderColor: '#000000',
            borderStyle: 'thin' as const,
          },
      null, // Col E (wr)
      null, // Col F (TRACKING)
    ]);

    // Fila en blanco de separación entre clientes
    dataCobros.push([]);
  }

  // =========================================================================
  // HOJA 3: "COBRO CONSOLIDADO" (Tabla continua desde Columna A, simples + promovidos)
  // =========================================================================
  const dataCobroConsolidado = buildCobroConsolidadoSheetData(filasParaCobros);

  // =========================================================================
  // EXPORTAR LIBRO CON LAS 3 HOJAS
  // =========================================================================
  const sheets = [
    {
      sheet: 'Cruce Planilla',
      data: dataCruce,
      columns: [
        { width: 44 }, // NOMBRE
        { width: 22 }, // PESO
        { width: 32 }, // CODIGO WAREHOUSE
        { width: 36 }, // TRACKING
        { width: 18 }, // TIPO DE PAQUETE
        { width: 24 }, // OBSERVACIONES
      ],
    },
    {
      sheet: nombreHojaCobro.slice(0, 31),
      data: dataCobros,
      columns: [
        { width: 14 }, // A: Libre / Vacía
        { width: 44 }, // B: NOMBRE
        { width: 14 }, // C: PESO
        { width: 16 }, // D: PRECIO $
        { width: 26 }, // E: wr
        { width: 34 }, // F: TRACKING
      ],
    },
    {
      sheet: 'COBRO CONSOLIDADO',
      data: dataCobroConsolidado,
      columns: [
        { width: 34 }, // A: NOMBRE
        { width: 12 }, // B: PESO
        { width: 15 }, // C: PRECIO $
        { width: 24 }, // D: wr
        { width: 38 }, // E: tracking
      ],
    },
  ];

  const nombreFinal = nombreArchivo.toLowerCase().endsWith('.xlsx')
    ? nombreArchivo
    : `${nombreArchivo}.xlsx`;

  return { sheets, nombreFinal, nombreHojaCobro, dataCruce, dataCobros, dataCobroConsolidado };
}

/**
 * Descarga en el navegador o genera el archivo Excel con las 3 hojas
 */
export async function exportarPlanillaCobros(
  filas: FilaResultadoCobro[],
  nombreArchivo = `PLANILLA COBROS ${new Date().toISOString().slice(0, 10)}.xlsx`,
  opciones?: OpcionesExportarPlanilla
): Promise<void> {
  const { sheets, nombreFinal } = generarHojasPlanillaCobros(filas, nombreArchivo, opciones);

  if (typeof window !== 'undefined') {
    await writeXlsxFile(sheets).toFile(nombreFinal);
  } else {
    const { default: writeXlsxFileNode } = await import('write-excel-file/node');
    await writeXlsxFileNode(sheets).toFile(nombreFinal);
  }
}
