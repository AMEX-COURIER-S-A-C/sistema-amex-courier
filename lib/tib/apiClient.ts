import * as XLSX from 'xlsx';
import {
  buildCargoTicketReference,
  CANONICAL_STATUS_PRIORITY,
  cleanNullableText,
  extractNumericWrId,
  formatCargoCanonicalWr,
  mapCargoStatusToTibStatus,
  normalizeCargoPhotoUrls,
  TIB_STATUS_TO_CARGO_STATUSES,
  type RawCargoWarehouseItem,
} from '@/lib/tib/cargoSystemHelpers';
import {
  createCargoSystemClient,
  DEFAULT_TIB_V2_API_URL,
  getTibV2Credentials,
  isTibV2Configured,
} from '@/lib/tib/cargoSystemClient';

export {
  DEFAULT_TIB_V2_API_URL,
  extractNumericWrId,
  getTibV2Credentials,
  isTibV2Configured,
};

export type TibApiStatus = 'RECIBIDO' | 'ENVIADO' | 'ENTREGADO';
export type TibSlotType = 'received' | 'sent' | 'delivered';

export interface RawTibWarehouseItem {
  seqwr?: string;
  wr?: string;
  description?: string;
  tracking?: string;
  status?: string;
  iclient?: string;
  seqUser?: string;
  fecRegister?: string | null;
  fecModify?: string | null;
  img?: string | null;
  ticket?: string | null;
  nclient?: string;
  container?: string;
  weight?: string | number | null;
  rack?: string;
  postal?: string;
  oversized?: string;
  seqwrnd?: string;
  emailClient?: string;
}

export interface NormalizedTibItem {
  wr: string;
  rawWr: string;
  seqwr: string;
  tracking: string;
  cliente: string;
  tipoEmpaque: string;
  peso: number | null;
  status: TibApiStatus;
  estadoBd: 'Recibido' | 'Enviado' | 'Entregado';
  fecRegister: string;
  fecModify: string;
  timestampRank: number;
  statusPriority: number;
  rack: string;
  postal: string;
  fotoUrl: string | null;
  ticketUrl: string | null;
  source?: 'tib_v2' | 'tib_v1';
}

const DEFAULT_TIB_API_URL = 'https://www.tibcourier.com/api/list-warehouse';
const TIB_MEDIA_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

const STATUS_PRIORITY: Record<TibApiStatus, number> = CANONICAL_STATUS_PRIORITY;

export const SLOT_TO_TIB_STATUS: Record<TibSlotType, TibApiStatus> = {
  received: 'RECIBIDO',
  sent: 'ENVIADO',
  delivered: 'ENTREGADO',
};

export const TIB_STATUS_TO_SLOT: Record<TibApiStatus, TibSlotType> = {
  RECIBIDO: 'received',
  ENVIADO: 'sent',
  ENTREGADO: 'delivered',
};

export function isTibV1Configured(): boolean {
  const email = (process.env.TIB_API_EMAIL || '').trim();
  const password = (process.env.TIB_API_PASSWORD || '').trim();
  return Boolean(email && password);
}

export function getTibApiCredentials(): { url: string; email: string; password: string } {
  const url = (process.env.TIB_API_URL || DEFAULT_TIB_API_URL).trim();
  const email = (process.env.TIB_API_EMAIL || '').trim();
  const password = (process.env.TIB_API_PASSWORD || '').trim();

  if (!email || !password) {
    throw new Error(
      'Faltan las credenciales TIB_API_EMAIL o TIB_API_PASSWORD en las variables de entorno (.env.local).'
    );
  }

  return { url, email, password };
}

/**
 * Convierte cualquier representación de WR de TIB ("000485581", "485581", "WR000485581")
 * al formato canónico de 11 caracteres ("WR000485581").
 */
export function normalizeTibWr(rawWr: unknown, seqwr?: unknown): string {
  const str = String(rawWr || seqwr || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

  if (!str) return '';

  if (/^WR[A-Z0-9]{9}$/.test(str)) {
    return str;
  }

  const digits = str.replace(/\D/g, '');
  if (digits.length > 0 && digits.length <= 9) {
    return `WR${digits.padStart(9, '0')}`;
  }

  if (str.startsWith('WR')) {
    const afterWr = str.slice(2);
    if (afterWr.length > 0 && afterWr.length < 9 && /^\d+$/.test(afterWr)) {
      return `WR${afterWr.padStart(9, '0')}`;
    }
    return str;
  }

  return str;
}

export function mapTibStatusToDbEstado(status: string): 'Recibido' | 'Enviado' | 'Entregado' {
  const norm = status.trim().toUpperCase();
  if (norm.includes('ENTREGADO') || norm.includes('RECOGIDO') || norm === 'DELIVERED') return 'Entregado';
  if (
    norm.includes('ENVIADO') ||
    norm.includes('DESPACHADO') ||
    norm.includes('TRANSITO') ||
    norm === 'IN_TRANSIT' ||
    norm === 'TEMP_ASSIGNED' ||
    norm === 'ASSIGNED'
  ) {
    return 'Enviado';
  }
  return 'Recibido';
}

function parseTimestampRank(fecModify?: string | null, fecRegister?: string | null): number {
  const candidate = (fecModify || fecRegister || '').trim();
  if (!candidate) return 0;
  const isoCandidate = candidate.includes('T') ? candidate : candidate.replace(' ', 'T');
  const ms = Date.parse(isoCandidate);
  return Number.isFinite(ms) ? ms : 0;
}

export function normalizeTibWarehouseItem(
  raw: RawTibWarehouseItem,
  fallbackStatus: TibApiStatus
): NormalizedTibItem | null {
  const canonicalWr = normalizeTibWr(raw.wr, raw.seqwr);
  if (!canonicalWr || !canonicalWr.startsWith('WR')) return null;

  const rawStatus = String(raw.status || fallbackStatus).trim().toUpperCase();
  const status: TibApiStatus =
    rawStatus === 'ENTREGADO'
      ? 'ENTREGADO'
      : rawStatus === 'ENVIADO'
        ? 'ENVIADO'
        : 'RECIBIDO';

  let peso: number | null = null;
  if (raw.weight !== null && raw.weight !== undefined && raw.weight !== '') {
    const parsed = Number(String(raw.weight).replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      peso = Math.round(parsed * 100) / 100;
    }
  }

  const fecRegister = String(raw.fecRegister || '').trim();
  const fecModify = String(raw.fecModify || '').trim();

  return {
    wr: canonicalWr,
    rawWr: String(raw.wr || raw.seqwr || '').trim(),
    seqwr: String(raw.seqwr || '').trim(),
    tracking: String(raw.tracking || '').trim(),
    cliente: String(raw.nclient || '').trim(),
    tipoEmpaque: String(raw.container || 'CAJA').trim().toUpperCase() || 'CAJA',
    peso,
    status,
    estadoBd: mapTibStatusToDbEstado(status),
    fecRegister,
    fecModify,
    timestampRank: parseTimestampRank(fecModify, fecRegister),
    statusPriority: STATUS_PRIORITY[status] || 1,
    rack: String(raw.rack || '').trim(),
    postal: String(raw.postal || '').trim(),
    fotoUrl: raw.img ? `${TIB_MEDIA_BASE_URL}${String(raw.img).replace(/^\/+/, '')}` : null,
    ticketUrl: raw.ticket ? `${TIB_MEDIA_BASE_URL}${String(raw.ticket).replace(/^\/+/, '')}` : null,
    source: 'tib_v1',
  };
}

/**
 * Normaliza un registro crudo de TIB v2 (Cargo System - api.tibgrupo.com) al modelo unificado NormalizedTibItem.
 */
export function normalizeCargoWarehouseItem(
  raw: RawCargoWarehouseItem,
  fallbackStatus: TibApiStatus = 'RECIBIDO'
): NormalizedTibItem | null {
  const idInfo = formatCargoCanonicalWr(raw?.id);
  if (!idInfo) return null;

  const rawStatusStr = cleanNullableText(raw.status) || cleanNullableText(raw._fetchedStatus);
  const status: TibApiStatus = rawStatusStr
    ? mapCargoStatusToTibStatus(rawStatusStr)
    : fallbackStatus;

  let peso: number | null = null;
  const rawWeight = cleanNullableText(raw.weight);
  if (rawWeight !== null) {
    const parsed = Number(rawWeight.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      peso = Math.round(parsed * 100) / 100;
    }
  }

  const cliente =
    cleanNullableText(raw.nameClient) ||
    cleanNullableText(raw.nameConsignee) ||
    '';
  const tracking =
    cleanNullableText(raw.tracking) ||
    cleanNullableText(raw.secondTracking) ||
    '';
  const tipoEmpaque = (
    cleanNullableText(raw.container) ||
    cleanNullableText(raw.description) ||
    'CAJA'
  ).toUpperCase();
  const fecRegister = cleanNullableText(raw.dateRegister) || '';
  const fecModify = cleanNullableText(raw.dateModify) || '';

  return {
    wr: idInfo.canonicalWr,
    rawWr: String(idInfo.numericId),
    seqwr: String(idInfo.numericId),
    tracking,
    cliente,
    tipoEmpaque,
    peso,
    status,
    estadoBd: mapTibStatusToDbEstado(status),
    fecRegister,
    fecModify,
    timestampRank: parseTimestampRank(fecModify, fecRegister),
    statusPriority: STATUS_PRIORITY[status] || 1,
    rack: cleanNullableText(raw.rack) || '',
    postal: cleanNullableText(raw.postalService) || '',
    fotoUrl: normalizeCargoPhotoUrls(raw.photoUrl),
    ticketUrl: buildCargoTicketReference(idInfo.numericId),
    source: 'tib_v2',
  };
}

/**
 * Fusiona registros de TIB v2 (prioridad absoluta) con registros históricos de TIB v1
 * sin duplicar WRs y preservando campos multimedia históricos si v2 no trajera foto.
 */
export function mergeTibItemsV2First(
  v2Items: NormalizedTibItem[],
  v1Items: NormalizedTibItem[]
): NormalizedTibItem[] {
  const merged = new Map<string, NormalizedTibItem>();

  for (const item of v2Items) {
    const existing = merged.get(item.wr);
    if (
      !existing ||
      item.statusPriority > existing.statusPriority ||
      (item.statusPriority === existing.statusPriority && item.timestampRank >= existing.timestampRank)
    ) {
      merged.set(item.wr, item);
    }
  }

  for (const item of v1Items) {
    const existing = merged.get(item.wr);
    if (!existing) {
      merged.set(item.wr, item);
    } else if (!existing.fotoUrl && item.fotoUrl) {
      // Conservar foto histórica si el registro migrado en v2 no la trae
      merged.set(item.wr, { ...existing, fotoUrl: item.fotoUrl });
    }
  }

  return Array.from(merged.values());
}

async function fetchTibV1WarehouseByStatus(
  status: TibApiStatus,
  timeoutMs = 25000
): Promise<NormalizedTibItem[]> {
  const { url, email, password } = getTibApiCredentials();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AMEX-Courier-Sync/2.0',
    },
    body: JSON.stringify({
      email,
      password,
      status,
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`El servidor de TIB v1 respondió HTTP ${res.status} al consultar ${status}.`);
  }

  const payload = await res.json();
  const rawArray: RawTibWarehouseItem[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  if (!Array.isArray(rawArray)) {
    throw new Error(`Respuesta inválida de TIB v1 para el estado ${status}.`);
  }

  const items: NormalizedTibItem[] = [];
  for (const raw of rawArray) {
    const norm = normalizeTibWarehouseItem(raw, status);
    if (norm) items.push(norm);
  }
  return items;
}

async function fetchTibV2WarehouseByStatus(
  status: TibApiStatus,
  timeoutMs = 30000
): Promise<NormalizedTibItem[]> {
  const client = createCargoSystemClient({ timeoutMs });
  const cargoStatuses = TIB_STATUS_TO_CARGO_STATUSES[status];
  const rawItems = await client.fetchMultipleStatuses(cargoStatuses);

  const items: NormalizedTibItem[] = [];
  for (const raw of rawItems) {
    const norm = normalizeCargoWarehouseItem(raw, status);
    if (norm) items.push(norm);
  }
  return items;
}

/**
 * Consulta en vivo un estado específico ('RECIBIDO' | 'ENVIADO' | 'ENTREGADO'):
 * - Motor primario: TIB v2 (Cargo System - api.tibgrupo.com).
 * - Fusión histórica + respaldo: TIB v1 (tibcourier.com) con prioridad absoluta a v2 por WR.
 */
export async function fetchTibWarehouseByStatus(
  status: TibApiStatus,
  timeoutMs = 25000
): Promise<{
  status: TibApiStatus;
  items: NormalizedTibItem[];
  rawCount: number;
  durationMs: number;
  v2Count?: number;
  v1Count?: number;
}> {
  const t0 = Date.now();
  const hasV2 = isTibV2Configured();
  const hasV1 = isTibV1Configured();

  if (!hasV2 && !hasV1) {
    throw new Error(
      'Faltan credenciales TIB_V2_EMAIL/TIB_V2_PASSWORD (y tampoco existe respaldo TIB_API_EMAIL/TIB_API_PASSWORD).'
    );
  }

  let v2Items: NormalizedTibItem[] = [];
  let v1Items: NormalizedTibItem[] = [];
  let v2Error: unknown = null;
  let v1Error: unknown = null;

  await Promise.all([
    hasV2
      ? fetchTibV2WarehouseByStatus(status, Math.max(timeoutMs, 25000))
          .then((list) => {
            v2Items = list;
          })
          .catch((err) => {
            v2Error = err;
            console.warn(`[TIB v2] Error consultando ${status}:`, err instanceof Error ? err.message : err);
          })
      : Promise.resolve(),
    hasV1
      ? fetchTibV1WarehouseByStatus(status, timeoutMs)
          .then((list) => {
            v1Items = list;
          })
          .catch((err) => {
            v1Error = err;
            console.warn(`[TIB v1] Aviso consultando historial ${status}:`, err instanceof Error ? err.message : err);
          })
      : Promise.resolve(),
  ]);

  if (hasV2 && v2Error && (!hasV1 || v1Error)) {
    throw v2Error instanceof Error ? v2Error : new Error(`Error consultando TIB v2 (${status})`);
  }
  if (!hasV2 && v1Error) {
    throw v1Error instanceof Error ? v1Error : new Error(`Error consultando TIB v1 (${status})`);
  }

  const items = mergeTibItemsV2First(v2Items, v1Items);

  return {
    status,
    items,
    rawCount: v2Items.length + v1Items.length,
    durationMs: Date.now() - t0,
    v2Count: v2Items.length,
    v1Count: v1Items.length,
  };
}

/**
 * Descarga en paralelo los 3 estados oficiales de TIB ('RECIBIDO', 'ENVIADO', 'ENTREGADO')
 * fusionando TIB v2 (prioridad) + TIB v1 (historial) y construye el índice unificado de guías WR.
 */
export async function fetchAllTibWarehouseLists(
  statuses: TibApiStatus[] = ['RECIBIDO', 'ENVIADO', 'ENTREGADO']
): Promise<{
  lookup: Map<string, NormalizedTibItem>;
  byStatus: Record<TibApiStatus, NormalizedTibItem[]>;
  counts: {
    recibido: number;
    enviado: number;
    entregado: number;
    totalRaw: number;
    uniqueWrs: number;
  };
  durationMs: number;
}> {
  const t0 = Date.now();
  const results = await Promise.all(statuses.map((st) => fetchTibWarehouseByStatus(st)));

  const byStatus: Record<TibApiStatus, NormalizedTibItem[]> = {
    RECIBIDO: [],
    ENVIADO: [],
    ENTREGADO: [],
  };

  const lookup = new Map<string, NormalizedTibItem>();

  for (const res of results) {
    byStatus[res.status] = res.items;
    for (const item of res.items) {
      const existing = lookup.get(item.wr);
      if (!existing) {
        lookup.set(item.wr, item);
      } else {
        // Priorizar estado más avanzado (ENTREGADO > ENVIADO > RECIBIDO), luego TIB v2 sobre v1, o fecha más reciente
        const prefersV2 =
          item.statusPriority === existing.statusPriority &&
          item.source === 'tib_v2' &&
          existing.source !== 'tib_v2';
        const shouldReplace =
          item.statusPriority > existing.statusPriority ||
          prefersV2 ||
          (item.statusPriority === existing.statusPriority &&
            item.source === existing.source &&
            item.timestampRank >= existing.timestampRank);
        if (shouldReplace) {
          lookup.set(item.wr, item);
        }
      }
    }
  }

  const recibido = byStatus.RECIBIDO.length;
  const enviado = byStatus.ENVIADO.length;
  const entregado = byStatus.ENTREGADO.length;

  return {
    lookup,
    byStatus,
    counts: {
      recibido,
      enviado,
      entregado,
      totalRaw: recibido + enviado + entregado,
      uniqueWrs: lookup.size,
    },
    durationMs: Date.now() - t0,
  };
}

/**
 * Genera en memoria un archivo Excel (.xlsx) compatible con el Worker C# y el motor de Cobros
 * a partir de la lista de ítems obtenidos desde la API de TIB.
 */
export function generateTibXlsxBuffer(items: NormalizedTibItem[]): Buffer {
  const header = ['WR', 'TRACKING', 'CLIENTE', 'TIPO PAQUETE', 'PESO', 'ESTADO', 'MODIFICADO'];
  const rows: Array<Array<string | number>> = [header];

  for (const item of items) {
    rows.push([
      item.wr,
      item.tracking,
      item.cliente,
      item.tipoEmpaque || 'CAJA',
      item.peso !== null ? item.peso : '',
      item.status,
      item.fecModify || item.fecRegister || '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
