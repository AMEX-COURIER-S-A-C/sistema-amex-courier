import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  fetchTibWarehouseByStatus,
  normalizeTibWr,
  type NormalizedTibItem,
  type TibApiStatus,
} from '@/lib/tib/apiClient';

const TIB_FALLBACK_API_URL = 'https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php';
const TIB_BASE_MEDIA_URL = 'https://www.tibcourier.com/global-courier/ajax/';

export interface SyncOptions {
  images?: boolean;
  tracking?: boolean;
  peso?: boolean;
  cliente?: boolean;
  empaque?: boolean;
  estadoTib?: boolean;
}

export interface HybridEnrichItemResult {
  wr: string;
  id?: string;
  found: boolean;
  source: 'official_api' | 'fallback_ajax' | 'none';
  updatedFields: string[];
  tracking?: string;
  cliente?: string;
  pesoKg?: number;
  empaque?: string;
  estadoTib?: string;
  fotoUrl?: string | null;
  ticketUrl?: string | null;
}

export interface HybridEnrichResponse {
  success: boolean;
  totalSolicitados: number;
  totalActualizados: number;
  desglose: {
    resueltosApiOficial: number;
    resueltosFallback: number;
    noEncontrados: number;
    errores: number;
  };
  duracionMs: number;
  resultados: HybridEnrichItemResult[];
}

interface TibOfficialCache {
  timestamp: number;
  itemsByCanonicalWr: Map<string, NormalizedTibItem>;
  itemsByDigits: Map<string, NormalizedTibItem>;
}

// Caché en memoria del proceso de Vercel/Node (TTL 60 minutos)
let officialCache: TibOfficialCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Obtiene o refresca el mapa completo de almacén desde la API Oficial de TIB con credenciales .env
 */
export async function getOrRefreshOfficialTibMap(forceRefresh = false): Promise<TibOfficialCache> {
  const now = Date.now();
  if (!forceRefresh && officialCache && now - officialCache.timestamp < CACHE_TTL_MS) {
    return officialCache;
  }

  const statuses: TibApiStatus[] = ['RECIBIDO', 'ENVIADO', 'ENTREGADO'];
  const results = await Promise.allSettled(
    statuses.map((s) => fetchTibWarehouseByStatus(s, 15000))
  );

  const byCanonical = new Map<string, NormalizedTibItem>();
  const byDigits = new Map<string, NormalizedTibItem>();

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value?.items)) {
      for (const item of res.value.items) {
        if (item.wr) {
          byCanonical.set(item.wr.toUpperCase(), item);
        }
        const digits = item.wr.replace(/\D/g, '').replace(/^0+/, '');
        if (digits) {
          byDigits.set(digits, item);
        }
        if (item.seqwr) {
          byDigits.set(item.seqwr.replace(/^0+/, ''), item);
        }
      }
    } else if (res.status === 'rejected') {
      console.warn('[HybridEnricher] Aviso consultando estado oficial TIB:', res.reason?.message || res.reason);
    }
  }

  officialCache = {
    timestamp: now,
    itemsByCanonicalWr: byCanonical,
    itemsByDigits: byDigits,
  };

  return officialCache;
}

/**
 * Fallback unitario hacia el endpoint AJAX para paquetes que no figuren en la lista de hoy
 */
async function fetchSinglePackageFallback(rawWr: string, timeoutMs = 8000): Promise<NormalizedTibItem | null> {
  const cleanNumericWr = rawWr.replace(/\D/g, '').replace(/^0+/, '');
  if (!cleanNumericWr) return null;

  try {
    const res = await fetch(TIB_FALLBACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({ warehouse: cleanNumericWr }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const pkg = data[0];
    const canonicalWr = normalizeTibWr(pkg.wr, pkg.seqwr || cleanNumericWr);

    let parsedWeight: number | null = null;
    if (pkg.weight !== null && pkg.weight !== undefined && pkg.weight !== '') {
      const num = Number(String(pkg.weight).replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        parsedWeight = Math.round(num * 100) / 100;
      }
    }

    const rawStatus = String(pkg.status || 'RECIBIDO').trim().toUpperCase();
    const status: TibApiStatus = rawStatus.includes('ENTREGADO')
      ? 'ENTREGADO'
      : rawStatus.includes('ENVIADO')
        ? 'ENVIADO'
        : 'RECIBIDO';

    let estadoBd: 'Recibido' | 'Enviado' | 'Entregado' = 'Recibido';
    if (status === 'ENTREGADO') estadoBd = 'Entregado';
    else if (status === 'ENVIADO') estadoBd = 'Enviado';

    return {
      wr: canonicalWr,
      rawWr: String(pkg.wr || ''),
      seqwr: String(pkg.seqwr || cleanNumericWr),
      tracking: String(pkg.tracking || '').trim(),
      cliente: String(pkg.nclient || '').trim(),
      tipoEmpaque: String(pkg.container || 'CAJA').trim().toUpperCase() || 'CAJA',
      peso: parsedWeight,
      status,
      estadoBd,
      fecRegister: String(pkg.fecRegister || ''),
      fecModify: String(pkg.fecModify || ''),
      timestampRank: 0,
      statusPriority: 1,
      rack: String(pkg.rack || ''),
      postal: String(pkg.postal || ''),
      fotoUrl: pkg.img ? `${TIB_BASE_MEDIA_URL}${String(pkg.img).replace(/^\/+/, '')}` : null,
      ticketUrl: pkg.ticket ? `${TIB_BASE_MEDIA_URL}${String(pkg.ticket).replace(/^\/+/, '')}` : null,
    };
  } catch (err) {
    console.warn(`[HybridEnricher Fallback] Error consultando WR ${rawWr}:`, err);
    return null;
  }
}

/**
 * Función principal: Enriquecimiento Híbrido "Cero Demora"
 */
export async function enrichPackagesHybrid(params: {
  packageIds?: string[];
  wrs?: string[];
  forceRefresh?: boolean;
  syncOptions?: SyncOptions;
}): Promise<HybridEnrichResponse> {
  const t0 = Date.now();
  const { packageIds = [], wrs = [], forceRefresh = false, syncOptions = {} } = params;

  const syncImages = syncOptions.images ?? true;
  const syncTracking = syncOptions.tracking ?? true;
  const syncPeso = syncOptions.peso ?? true;
  const syncCliente = syncOptions.cliente ?? true;
  const syncEmpaque = syncOptions.empaque ?? true;
  const syncEstadoTib = syncOptions.estadoTib ?? true;

  const admin = getSupabaseAdmin();

  // 1. Obtener los paquetes candidatos de Supabase
  let dbQuery = admin
    .from('paquetes')
    .select('id, numero_recibo_bodega, tracking, nombre_consignatario, peso_kg, tipo_empaque, estado_tib, tib_imagen_url, tib_ticket_pdf_url');

  if (packageIds.length > 0) {
    dbQuery = dbQuery.in('id', packageIds);
  } else if (wrs.length > 0) {
    const cleanWrs = wrs.map((w) => normalizeTibWr(w)).filter(Boolean);
    dbQuery = dbQuery.in('numero_recibo_bodega', cleanWrs);
  } else {
    // Si no se indican paquetes, procesar los incompletos más recientes
    dbQuery = dbQuery
      .not('numero_recibo_bodega', 'is', null)
      .neq('numero_recibo_bodega', '')
      .order('creado_en', { ascending: false })
      .limit(300);
  }

  const { data: dbPackages, error: dbErr } = await dbQuery;
  if (dbErr) {
    throw new Error(`Error consultando base de datos: ${dbErr.message}`);
  }

  const packagesList = dbPackages || [];
  if (packagesList.length === 0) {
    return {
      success: true,
      totalSolicitados: 0,
      totalActualizados: 0,
      desglose: { resueltosApiOficial: 0, resueltosFallback: 0, noEncontrados: 0, errores: 0 },
      duracionMs: Date.now() - t0,
      resultados: [],
    };
  }

  // 2. FASE 1: Consultar / Reutilizar Caché de la API Oficial TIB con credenciales .env
  let officialMap: TibOfficialCache;
  try {
    officialMap = await getOrRefreshOfficialTibMap(forceRefresh);
  } catch (apiErr) {
    console.warn('[HybridEnricher] Fallo temporal de API Oficial, usando fallback total:', apiErr);
    officialMap = {
      timestamp: 0,
      itemsByCanonicalWr: new Map(),
      itemsByDigits: new Map(),
    };
  }

  const resultados: HybridEnrichItemResult[] = [];
  const pendingFallback: Array<{ pkg: any; canonicalWr: string; digits: string }> = [];
  const updatesToApply: Array<{ id: string; payload: Record<string, any>; result: HybridEnrichItemResult }> = [];

  let countOficial = 0;
  let countFallback = 0;
  let countNotFound = 0;
  let countErrors = 0;

  // 3. Match instantáneo en memoria con la API Oficial
  for (const pkg of packagesList) {
    const rawWr = pkg.numero_recibo_bodega || '';
    const canonicalWr = normalizeTibWr(rawWr);
    const digits = canonicalWr.replace(/\D/g, '').replace(/^0+/, '');

    const matchOficial =
      officialMap.itemsByCanonicalWr.get(canonicalWr) ||
      (digits ? officialMap.itemsByDigits.get(digits) : undefined);

    if (matchOficial) {
      countOficial++;
      const { payload, updatedFields } = buildPackageUpdatePayload(pkg, matchOficial, {
        syncImages,
        syncTracking,
        syncPeso,
        syncCliente,
        syncEmpaque,
        syncEstadoTib,
        forceRefresh,
      });

      const resItem: HybridEnrichItemResult = {
        wr: canonicalWr,
        id: pkg.id,
        found: true,
        source: 'official_api',
        updatedFields,
        tracking: matchOficial.tracking || undefined,
        cliente: matchOficial.cliente || undefined,
        pesoKg: matchOficial.peso || undefined,
        empaque: matchOficial.tipoEmpaque || undefined,
        estadoTib: matchOficial.estadoBd || undefined,
        fotoUrl: matchOficial.fotoUrl,
        ticketUrl: matchOficial.ticketUrl,
      };

      resultados.push(resItem);
      if (Object.keys(payload).length > 1) {
        updatesToApply.push({ id: pkg.id, payload, result: resItem });
      }
    } else {
      pendingFallback.push({ pkg, canonicalWr, digits });
    }
  }

  // 4. FASE 2: Respaldo unitario concurrente en chunks de 5 para los no encontrados en la lista oficial
  if (pendingFallback.length > 0) {
    const CHUNK_SIZE = 5;
    for (let i = 0; i < pendingFallback.length; i += CHUNK_SIZE) {
      const chunk = pendingFallback.slice(i, i + CHUNK_SIZE);
      const fallbackResults = await Promise.allSettled(
        chunk.map((item) => fetchSinglePackageFallback(item.canonicalWr || item.digits))
      );

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j];
        const fbRes = fallbackResults[j];

        if (fbRes.status === 'fulfilled' && fbRes.value) {
          countFallback++;
          const matchFb = fbRes.value;
          const { payload, updatedFields } = buildPackageUpdatePayload(item.pkg, matchFb, {
            syncImages,
            syncTracking,
            syncPeso,
            syncCliente,
            syncEmpaque,
            syncEstadoTib,
            forceRefresh,
          });

          const resItem: HybridEnrichItemResult = {
            wr: item.canonicalWr,
            id: item.pkg.id,
            found: true,
            source: 'fallback_ajax',
            updatedFields,
            tracking: matchFb.tracking || undefined,
            cliente: matchFb.cliente || undefined,
            pesoKg: matchFb.peso || undefined,
            empaque: matchFb.tipoEmpaque || undefined,
            estadoTib: matchFb.estadoBd || undefined,
            fotoUrl: matchFb.fotoUrl,
            ticketUrl: matchFb.ticketUrl,
          };

          resultados.push(resItem);
          if (Object.keys(payload).length > 1) {
            updatesToApply.push({ id: item.pkg.id, payload, result: resItem });
          }
        } else {
          countNotFound++;
          resultados.push({
            wr: item.canonicalWr,
            id: item.pkg.id,
            found: false,
            source: 'none',
            updatedFields: [],
          });
        }
      }
    }
  }

  // 5. Aplicar actualizaciones masivas en Supabase en lotes de 50
  if (updatesToApply.length > 0) {
    const CHUNK_DB = 50;
    for (let i = 0; i < updatesToApply.length; i += CHUNK_DB) {
      const chunk = updatesToApply.slice(i, i + CHUNK_DB);
      const dbPromises = chunk.map((upd) =>
        admin.from('paquetes').update(upd.payload).eq('id', upd.id)
      );
      const dbSettled = await Promise.allSettled(dbPromises);
      for (const st of dbSettled) {
        if (st.status === 'rejected') {
          countErrors++;
        }
      }
    }
  }

  return {
    success: true,
    totalSolicitados: packagesList.length,
    totalActualizados: updatesToApply.length,
    desglose: {
      resueltosApiOficial: countOficial,
      resueltosFallback: countFallback,
      noEncontrados: countNotFound,
      errores: countErrors,
    },
    duracionMs: Date.now() - t0,
    resultados,
  };
}

/**
 * Helper para construir el payload de actualización respetando campos existentes y opciones del usuario
 */
function buildPackageUpdatePayload(
  currentPkg: any,
  tibData: NormalizedTibItem,
  options: {
    syncImages: boolean;
    syncTracking: boolean;
    syncPeso: boolean;
    syncCliente: boolean;
    syncEmpaque: boolean;
    syncEstadoTib: boolean;
    forceRefresh: boolean;
  }
): { payload: Record<string, any>; updatedFields: string[] } {
  const payload: Record<string, any> = {
    actualizado_en: new Date().toISOString(),
  };
  const updatedFields: string[] = [];

  // 1. Fotos y Tickets directos de TIB (sin guardar en R2, ligeros y rápidos)
  if (options.syncImages) {
    if (tibData.fotoUrl && (options.forceRefresh || !currentPkg.tib_imagen_url)) {
      payload.tib_imagen_url = tibData.fotoUrl;
      updatedFields.push('foto');
    }
    if (tibData.ticketUrl && (options.forceRefresh || !currentPkg.tib_ticket_pdf_url)) {
      payload.tib_ticket_pdf_url = tibData.ticketUrl;
      updatedFields.push('ticket');
    }
  }

  // 2. Tracking
  if (options.syncTracking && tibData.tracking) {
    const isTrackingEmpty = !currentPkg.tracking || currentPkg.tracking === '-' || currentPkg.tracking.trim() === '';
    if (options.forceRefresh || isTrackingEmpty) {
      payload.tracking = tibData.tracking;
      updatedFields.push('tracking');
    }
  }

  // 3. Cliente / Consignatario
  if (options.syncCliente && tibData.cliente) {
    const isClienteEmpty =
      !currentPkg.nombre_consignatario ||
      currentPkg.nombre_consignatario.trim() === '' ||
      currentPkg.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX');
    if (options.forceRefresh || isClienteEmpty) {
      payload.nombre_consignatario = tibData.cliente;
      updatedFields.push('cliente');
    }
  }

  // 4. Peso
  if (options.syncPeso && tibData.peso && tibData.peso > 0) {
    const isPesoEmpty = !currentPkg.peso_kg || Number(currentPkg.peso_kg) <= 0;
    if (options.forceRefresh || isPesoEmpty) {
      payload.peso_kg = tibData.peso;
      updatedFields.push('peso');
    }
  }

  // 5. Empaque
  if (options.syncEmpaque && tibData.tipoEmpaque) {
    const isEmpaqueEmpty = !currentPkg.tipo_empaque || currentPkg.tipo_empaque.trim() === '';
    if (options.forceRefresh || isEmpaqueEmpty) {
      payload.tipo_empaque = tibData.tipoEmpaque;
      updatedFields.push('empaque');
    }
  }

  // 6. Estado TIB
  if (options.syncEstadoTib && tibData.estadoBd) {
    const isEstadoEmpty = !currentPkg.estado_tib || currentPkg.estado_tib.trim() === '';
    if (options.forceRefresh || isEstadoEmpty) {
      payload.estado_tib = tibData.estadoBd;
      updatedFields.push('estado_tib');
    }
  }

  return { payload, updatedFields };
}
