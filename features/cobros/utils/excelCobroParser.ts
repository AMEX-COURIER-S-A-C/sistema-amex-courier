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
  tarifaDetectada?: number;
  esTarifaDetectada?: boolean;
}

export function extractWeightsList(str: string): number[] {
  if (!str) return [];
  // Reemplazar saltos de línea por espacios
  const normalized = str.replace(/\r?\n/g, ' ');
  // Reemplazar comas decimales que están entre dígitos (ej: "2,68" -> "2.68")
  const withDots = normalized.replace(/(\d+),(\d+)/g, '$1.$2');
  // Buscar números (enteros o decimales)
  const matches = withDots.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches
    .map((m) => parseFloat(m))
    .filter((n) => !isNaN(n) && n > 0 && n < 500);
}

export function parsePesoTotal(pesoStr: string): number {
  if (!pesoStr) return 0;
  const weights = extractWeightsList(pesoStr);
  if (weights.length === 0) return 0;
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return Math.round(sum * 100) / 100;
}

export function splitTsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === '\t' && !insideQuotes) {
      currentRow.push(currentCell.trim().replace(/^["']|["']$/g, ''));
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim().replace(/^["']|["']$/g, ''));
      currentCell = '';
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim().replace(/^["']|["']$/g, ''));
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseNumericValue(val: string): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Limpiar caracteres no numéricos excepto números, punto y coma
  let cleaned = trimmed.replace(/[$sS\/]/g, '').trim();

  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Si la coma está antes del punto: "1,250.50"
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Si el punto está antes de la coma: "1.250,50"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  cleaned = cleaned.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return !isNaN(num) && num > 0 ? num : null;
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
    filasDetectadas: 0,
    tarifaDetectada: undefined,
    esTarifaDetectada: false
  };

  if (!clipboardText || !clipboardText.trim()) {
    return result;
  }

  // 1. Dividir líneas en celdas (soporta celdas TSV multilínea con quotes de Excel, punto y coma o espacios)
  let rawDataRows: string[][] = [];
  if (clipboardText.includes('\t')) {
    rawDataRows = splitTsvRows(clipboardText);
  } else {
    const rawLines = clipboardText.split(/\r?\n/);
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.includes(';')) {
        rawDataRows.push(trimmed.split(';').map((c) => c.trim().replace(/^["']|["']$/g, '')));
      } else if (/\s{2,}/.test(trimmed)) {
        rawDataRows.push(trimmed.split(/\s{2,}/).map((c) => c.trim().replace(/^["']|["']$/g, '')));
      } else {
        rawDataRows.push([trimmed]);
      }
    }
  }

  // Filtrar filas de títulos informativos y filas de TOTALES
  const dataRows: string[][] = [];
  for (const cells of rawDataRows) {
    if (cells.length === 0 || cells.every((c) => !c)) continue;
    const isBanner = cells.some((c) => /^COBROS\s+REALIZADOS/i.test(c.trim()));
    if (isBanner) continue;
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

  interface RawItem {
    wrCode: string;
    validPeso: number;
    formattedPeso: string;
    explicitPrecio: number | null;
    trackingStr: string;
  }
  const rawItems: RawItem[] = [];

  // 3. Procesar filas de datos iniciales
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
      const foundWr = cells.find((c) => /^WR[-\s]?[A-Z0-9]{4,15}/i.test(c.trim()));
      if (foundWr) wrCode = foundWr.trim();
    }

    if (!pesoStr) {
      // Buscar celda que contenga números que puedan ser pesos
      const foundPeso = cells.find((c) => {
        if (!c || /^WR/i.test(c) || /^TOTAL/i.test(c)) return false;
        const weights = extractWeightsList(c);
        return weights.length > 0;
      });
      if (foundPeso) pesoStr = foundPeso.trim();
    }

    // Limpiar WRs: reemplazar saltos de línea por guiones y remover dobles guiones
    let cleanedWr = wrCode
      .replace(/\r?\n+/g, '-')
      .replace(/\s*[-/]+\s*/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();

    // Extraer lista de pesos (soporta múltiples pesos en la misma celda: "2.68 - 0.34 - 3.46")
    const weights = extractWeightsList(pesoStr);
    const validPeso = Math.round(weights.reduce((acc, w) => acc + w, 0) * 100) / 100;
    const formattedPesoStr =
      weights.length > 1
        ? weights.map((w) => w.toFixed(2)).join(' - ')
        : weights.length === 1
        ? weights[0].toFixed(2)
        : '';

    // Si no hay WR ni peso válido, saltar fila
    if (!cleanedWr && validPeso === 0) continue;

    // Si no tiene código WR pero tiene peso, generar código referencial
    if (!cleanedWr) {
      cleanedWr = `WR-${Date.now().toString().slice(-6)}-${rawItems.length + 1}`;
    }

    const explicitPrecio = parseNumericValue(precioStr);

    rawItems.push({
      wrCode: cleanedWr,
      validPeso,
      formattedPeso: formattedPesoStr,
      explicitPrecio,
      trackingStr
    });
  }

  // 4. Detección Inteligente de Tarifa ($/kg) a partir de los datos pegados
  // Si las filas tienen peso y precio explícito en el Excel (ej: 15.56 kg a $93.36 => $6.00/kg)
  let tarifaDetectada: number | undefined = undefined;
  const rowsConPrecioYPeso = rawItems.filter((it) => it.explicitPrecio !== null && it.validPeso > 0);

  if (rowsConPrecioYPeso.length > 0) {
    const totalExplicitUsd = rowsConPrecioYPeso.reduce((acc, it) => acc + (it.explicitPrecio || 0), 0);
    const totalExplicitPeso = rowsConPrecioYPeso.reduce((acc, it) => acc + it.validPeso, 0);

    if (totalExplicitPeso > 0) {
      const calcTarifa = Math.round((totalExplicitUsd / totalExplicitPeso) * 100) / 100;
      // Validar que la tarifa esté dentro de un rango realista de courier (1 a 100 $/kg)
      if (calcTarifa >= 1 && calcTarifa <= 100) {
        tarifaDetectada = calcTarifa;
      }
    }
  }

  const effectiveTarifa = tarifaDetectada ?? tarifaPorKg;
  const parsedItems: ParsedWrRow[] = [];

  for (const rawIt of rawItems) {
    let finalPrecioNum = rawIt.explicitPrecio;
    if (finalPrecioNum === null || finalPrecioNum <= 0) {
      // Calcular automáticamente según tarifa efectiva (detectada o por defecto)
      finalPrecioNum = Math.round(rawIt.validPeso * effectiveTarifa * 100) / 100;
    }

    parsedItems.push({
      wr: rawIt.wrCode,
      pesoKg: rawIt.formattedPeso,
      precioUsd: finalPrecioNum > 0 ? finalPrecioNum.toFixed(2) : '0.00',
      cajaNumero: rawIt.trackingStr || undefined,
      notas: rawIt.trackingStr ? `Tracking/Caja: ${rawIt.trackingStr}` : undefined
    });
  }

  // Calcular totales
  const totalPeso = rawItems.reduce((acc, it) => acc + it.validPeso, 0);
  const totalUsd = parsedItems.reduce((acc, it) => acc + (parseFloat(it.precioUsd) || 0), 0);
  const totalPen = Math.round(totalUsd * tipoCambioVenta * 100) / 100;

  result.clienteNombre = detectedCliente;
  result.itemsWR = parsedItems;
  result.totalPeso = Math.round(totalPeso * 100) / 100;
  result.totalUsd = Math.round(totalUsd * 100) / 100;
  result.totalPen = totalPen;
  result.filasDetectadas = parsedItems.length;
  result.tarifaDetectada = tarifaDetectada;
  result.esTarifaDetectada = typeof tarifaDetectada === 'number';

  return result;
}
