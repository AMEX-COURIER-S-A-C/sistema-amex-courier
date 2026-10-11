/**
 * Parser inteligente de celdas copiadas desde Excel para el módulo de Cobros.
 * Detecta automáticamente:
 * - Nombre del cliente (incluso en bloques multilínea donde solo aparece en la primera fila)
 * - Códigos WR (ej: WR000466682)
 * - Pesos en kg (soporta punto o coma decimal: 2.78 o 2,78)
 * - Precios en USD ($) o cálculo automático según tarifa $/kg
 * - Tracking o caja (ej: RAW7, BOXDIEGO, 534514634279)
 * - Omite encabezados ('NOMBRE', 'PESO', 'WR'...) y filas de 'TOTAL' o títulos diarios.
 */

export interface ParsedWrRow {
  wr: string;
  pesoKg: string;
  precioUsd: string;
  cajaNumero?: string;
  consignatarioNombre?: string;
  notas?: string;
}

export interface ParsedExcelCobroResult {
  clienteNombre: string;
  itemsWR: ParsedWrRow[];
  totalPeso: number;
  totalUsd: number;
  totalPen: number;
  filasDetectadas: number;
}

export function parseExcelCobroBlock(
  clipboardText: string,
  tarifaPorKg: number = 7.0,
  tipoCambioVenta: number = 3.75
): ParsedExcelCobroResult {
  const result: ParsedExcelCobroResult = {
    clienteNombre: '',
    itemsWR: [],
    totalPeso: 0,
    totalUsd: 0,
    totalPen: 0,
    filasDetectadas: 0
  };

  if (!clipboardText || !clipboardText.trim()) {
    return result;
  }

  const rawLines = clipboardText.split(/\r?\n/);
  const dataRows: string[][] = [];

  // 1. Dividir líneas en celdas (soporta TSV de Excel, punto y coma, o múltiples espacios)
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Saltar líneas de títulos informativos de Excel como "COBROS REALIZADOS DEL DIA..."
    if (/^COBROS\s+REALIZADOS/i.test(trimmed)) continue;

    // Dividir celdas
    let cells: string[] = [];
    if (rawLine.includes('\t')) {
      cells = rawLine.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else if (trimmed.includes(';')) {
      cells = trimmed.split(';').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else if (/\s{2,}/.test(trimmed)) {
      cells = trimmed.split(/\s{2,}/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else if (trimmed.includes(',') && !/^\d+,\d+$/.test(trimmed)) {
      cells = trimmed.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else {
      cells = [trimmed];
    }

    // Saltar filas que sean solo 'TOTAL' o 'TOTALES'
    const isTotalRow = cells.some((c) => /^TOTAL(ES)?$/i.test(c.trim()));
    if (isTotalRow) continue;

    dataRows.push(cells);
  }

  if (dataRows.length === 0) return result;

  // 2. Detectar si la primera fila es encabezado
  let hasHeader = false;
  let idxNombre = 0;
  let idxPeso = 1;
  let idxPrecio = 2;
  let idxWr = 3;
  let idxTracking = 4;

  const firstRow = dataRows[0];
  // Un encabezado real tiene palabras exactas como 'NOMBRE', 'PESO', 'PRECIO $', 'WR', 'TRACKING' (no valores con números de WR como WR000123)
  const isHeaderRow =
    firstRow.some((c) => /^(NOMBRE|CLIENTE|CONSIGNATARIO)$/i.test(c.trim())) ||
    (firstRow.some((c) => /^(PESO|KG|PESO\s*\(KG\))$/i.test(c.trim())) &&
      firstRow.some((c) => /^(WR|CODIGO|PRECIO|TRACKING)$/i.test(c.trim())));

  if (isHeaderRow) {
    hasHeader = true;
    firstRow.forEach((col, idx) => {
      const lower = col.trim().toLowerCase();
      if (/nombre|cliente/i.test(lower)) idxNombre = idx;
      else if (/peso|kg/i.test(lower)) idxPeso = idx;
      else if (/precio|usd|\$/i.test(lower)) idxPrecio = idx;
      else if (/^(wr|warehouse|c[oó]digo\s*wr|c[oó]digo)$/i.test(lower)) idxWr = idx;
      else if (/tracking|caja|guia/i.test(lower)) idxTracking = idx;
    });
  }

  const rowsToProcess = hasHeader ? dataRows.slice(1) : dataRows;
  let detectedCliente = '';
  const parsedItems: ParsedWrRow[] = [];

  // 3. Procesar filas de datos
  for (const cells of rowsToProcess) {
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    // Detectar nombre del cliente si aún no se ha detectado y existe en esta fila
    let candidateName = '';
    if (cells[idxNombre] && cells[idxNombre].trim()) {
      const cellVal = cells[idxNombre].trim();
      // Asegurarse de que no sea un código WR, ni número, ni 'TOTAL'
      if (!/^WR\d+/i.test(cellVal) && !/^\d+(\.\d+)?$/.test(cellVal) && !/^TOTAL/i.test(cellVal)) {
        candidateName = cellVal;
      }
    }

    if (!detectedCliente && candidateName) {
      detectedCliente = candidateName;
    }

    // Extraer campos de la fila
    let wrCode = '';
    let pesoStr = '';
    let precioStr = '';
    let trackingStr = '';

    // Intento 1: Por índices detectados
    if (cells[idxWr]) wrCode = cells[idxWr].trim();
    if (cells[idxPeso]) pesoStr = cells[idxPeso].trim();
    if (cells[idxPrecio]) precioStr = cells[idxPrecio].trim();
    if (cells[idxTracking]) trackingStr = cells[idxTracking].trim();

    // Intento 2: Búsqueda flexible de campos si no coinciden por índice
    if (!wrCode || !/^WR/i.test(wrCode)) {
      const foundWr = cells.find((c) => /^WR[-\s]?[A-Z0-9]{4,15}$/i.test(c.trim()));
      if (foundWr) wrCode = foundWr.trim();
    }

    if (!pesoStr) {
      // Buscar celda numérica con decimales que no sea el WR ni precio si ya existe
      const foundPeso = cells.find((c) => {
        const cleaned = c.replace(',', '.').trim();
        const num = parseFloat(cleaned);
        return !isNaN(num) && num > 0 && num < 500 && !/^WR/i.test(c);
      });
      if (foundPeso) pesoStr = foundPeso.trim();
    }

    // Normalizar peso a número con punto decimal
    const pesoNum = parseFloat(pesoStr.replace(',', '.'));
    const validPeso = !isNaN(pesoNum) && pesoNum > 0 ? pesoNum : 0;

    // Si no hay WR ni peso válido, saltar fila
    if (!wrCode && validPeso === 0) continue;

    // Si no tiene código WR pero tiene peso, generar código referencial
    if (!wrCode) {
      wrCode = `WR-${Date.now().toString().slice(-6)}-${parsedItems.length + 1}`;
    }

    // Normalizar precio USD
    let precioNum = parseFloat(precioStr.replace(/[^0-9.]/g, ''));
    if (isNaN(precioNum) || precioNum <= 0) {
      // Calcular automáticamente según tarifa
      precioNum = Math.round(validPeso * tarifaPorKg * 100) / 100;
    }

    parsedItems.push({
      wr: wrCode.toUpperCase(),
      pesoKg: validPeso > 0 ? validPeso.toFixed(2) : '',
      precioUsd: precioNum > 0 ? precioNum.toFixed(2) : '0.00',
      cajaNumero: trackingStr || undefined,
      notas: trackingStr ? `Tracking/Caja: ${trackingStr}` : undefined
    });
  }

  // Calcular totales
  const totalPeso = parsedItems.reduce((acc, it) => acc + (parseFloat(it.pesoKg) || 0), 0);
  const totalUsd = parsedItems.reduce((acc, it) => acc + (parseFloat(it.precioUsd) || 0), 0);
  const totalPen = Math.round(totalUsd * tipoCambioVenta * 100) / 100;

  result.clienteNombre = detectedCliente;
  result.itemsWR = parsedItems;
  result.totalPeso = Math.round(totalPeso * 100) / 100;
  result.totalUsd = Math.round(totalUsd * 100) / 100;
  result.totalPen = totalPen;
  result.filasDetectadas = parsedItems.length;

  return result;
}
