import type { FilaResultadoCobro } from '@/app/api/cobros/cruzar-planilla/route';

export interface GrupoDetalleItem {
  wr: string;
  tracking: string;
  cliente: string;
  tipo: string;
  peso: number | null;
  encontrado: boolean;
}

export interface GrupoDetalleClasificado extends GrupoDetalleItem {
  clientKey: string;
  matchesSimple: boolean;
}

export type MultiWrGroupStatus = 'full-match' | 'partial-match' | 'pending';

export interface MultiWrGroupClassification {
  status: MultiWrGroupStatus;
  matchedCount: number;
  pendingCount: number;
  detalles: GrupoDetalleClasificado[];
  /** Fila única combinada cuando todo el grupo pertenece al mismo cliente con WR simple. */
  combinedBillingRow: FilaResultadoCobro | null;
  /** Filas individuales extraídas cuando el grupo es mixto y solo parte coincide con WR simple. */
  extractedBillingRows: FilaResultadoCobro[];
}

export type WrNormalizationReason = 'sin-prefijo' | 'ceros-completados';

export interface NormalizedWrDetail {
  original: string;
  normalizado: string;
  motivo: WrNormalizationReason;
}

const INSTRUCTIVO_WR_TOKEN_RE = /(?:WR\d+|\b\d{6,9}\b)/gi;

/**
 * Normaliza un código WR individual.
 * - Si viene sin prefijo (6 a 9 dígitos, ej. "453115"), lo completa a "WR000453115".
 * - Si ya inicia con "WR" y tiene 6 a 9 dígitos, lo rellena con ceros a 9 dígitos.
 */
export function normalizeInstructivoWrToken(rawToken: string): string {
  const clean = String(rawToken || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!clean) return '';

  if (/^\d{6,9}$/.test(clean)) {
    return `WR${clean.padStart(9, '0')}`;
  }

  const wrDigitsMatch = clean.match(/^WR(\d+)$/);
  if (wrDigitsMatch) {
    const digits = wrDigitsMatch[1];
    if (digits.length >= 6 && digits.length <= 9) {
      return `WR${digits.padStart(9, '0')}`;
    }
    return `WR${digits}`;
  }

  return clean;
}

/**
 * Extrae y normaliza todos los códigos WR presentes en una celda del instructivo,
 * aceptando tanto códigos con prefijo ("WR000452551") como numéricos de 6 a 9 dígitos ("453115"),
 * registrando cada código autocompletado o completado con ceros.
 */
export function extractAndNormalizeWrsFromCell(rawCell: string): {
  wrs: string[];
  hadBareNumber: boolean;
  wasNormalized: boolean;
  normalizedItems: NormalizedWrDetail[];
} {
  const text = String(rawCell || '').trim();
  const rawMatches = text.match(INSTRUCTIVO_WR_TOKEN_RE) || [];
  const wrs: string[] = [];
  const normalizedItems: NormalizedWrDetail[] = [];
  let hadBareNumber = false;

  for (const rawToken of rawMatches) {
    const tokenCleanUpper = rawToken.trim().toUpperCase();
    const normalized = normalizeInstructivoWrToken(tokenCleanUpper);
    if (!normalized) continue;
    wrs.push(normalized);

    if (!tokenCleanUpper.startsWith('WR')) {
      hadBareNumber = true;
      normalizedItems.push({
        original: rawToken.trim(),
        normalizado: normalized,
        motivo: 'sin-prefijo',
      });
    } else if (tokenCleanUpper !== normalized) {
      normalizedItems.push({
        original: rawToken.trim(),
        normalizado: normalized,
        motivo: 'ceros-completados',
      });
    }
  }

  return {
    wrs,
    hadBareNumber,
    wasNormalized: normalizedItems.length > 0,
    normalizedItems,
  };
}

/**
 * Obtiene el detalle de normalizaciones WR asociadas a una fila del cruce,
 * reconstruyéndolo desde `wrOriginal` si aún no estuviera hidratado.
 */
export function getRowNormalizedWrs(
  f: Pick<FilaResultadoCobro, 'wrOriginal' | 'wrsNormalizados'>
): NormalizedWrDetail[] {
  if (Array.isArray(f.wrsNormalizados) && f.wrsNormalizados.length > 0) {
    return f.wrsNormalizados;
  }
  if (f.wrOriginal) {
    return extractAndNormalizeWrsFromCell(f.wrOriginal).normalizedItems;
  }
  return [];
}

/**
 * Formatea una nota concisa de auditoría para la columna OBSERVACIONES del Excel.
 */
export function formatWrNormalizationNote(items: NormalizedWrDetail[]): string {
  if (!items || items.length === 0) return '';
  if (items.length === 1) {
    return `WR original: ${items[0].original} → ${items[0].normalizado}`;
  }
  return `WRs originales: ${items.map((i) => `${i.original} → ${i.normalizado}`).join(', ')}`;
}

/**
 * Normaliza el nombre del cliente colapsando espacios múltiples para comparaciones confiables.
 */
export function normalizeClientNameKey(name: string | null | undefined): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function cleanTrackingValue(tracking: string | null | undefined): string {
  const trimmed = String(tracking || '').trim();
  return trimmed === '-' ? '' : trimmed;
}

export function isGroupedWrRow(f: FilaResultadoCobro): boolean {
  if (f.esMultiWr) return true;
  if (Array.isArray(f.wrs) && f.wrs.length > 1) return true;
  const wrStr = String(f.wr || '').trim();
  if (wrStr.includes('-') || wrStr.includes('/') || wrStr.includes(',')) return true;
  const matches = wrStr.match(/WR\d+/gi);
  return Boolean(matches && matches.length > 1);
}

export function getGroupDetailsList(f: FilaResultadoCobro): GrupoDetalleItem[] {
  if (Array.isArray(f.detalles) && f.detalles.length > 0) {
    return f.detalles;
  }

  const wrList = f.wrs && f.wrs.length > 0 ? f.wrs : [f.wr];
  return wrList.map((w, idx) => ({
    wr: w,
    tracking: f.tracking ? f.tracking.split(/[-/]/)[idx]?.trim() || '' : '',
    cliente: f.cliente ? f.cliente.split(/[-/]/)[idx]?.trim() || f.cliente : 'SIN NOMBRE',
    tipo: f.tipo || 'CAJA',
    peso: null,
    encontrado: f.encontrado,
  }));
}

function isValidClientKey(clientKey: string): boolean {
  return Boolean(
    clientKey &&
    clientKey !== 'SIN NOMBRE' &&
    clientKey !== 'SIN CLIENTE'
  );
}

export function buildSimpleClientKeySet(filasSimples: FilaResultadoCobro[]): Set<string> {
  const keys = new Set<string>();
  for (const f of filasSimples) {
    const key = normalizeClientNameKey(f.cliente);
    if (isValidClientKey(key)) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Clasifica un grupo multi-WR frente al conjunto de clientes con WRs simples:
 * - full-match: todos los WRs del grupo pertenecen al mismo cliente TIB y ese cliente aparece en WRs simples -> pasa como 1 fila combinada.
 * - partial-match: grupo mixto donde al menos 1 WR coincide con un cliente simple -> se extraen los coincidentes en filas individuales y se marca el resto como pendiente.
 * - pending: ningún WR coincide con un cliente simple (aunque el grupo sea homogéneo) -> se mantiene solo en Cruce Planilla.
 */
export function classifyMultiWrGroup(
  f: FilaResultadoCobro,
  simplesClientKeys: Set<string>
): MultiWrGroupClassification {
  const rawDetalles = getGroupDetailsList(f);

  const detalles: GrupoDetalleClasificado[] = rawDetalles.map((d) => {
    const clientKey = normalizeClientNameKey(d.cliente || (rawDetalles.length === 1 ? f.cliente : ''));
    const validKey = isValidClientKey(clientKey);
    const matchesSimple = validKey && simplesClientKeys.has(clientKey);
    return {
      ...d,
      clientKey,
      matchesSimple,
    };
  });

  const matchedCount = detalles.filter((d) => d.matchesSimple).length;
  const pendingCount = detalles.length - matchedCount;

  const uniqueValidKeys = new Set(detalles.map((d) => d.clientKey).filter(isValidClientKey));
  const allHaveSameValidClient =
    detalles.length > 0 &&
    uniqueValidKeys.size === 1 &&
    detalles.every((d) => isValidClientKey(d.clientKey));

  const singleClientKey = allHaveSameValidClient ? Array.from(uniqueValidKeys)[0] : '';
  const isFullMatch = Boolean(allHaveSameValidClient && simplesClientKeys.has(singleClientKey));

  if (isFullMatch) {
    const pesos = detalles.map((d) => (typeof d.peso === 'number' && Number.isFinite(d.peso) ? d.peso : 0));
    const totalPeso = Math.round(pesos.reduce((acc, p) => acc + p, 0) * 100) / 100;
    const wrCombined = detalles.map((d) => d.wr).filter(Boolean).join(' / ') || f.wr;
    const trackings = detalles.map((d) => cleanTrackingValue(d.tracking)).filter(Boolean);
    const trackingCombined = trackings.join(' / ');

    const combinedBillingRow: FilaResultadoCobro = {
      ...f,
      wr: wrCombined,
      wrs: detalles.map((d) => d.wr),
      esMultiWr: true,
      delimiter: ' / ',
      cliente: singleClientKey,
      pesoTotal: totalPeso > 0 ? totalPeso : f.pesoTotal,
      pesoFormateado:
        totalPeso > 0
          ? totalPeso.toFixed(2)
          : f.pesoFormateado,
      tracking: trackingCombined,
      encontrado: detalles.every((d) => d.encontrado),
      matchParcial: false,
      wrsEncontrados: detalles.filter((d) => d.encontrado).length,
      totalWrsFila: detalles.length,
    };

    return {
      status: 'full-match',
      matchedCount: detalles.length,
      pendingCount: 0,
      detalles,
      combinedBillingRow,
      extractedBillingRows: [],
    };
  }

  if (matchedCount > 0) {
    const extractedBillingRows: FilaResultadoCobro[] = detalles
      .filter((d) => d.matchesSimple)
      .map((d) => {
        const pesoNum = typeof d.peso === 'number' && Number.isFinite(d.peso) ? Math.round(d.peso * 100) / 100 : null;
        return {
          filaOriginal: f.filaOriginal,
          wr: d.wr,
          wrs: [d.wr],
          esMultiWr: false,
          delimiter: '',
          cliente: d.clientKey,
          pesoFormateado: pesoNum !== null ? pesoNum.toFixed(2) : '—',
          pesoTotal: pesoNum,
          tracking: cleanTrackingValue(d.tracking),
          tipo: d.tipo || f.tipo || 'CAJA',
          observaciones: f.observaciones || '',
          descripcion: f.descripcion || '',
          dni: f.dni || '',
          encontrado: d.encontrado,
          matchParcial: false,
          wrsEncontrados: d.encontrado ? 1 : 0,
          totalWrsFila: 1,
          detalles: [d],
        };
      });

    return {
      status: 'partial-match',
      matchedCount,
      pendingCount,
      detalles,
      combinedBillingRow: null,
      extractedBillingRows,
    };
  }

  return {
    status: 'pending',
    matchedCount: 0,
    pendingCount: detalles.length,
    detalles,
    combinedBillingRow: null,
    extractedBillingRows: [],
  };
}

/**
 * Recalcula estado agregado, cliente, peso y tracking de una fila tras enriquecer sus `detalles`.
 */
export function recalculateRowFromDetails(f: FilaResultadoCobro): void {
  const detalles = Array.isArray(f.detalles) ? f.detalles : [];
  if (detalles.length === 0) return;

  const wrsEncontrados = detalles.filter((d) => d.encontrado).length;
  f.wrsEncontrados = wrsEncontrados;
  f.totalWrsFila = detalles.length;
  f.encontrado = wrsEncontrados === detalles.length;
  f.matchParcial = wrsEncontrados > 0 && wrsEncontrados < detalles.length;

  const delimiter = f.delimiter || ' - ';
  const singleFallbackClient = detalles.length === 1 ? f.cliente : '';
  const nombresClientes = detalles.map((d) =>
    (d.cliente || singleFallbackClient || 'SIN CLIENTE').trim().toUpperCase()
  );
  f.cliente = detalles.length > 1 ? nombresClientes.join(delimiter) : (nombresClientes[0] || f.cliente);

  const pesosValidos = detalles
    .map((d) => (typeof d.peso === 'number' && Number.isFinite(d.peso) ? d.peso : null))
    .filter((p): p is number => p !== null);
  f.pesoTotal =
    pesosValidos.length > 0 ? Math.round(pesosValidos.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  f.pesoFormateado = detalles
    .map((d) => (typeof d.peso === 'number' && Number.isFinite(d.peso) ? d.peso.toFixed(2) : '?'))
    .join(delimiter);
  f.tracking = detalles
    .map((d) => cleanTrackingValue(d.tracking))
    .filter(Boolean)
    .join(delimiter);

  const tiposSet = new Set(detalles.map((d) => String(d.tipo || '').trim()).filter(Boolean));
  if (tiposSet.size > 0) {
    f.tipo = Array.from(tiposSet).join(' / ');
  }
}

/**
 * Devuelve solo los códigos WR individuales que realmente quedaron sin match
 * (evitando listar celdas multi-WR completas cuando tuvieron coincidencia parcial).
 */
export function extractMissingWrCodes(filas: FilaResultadoCobro[]): string[] {
  const missing: string[] = [];

  for (const f of filas) {
    if (f.encontrado) continue;
    const detalles = Array.isArray(f.detalles) ? f.detalles : [];
    if (detalles.length > 0) {
      for (const d of detalles) {
        if (!d.encontrado && d.wr) {
          missing.push(d.wr);
        }
      }
    } else if (f.wr) {
      missing.push(f.wr);
    }
  }

  return Array.from(new Set(missing));
}

/**
 * Ordena las claves R2 multi-estado con la misma prioridad exacta del VPS Worker:
 * 1. sent (ENVIADO) -> 2. delivered (ENTREGADO) -> 3. received (RECIBIDO).
 */
export function orderMultiStateSourceKeys(
  fuentesMap: Partial<Record<'sent' | 'delivered' | 'received', string>>,
  enviadoKey?: string
): string[] {
  const keys: string[] = [];
  const primarySent = String(enviadoKey || '').trim() || String(fuentesMap.sent || '').trim();
  if (primarySent) keys.push(primarySent);
  if (fuentesMap.delivered) keys.push(fuentesMap.delivered.trim());
  if (fuentesMap.received) keys.push(fuentesMap.received.trim());
  return Array.from(new Set(keys.filter(Boolean)));
}

/**
 * Inserta una entrada en el índice multi-estado respetando prioridad first-hit wins
 * (las fuentes de mayor precedencia nunca son sobrescritas por fuentes secundarias).
 */
export function setIndexEntryIfAbsent<T>(
  indice: Record<string, T>,
  rawKey: string,
  normKey: string,
  item: T
): void {
  const upperRaw = String(rawKey || '').trim().toUpperCase();
  if (upperRaw && !Object.prototype.hasOwnProperty.call(indice, upperRaw)) {
    indice[upperRaw] = item;
  }
  const upperNorm = String(normKey || '').trim().toUpperCase();
  if (upperNorm && !Object.prototype.hasOwnProperty.call(indice, upperNorm)) {
    indice[upperNorm] = item;
  }
}

/**
 * Actualiza de forma inmutable una fila simple manteniendo sincronizado su detalle interno
 * y resolviendo `encontrado` si el operador completó manualmente cliente y peso válidos.
 */
export function updateSimpleRow(
  row: FilaResultadoCobro,
  patch: Partial<FilaResultadoCobro>
): FilaResultadoCobro {
  const next: FilaResultadoCobro = { ...row, ...patch };
  const detalles = Array.isArray(row.detalles) ? row.detalles.map((d) => ({ ...d })) : [];

  if (detalles.length === 1) {
    const d0 = detalles[0];
    if (patch.cliente !== undefined) d0.cliente = patch.cliente;
    if (patch.pesoTotal !== undefined) d0.peso = patch.pesoTotal;
    if (patch.tracking !== undefined) d0.tracking = patch.tracking;
    if (patch.tipo !== undefined) d0.tipo = patch.tipo;

    const hasValidManualData =
      isValidClientKey(normalizeClientNameKey(d0.cliente)) &&
      typeof d0.peso === 'number' &&
      Number.isFinite(d0.peso) &&
      d0.peso > 0;

    if (!d0.encontrado && hasValidManualData) {
      d0.encontrado = true;
      next.encontrado = true;
      next.matchParcial = false;
      next.wrsEncontrados = 1;
      next.totalWrsFila = 1;
    }
    next.detalles = detalles;
  } else if (!next.encontrado) {
    const hasValidManualData =
      isValidClientKey(normalizeClientNameKey(next.cliente)) &&
      typeof next.pesoTotal === 'number' &&
      Number.isFinite(next.pesoTotal) &&
      next.pesoTotal > 0;

    if (hasValidManualData) {
      next.encontrado = true;
      next.matchParcial = false;
      next.wrsEncontrados = next.totalWrsFila || 1;
    }
  }

  return next;
}

/**
 * Actualiza de forma inmutable una subfila hija dentro de un grupo Multi-WR
 * y recalcula peso total, cliente agregado, tracking y estado del grupo.
 */
export function updateMultiWrDetail(
  row: FilaResultadoCobro,
  detalleIndex: number,
  patch: Partial<Pick<GrupoDetalleItem, 'cliente' | 'peso' | 'tracking' | 'tipo'>>
): FilaResultadoCobro {
  const baseDetalles = getGroupDetailsList(row).map((d) => ({ ...d }));
  if (detalleIndex < 0 || detalleIndex >= baseDetalles.length) {
    return row;
  }

  const target = baseDetalles[detalleIndex];
  if (patch.cliente !== undefined) {
    target.cliente = patch.cliente.toUpperCase();
  }
  if (patch.peso !== undefined) {
    target.peso =
      typeof patch.peso === 'number' && Number.isFinite(patch.peso) && patch.peso > 0
        ? Math.round(patch.peso * 100) / 100
        : null;
  }
  if (patch.tracking !== undefined) {
    target.tracking = patch.tracking;
  }
  if (patch.tipo !== undefined) {
    target.tipo = patch.tipo;
  }

  const hasValidManualData =
    isValidClientKey(normalizeClientNameKey(target.cliente)) &&
    typeof target.peso === 'number' &&
    Number.isFinite(target.peso) &&
    target.peso > 0;

  if (!target.encontrado && hasValidManualData) {
    target.encontrado = true;
  }

  const nextRow: FilaResultadoCobro = {
    ...row,
    detalles: baseDetalles,
  };
  recalculateRowFromDetails(nextRow);
  return nextRow;
}
