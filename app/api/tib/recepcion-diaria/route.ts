import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/auth/guards';
import { createCargoSystemClient, isTibV2Configured } from '@/lib/tib/cargoSystemClient';
import {
  CARGO_SYNC_STATUSES,
  cleanNullableText,
  formatCargoCanonicalWr,
  formatDateYmdLima,
  mapCargoStatusToTibStatus,
  parseCargoDatePartsLima,
  resolveDisplayTicketUrl,
  splitPhotoUrls,
  buildCargoTicketReference,
} from '@/lib/tib/cargoSystemHelpers';
import { normalizeTibWr } from '@/lib/tib/apiClient';

const LEGACY_TIB_API_URL = 'https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php';
const LEGACY_TIB_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

export const dynamic = 'force-dynamic';

interface RadarFeedItem {
  id: string;
  wr: string;
  rawWr: string;
  cliente: string;
  tracking: string;
  peso: number;
  tipoEmpaque: string;
  rackMiami: string;
  postal: string;
  fechaRegistro: string;
  horaRegistro: string;
  timestampCompleto: string;
  operador: string;
  fotoUrl: string | null;
  fotos: string[];
  ticketUrl: string | null;
  estado: string;
  source: 'tib_v2' | 'tib_v1';
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const base = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return formatDateYmdLima();
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

async function fetchRadarFeedV2(requestedDate: string): Promise<RadarFeedItem[]> {
  if (!isTibV2Configured()) return [];

  const todayLima = formatDateYmdLima();
  const minWindowStart = addDaysYmd(todayLima, -14);
  const startDate = requestedDate < minWindowStart ? addDaysYmd(requestedDate, -2) : minWindowStart;
  const endDate = addDaysYmd(todayLima, 1);

  const client = createCargoSystemClient({ timeoutMs: 20000, maxRetries: 2 });
  const rawItems = await client.fetchMultipleStatuses(CARGO_SYNC_STATUSES, { startDate, endDate });

  const list: RadarFeedItem[] = [];
  for (const item of rawItems) {
    const idInfo = formatCargoCanonicalWr(item?.id);
    if (!idInfo) continue;

    const dateParts = parseCargoDatePartsLima(item.dateRegister);
    const cliente =
      cleanNullableText(item.nameClient) ||
      cleanNullableText(item.nameConsignee) ||
      'AMEX COURIER';
    const rawWeight = cleanNullableText(item.weight);
    const pesoParsed = rawWeight !== null ? Number(rawWeight.replace(',', '.')) : 0;
    const peso = Number.isFinite(pesoParsed) && pesoParsed > 0 ? Math.round(pesoParsed * 100) / 100 : 0;
    const fotos = splitPhotoUrls(item.photoUrl);
    const ticketRef = buildCargoTicketReference(idInfo.numericId);

    list.push({
      id: String(idInfo.numericId),
      wr: idInfo.canonicalWr,
      rawWr: String(idInfo.numericId),
      cliente,
      tracking: cleanNullableText(item.tracking) || cleanNullableText(item.secondTracking) || '—',
      peso,
      tipoEmpaque: (cleanNullableText(item.container) || cleanNullableText(item.description) || 'CAJA').toUpperCase(),
      rackMiami: cleanNullableText(item.rack) || 'S/U',
      postal: cleanNullableText(item.postalService) || 'COURIER',
      fechaRegistro: dateParts.date,
      horaRegistro: dateParts.time,
      timestampCompleto: dateParts.full || cleanNullableText(item.dateRegister) || '',
      operador: '',
      fotoUrl: fotos[0] || null,
      fotos,
      ticketUrl: resolveDisplayTicketUrl(ticketRef, idInfo.canonicalWr),
      estado: mapCargoStatusToTibStatus(item.status || item._fetchedStatus),
      source: 'tib_v2',
    });
  }
  return list;
}

async function fetchRadarFeedV1(): Promise<RadarFeedItem[]> {
  try {
    const tibResponse = await fetch(LEGACY_TIB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });

    if (!tibResponse.ok) return [];
    const rawData = await tibResponse.json();
    if (!Array.isArray(rawData)) return [];

    const list: RadarFeedItem[] = [];
    for (let idx = 0; idx < rawData.length; idx++) {
      const item = rawData[idx] as Record<string, unknown>;
      const rawWr = String(item.wr || item.seqwr || '').trim();
      const canonicalWr = normalizeTibWr(rawWr);
      if (!canonicalWr) continue;

      const fecRegister = String(item.fecRegister || '').trim();
      const [fechaRegistro = '', horaRegistro = ''] = fecRegister.split(' ');
      const pesoVal = Number(String(item.weight || 0).replace(',', '.'));
      const peso = Number.isFinite(pesoVal) && pesoVal > 0 ? Math.round(pesoVal * 100) / 100 : 0;
      const fotoUrl = item.img ? `${LEGACY_TIB_BASE_URL}${String(item.img).replace(/^\/+/, '')}` : null;
      const ticketUrl = item.ticket ? `${LEGACY_TIB_BASE_URL}${String(item.ticket).replace(/^\/+/, '')}` : null;

      list.push({
        id: String(item.seqwr || idx),
        wr: canonicalWr,
        rawWr,
        cliente: String(item.nclient || 'AMEX COURIER').trim(),
        tracking: String(item.tracking || '—').trim() || '—',
        peso,
        tipoEmpaque: String(item.container || 'CAJA').trim().toUpperCase() || 'CAJA',
        rackMiami: String(item.rack || 'S/U').trim() || 'S/U',
        postal: String(item.postal || 'COURIER').trim() || 'COURIER',
        fechaRegistro,
        horaRegistro,
        timestampCompleto: fecRegister,
        operador: String(item.seqUser || item.Usuario || '').trim(),
        fotoUrl,
        fotos: fotoUrl ? [fotoUrl] : [],
        ticketUrl,
        estado: String(item.status || 'RECIBIDO').trim().toUpperCase(),
        source: 'tib_v1',
      });
    }
    return list;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const clientFilter = (searchParams.get('client') || 'AMEX').trim().toUpperCase();

    // Obtener fecha solicitada o calcular "Ayer" en hora de Lima
    let requestedDate = searchParams.get('date')?.trim() || '';
    if (!requestedDate) {
      requestedDate = addDaysYmd(formatDateYmdLima(), -1);
    }

    // 1. Consultar TIB v2 (prioridad) + TIB v1 (historial) en paralelo
    let v2Items: RadarFeedItem[] = [];
    let v2Error: unknown = null;
    const [v2Res, v1Items] = await Promise.all([
      fetchRadarFeedV2(requestedDate).catch((err) => {
        v2Error = err;
        console.warn('[recepcion-diaria] Aviso TIB v2:', err instanceof Error ? err.message : err);
        return [] as RadarFeedItem[];
      }),
      fetchRadarFeedV1(),
    ]);
    v2Items = v2Res;

    if (v2Items.length === 0 && v1Items.length === 0 && v2Error) {
      return NextResponse.json(
        { error: `Error al consultar TIB: ${v2Error instanceof Error ? v2Error.message : 'Sin respuesta'}` },
        { status: 502 }
      );
    }

    // Fusionar por WR dando prioridad absoluta a TIB v2
    const mergedByWr = new Map<string, RadarFeedItem>();
    for (const item of v2Items) {
      if (!mergedByWr.has(item.wr)) mergedByWr.set(item.wr, item);
    }
    for (const item of v1Items) {
      if (!mergedByWr.has(item.wr)) mergedByWr.set(item.wr, item);
    }
    const unifiedFeed = Array.from(mergedByWr.values());

    // 2. Extraer fechas disponibles en el feed para los botones de selección
    const dateCountsMap = new Map<string, { amexCount: number; totalCount: number }>();
    for (const item of unifiedFeed) {
      const d = item.fechaRegistro;
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const isAmex = item.cliente.toUpperCase().includes(clientFilter);
        const curr = dateCountsMap.get(d) || { amexCount: 0, totalCount: 0 };
        curr.totalCount++;
        if (isAmex) curr.amexCount++;
        dateCountsMap.set(d, curr);
      }
    }

    const fechasDisponibles = Array.from(dateCountsMap.entries())
      .map(([date, counts]) => ({
        date,
        amexCount: counts.amexCount,
        totalCount: counts.totalCount,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // 3. Filtrar paquetes para la fecha y cliente seleccionados
    const filtered = unifiedFeed.filter((item) => {
      if (item.fechaRegistro !== requestedDate) return false;
      return item.cliente.toUpperCase().includes(clientFilter);
    });

    // 4. Ordenar cronológicamente (más temprano a más tarde)
    filtered.sort((a, b) => a.timestampCompleto.localeCompare(b.timestampCompleto));

    // 5. Calcular métricas y enumerar salida
    let totalPeso = 0;
    const operatorsSet = new Set<string>();
    const paquetes = filtered.map((item, idx) => {
      totalPeso += item.peso;
      if (item.operador) operatorsSet.add(item.operador);
      return {
        index: idx + 1,
        ...item,
      };
    });

    const primeraHora = paquetes.length > 0 ? paquetes[0].horaRegistro : null;
    const ultimaHora = paquetes.length > 0 ? paquetes[paquetes.length - 1].horaRegistro : null;

    return NextResponse.json({
      success: true,
      source: v2Items.length > 0 ? (v1Items.length > 0 ? 'tib_v2+v1' : 'tib_v2') : 'tib_v1',
      fechaConsultada: requestedDate,
      filtroCliente: clientFilter,
      metricas: {
        totalPaquetes: paquetes.length,
        totalPeso: Number(totalPeso.toFixed(2)),
        primeraHora,
        ultimaHora,
        operadores: Array.from(operatorsSet),
      },
      fechasDisponibles,
      paquetes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al consultar TIB';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
