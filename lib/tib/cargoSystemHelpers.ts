/**
 * Funciones puras de normalización, mapeo y multimedia para TIB v2 (Cargo System - api.tibgrupo.com)
 * con compatibilidad total con registros históricos de TIB v1 (tibcourier.com).
 */

export const CARGO_SYSTEM_STATUSES = [
  'PRERECEIVED',
  'CREATED',
  'RECEIVED',
  'IN_TRANSIT',
  'TEMP_ASSIGNED',
  'ASSIGNED',
  'DELIVERED',
] as const;

/** Estados operativos activos a sincronizar (excluye PRERECEIVED y CREATED). */
export const CARGO_SYNC_STATUSES = [
  'RECEIVED',
  'IN_TRANSIT',
  'TEMP_ASSIGNED',
  'ASSIGNED',
  'DELIVERED',
] as const;

export type CargoSystemStatus = (typeof CARGO_SYSTEM_STATUSES)[number];
export type CanonicalTibStatus = 'RECIBIDO' | 'ENVIADO' | 'ENTREGADO';

export const TIB_STATUS_TO_CARGO_STATUSES: Record<CanonicalTibStatus, readonly CargoSystemStatus[]> = {
  RECIBIDO: ['RECEIVED'],
  ENVIADO: ['IN_TRANSIT', 'TEMP_ASSIGNED', 'ASSIGNED'],
  ENTREGADO: ['DELIVERED'],
};

export const CANONICAL_STATUS_PRIORITY: Record<CanonicalTibStatus, number> = {
  RECIBIDO: 1,
  ENVIADO: 2,
  ENTREGADO: 3,
};

export const ALLOWED_TIB_MEDIA_HOSTS = new Set(['www.tibgrupo.com', 'www.tibcourier.com']);

export interface RawCargoWarehouseItem {
  id?: number | string | null;
  tracking?: string | null;
  secondTracking?: string | null;
  idClient?: number | string | null;
  nameClient?: string | null;
  emailClient?: string | null;
  nameConsignee?: string | null;
  description?: string | null;
  postalService?: string | null;
  container?: string | null;
  rack?: string | null;
  weight?: string | number | null;
  status?: string | null;
  photoUrl?: string | null;
  pdfUrl?: string | null;
  dateRegister?: string | null;
  dateModify?: string | null;
  _fetchedStatus?: string | null;
}

/**
 * Limpia textos devueltos por Cargo System, convirtiendo literales "null" / "undefined" en null real.
 */
export function cleanNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return null;
  return trimmed;
}

/**
 * Extrae el ID numérico de un WR para consultar Cargo System (ej: "WR000506539" -> 506539).
 */
export function extractNumericWrId(rawWr: unknown): number | null {
  const digits = String(rawWr ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Convierte un ID numérico de Cargo System (ej. 506539) al WR canónico ("WR000506539").
 */
export function formatCargoCanonicalWr(rawId: unknown): { numericId: number; canonicalWr: string } | null {
  const numericId = extractNumericWrId(rawId);
  if (numericId === null) return null;
  const digits = String(numericId);
  const padded = digits.length <= 9 ? digits.padStart(9, '0') : digits;
  return { numericId, canonicalWr: `WR${padded}` };
}

/**
 * Traduce los estados de Cargo System al vocabulario oficial de 3 estados del ERP AMEX.
 */
export function mapCargoStatusToTibStatus(rawStatus: unknown): CanonicalTibStatus {
  const norm = String(rawStatus || '').trim().toUpperCase();
  if (norm === 'DELIVERED' || norm === 'ENTREGADO') {
    return 'ENTREGADO';
  }
  if (
    norm === 'IN_TRANSIT' ||
    norm === 'TEMP_ASSIGNED' ||
    norm === 'ASSIGNED' ||
    norm === 'ENVIADO' ||
    norm === 'SHIPPED'
  ) {
    return 'ENVIADO';
  }
  return 'RECIBIDO';
}

/**
 * Valida y normaliza una o múltiples URLs de foto (separadas por coma) de TIB v2/v1,
 * descartando "null", "sin_imagen" o hosts no autorizados (anti-SSRF).
 */
export function normalizeCargoPhotoUrls(rawPhotoUrl: unknown): string | null {
  const urls = splitPhotoUrls(rawPhotoUrl);
  return urls.length > 0 ? urls.join(',') : null;
}

/**
 * Separa un campo de fotos (único o separado por comas) en una lista limpia de URLs HTTPS válidas.
 */
export function splitPhotoUrls(rawPhotoUrl: unknown): string[] {
  const clean = cleanNullableText(rawPhotoUrl);
  if (!clean) return [];

  const validUrls: string[] = [];
  for (const part of clean.split(',')) {
    const candidate = cleanNullableText(part);
    if (!candidate || candidate.toLowerCase().includes('sin_imagen')) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'https:' && ALLOWED_TIB_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) {
        if (!validUrls.includes(candidate)) {
          validUrls.push(candidate);
        }
      }
    } catch {
      // Ignorar URL malformada
    }
  }

  return validUrls;
}

export function buildCargoTicketReference(numericId: number): string {
  return `tibv2://receipt/${numericId}`;
}

export function parseTibV2TicketId(rawTicketUrl: unknown): number | null {
  const text = cleanNullableText(rawTicketUrl);
  if (!text) return null;
  const match = text.match(/^tibv2:\/\/receipt\/(\d+)$/i);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function isAuthorizedLegacyTicketUrl(rawTicketUrl: unknown): rawTicketUrl is string {
  const text = cleanNullableText(rawTicketUrl);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.toLowerCase() === 'www.tibcourier.com' &&
      parsed.pathname.toLowerCase().includes('/global-courier/')
    );
  } catch {
    return false;
  }
}

/**
 * Convierte una referencia interna `tibv2://receipt/{id}` o un enlace histórico en una URL
 * navegable desde el ERP (`/api/paquetes/tib-ticket/{wr}` o HTTPS legado).
 */
export function resolveDisplayTicketUrl(rawTicketUrl: unknown, wr?: string | null): string | null {
  const text = cleanNullableText(rawTicketUrl);
  if (!text) return null;

  if (text.startsWith('/api/paquetes/tib-ticket/')) {
    return text;
  }

  const v2Id = parseTibV2TicketId(text);
  if (v2Id !== null) {
    const targetWr = cleanNullableText(wr) || `WR${String(v2Id).padStart(9, '0')}`;
    return `/api/paquetes/tib-ticket/${encodeURIComponent(targetWr)}`;
  }

  if (isAuthorizedLegacyTicketUrl(text)) {
    return text;
  }

  return null;
}

/**
 * Formatea una fecha como YYYY-MM-DD en zona horaria America/Lima.
 */
export function formatDateYmdLima(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const d = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

/**
 * Convierte un timestamp ISO de Cargo System a fecha YYYY-MM-DD y hora HH:mm:ss en America/Lima.
 */
export function parseCargoDatePartsLima(rawDate: unknown): {
  date: string;
  time: string;
  full: string;
} {
  const text = cleanNullableText(rawDate);
  if (!text) return { date: '', time: '', full: '' };

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    const [d = '', t = ''] = text.split(/[T ]/);
    return { date: d, time: t.replace(/Z$/, '').slice(0, 8), full: text };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}:${get('second')}`;
  return { date, time, full: `${date} ${time}` };
}
