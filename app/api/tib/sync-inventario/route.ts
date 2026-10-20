import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser, getUserDisplayName } from '@/lib/auth/guards';
import { uploadFileToR2, deleteFileFromR2 } from '@/lib/r2/client';
import {
  fetchAllTibWarehouseLists,
  fetchTibWarehouseByStatus,
  generateTibXlsxBuffer,
  getTibApiCredentials,
  normalizeTibWr,
  SLOT_TO_TIB_STATUS,
  type TibApiStatus,
  type TibSlotType,
} from '@/lib/tib/apiClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function getLimaDateString(date = new Date()): string {
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

const SLOT_FILE_NAMES: Record<TibSlotType, string> = {
  delivered: 'ENTREGADO TIB (API Oficial).xlsx',
  sent: 'ENVIADO TIB (API Oficial).xlsx',
  received: 'RECIBIDO TIB (API Oficial).xlsx',
};

/**
 * Sincroniza un slot ('delivered' | 'sent' | 'received') en R2, tabla inventario_tib_diario y Worker VPS
 */
async function syncSingleSlotToCloudAndWorker(
  slot: TibSlotType,
  xlsxBuffer: Buffer,
  userNombre: string,
  fecha: string
) {
  const admin = getSupabaseAdmin();
  const nombreArchivo = SLOT_FILE_NAMES[slot];
  const relativePath = `inventario-tib/diario/${fecha}/${slot}.xlsx`;

  // 1. Subir a R2
  const uploaded = await uploadFileToR2(
    xlsxBuffer,
    relativePath,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const r2Key = uploaded.key;

  // 2. Limpiar archivos anteriores obsoletos de este slot
  const { data: previousRows } = await admin
    .from('inventario_tib_diario')
    .select('id, r2_key')
    .eq('tipo', slot)
    .eq('es_activo', true);

  if (previousRows && previousRows.length > 0) {
    for (const prev of previousRows) {
      if (prev.r2_key && prev.r2_key !== r2Key) {
        await deleteFileFromR2(prev.r2_key).catch(() => {});
      }
    }
    await admin
      .from('inventario_tib_diario')
      .update({ es_activo: false })
      .eq('tipo', slot)
      .neq('r2_key', r2Key);
  }

  // 3. Registrar como activo en inventario_tib_diario
  const { data: savedRow } = await admin
    .from('inventario_tib_diario')
    .upsert(
      {
        fecha,
        tipo: slot,
        r2_key: r2Key,
        nombre_archivo: nombreArchivo,
        peso_bytes: xlsxBuffer.byteLength,
        subido_por_nombre: `${userNombre} (API TIB)`,
        subido_en: new Date().toISOString(),
        es_activo: true,
      },
      { onConflict: 'fecha,tipo' }
    )
    .select()
    .single();

  // 4. Notificar al Worker VPS de Hostinger en background
  const vpsHost = process.env.VPS_HOST || '2.25.89.222';
  const workerPort = process.env.WORKER_PORT || '10000';
  const workerUrl = process.env.WORKER_URL || `http://${vpsHost}:${workerPort}`;

  void fetch(`${workerUrl.replace(/\/+$/, '')}/sync-tib`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: slot, r2_key: r2Key, nombre_archivo: nombreArchivo }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => {});

  return savedRow;
}

/**
 * GET /api/tib/sync-inventario
 * Verifica disponibilidad de credenciales de la API TIB y conteo de paquetes en BD.
 */
export async function GET() {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let credentialsConfigured = false;
    let maskedEmail = '';
    try {
      const creds = getTibApiCredentials();
      credentialsConfigured = true;
      maskedEmail = creds.email;
    } catch {
      credentialsConfigured = false;
    }

    return NextResponse.json({
      ok: true,
      credentialsConfigured,
      accountEmail: maskedEmail,
      endpoint: process.env.TIB_API_URL || 'https://www.tibcourier.com/api/list-warehouse',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error verificando API TIB';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/tib/sync-inventario
 * Descarga en vivo desde la API oficial de TIB Courier (RECIBIDO, ENVIADO, ENTREGADO)
 * y actualiza directamente los paquetes en Supabase sin necesidad de subir archivos Excel.
 * Opcionalmente actualiza también los 3 archivos diarios en R2 + Worker VPS para Cobros.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const filtroEstado: 'activos' | 'todos' = body.filtro_estado === 'todos' ? 'todos' : 'activos';
    const onlyCloudFiles = Boolean(body.only_cloud_files);
    const syncCloudFiles = body.sync_cloud_files !== undefined ? Boolean(body.sync_cloud_files) : false;
    const requestedSlot = body.slot as TibSlotType | undefined;

    const userNombre = getUserDisplayName(auth.user).slice(0, 120);
    const userEmail = auth.user.email || '';
    const userId = auth.user.id;
    const todayLima = getLimaDateString();

    // Modo 1: Sincronizar únicamente un slot o los 3 slots hacia R2 + inventario_tib_diario (Módulo 13 / Caché)
    if (onlyCloudFiles) {
      const slotsToSync: TibSlotType[] =
        requestedSlot && ['delivered', 'sent', 'received'].includes(requestedSlot)
          ? [requestedSlot]
          : ['delivered', 'sent', 'received'];

      const syncedFiles: Record<string, unknown> = {};
      const countsBySlot: Record<string, number> = {};

      await Promise.all(
        slotsToSync.map(async (slot) => {
          const tibStatus: TibApiStatus = SLOT_TO_TIB_STATUS[slot];
          const res = await fetchTibWarehouseByStatus(tibStatus, 30000);
          countsBySlot[slot] = res.items.length;
          const buffer = generateTibXlsxBuffer(res.items);
          const saved = await syncSingleSlotToCloudAndWorker(slot, buffer, userNombre, todayLima);
          syncedFiles[slot] = saved;
        })
      );

      return NextResponse.json({
        ok: true,
        mode: 'cloud_files_only',
        countsBySlot,
        syncedFiles,
        durationMs: Date.now() - startTime,
      });
    }

    // Modo Principal: Sincronización 100% Automática de Inventario en Supabase desde API TIB (Cero Excels)
    const admin = getSupabaseAdmin();

    // 1. Descargar en paralelo las 3 listas desde TIB Courier API y obtener todos los paquetes de Supabase
    const fetchAllPackagesFromDb = async () => {
      const allPackages: Array<{
        id: string;
        numero_recibo_bodega: string;
        tracking: string | null;
        nombre_consignatario: string | null;
        tipo_empaque: string | null;
        peso_kg: number | null;
        estado_tib: string | null;
        ubicacion_actual: string | null;
        posicion_estante: string | null;
        tib_imagen_url: string | null;
        tib_ticket_pdf_url: string | null;
      }> = [];

      const PAGE_SIZE = 1000;
      let offset = 0;

      while (true) {
        let query = admin
          .from('paquetes')
          .select(
            'id, numero_recibo_bodega, tracking, nombre_consignatario, tipo_empaque, peso_kg, estado_tib, ubicacion_actual, posicion_estante, tib_imagen_url, tib_ticket_pdf_url'
          )
          .is('eliminado_en', null)
          .order('creado_en', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (filtroEstado === 'activos') {
          query = query.neq('estado_amex', 'entregado').neq('ubicacion_actual', 'Entregado');
        }

        const { data, error } = await query;
        if (error) {
          throw new Error(`Error consultando paquetes en base de datos: ${error.message}`);
        }
        if (!data || data.length === 0) break;
        allPackages.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      return allPackages;
    };

    const [tibData, dbPackages] = await Promise.all([
      fetchAllTibWarehouseLists(['RECIBIDO', 'ENVIADO', 'ENTREGADO']),
      fetchAllPackagesFromDb(),
    ]);

    if (dbPackages.length === 0) {
      if (syncCloudFiles) {
        const slots: TibSlotType[] = ['delivered', 'sent', 'received'];
        await Promise.all(
          slots.map(async (slot) => {
            const statusKey = SLOT_TO_TIB_STATUS[slot];
            const items = tibData.byStatus[statusKey] || [];
            const xlsxBuf = generateTibXlsxBuffer(items);
            await syncSingleSlotToCloudAndWorker(slot, xlsxBuf, userNombre, todayLima);
          })
        ).catch((e) => {
          console.warn('[sync-inventario] Aviso actualizando archivos TIB en R2:', e);
        });
      }

      return NextResponse.json({
        ok: true,
        totalEvaluados: 0,
        coincidencias: 0,
        dbActualizados: 0,
        cambiosDetectados: 0,
        sinCoincidencia: 0,
        tibCounts: tibData.counts,
        durationMs: Date.now() - startTime,
      });
    }

    // 2. Cruzar cada paquete de la base de datos contra el índice en memoria de TIB API
    const nowIso = new Date().toISOString();
    let coincidencias = 0;
    let sinCoincidencia = 0;
    let cambiosDetectados = 0;

    const updatesToApply: Array<{
      pkg: (typeof dbPackages)[number];
      tib: NonNullable<ReturnType<typeof tibData.lookup.get>>;
      hasDataChange: boolean;
      payload: Record<string, unknown>;
    }> = [];

    const unmatchedWrs: string[] = [];

    for (const pkg of dbPackages) {
      const canonicalWr = normalizeTibWr(pkg.numero_recibo_bodega);
      const tibMatch = tibData.lookup.get(canonicalWr);

      if (!tibMatch) {
        sinCoincidencia++;
        if (unmatchedWrs.length < 100) unmatchedWrs.push(pkg.numero_recibo_bodega);
        continue;
      }

      coincidencias++;

      const nextTracking = tibMatch.tracking || pkg.tracking || '';
      const nextCliente = tibMatch.cliente || pkg.nombre_consignatario || '';
      const nextTipo = tibMatch.tipoEmpaque || pkg.tipo_empaque || 'CAJA';
      const nextPeso = tibMatch.peso !== null ? tibMatch.peso : pkg.peso_kg;
      const nextEstadoTib = tibMatch.estadoBd || pkg.estado_tib || 'Recibido';
      const nextFotoUrl = tibMatch.fotoUrl || pkg.tib_imagen_url || null;
      const nextTicketUrl = tibMatch.ticketUrl || pkg.tib_ticket_pdf_url || null;

      const prevPeso = pkg.peso_kg !== null && pkg.peso_kg !== undefined ? Number(pkg.peso_kg) : null;
      const pesoChanged =
        nextPeso !== null && (prevPeso === null || Math.abs(nextPeso - prevPeso) > 0.005);

      const fotoChanged = Boolean(nextFotoUrl && pkg.tib_imagen_url !== nextFotoUrl);
      const ticketChanged = Boolean(nextTicketUrl && pkg.tib_ticket_pdf_url !== nextTicketUrl);

      const hasDataChange =
        String(pkg.tracking || '').trim() !== nextTracking ||
        String(pkg.nombre_consignatario || '').trim() !== nextCliente ||
        String(pkg.tipo_empaque || '').trim().toUpperCase() !== nextTipo.toUpperCase() ||
        String(pkg.estado_tib || '').trim() !== nextEstadoTib ||
        pesoChanged ||
        fotoChanged ||
        ticketChanged;

      if (hasDataChange) {
        cambiosDetectados++;
      }

      updatesToApply.push({
        pkg,
        tib: tibMatch,
        hasDataChange,
        payload: {
          id: pkg.id,
          numero_recibo_bodega: pkg.numero_recibo_bodega,
          tracking: nextTracking,
          nombre_consignatario: nextCliente,
          tipo_empaque: nextTipo,
          peso_kg: nextPeso,
          estado_tib: nextEstadoTib,
          tib_imagen_url: nextFotoUrl,
          tib_ticket_pdf_url: nextTicketUrl,
          ubicacion_actual: pkg.ubicacion_actual || 'AmexLince',
          actualizado_en: nowIso,
          eliminado_en: null,
        },
      });
    }

    // 3. Ejecutar actualización masiva en Supabase por bloques
    let dbActualizados = 0;
    const kardexEntries: Array<Record<string, unknown>> = [];
    const detalles: Array<{
      wr: string;
      cliente: string;
      tracking: string;
      peso?: number;
      estado: string;
      cambio: boolean;
    }> = [];

    const BULK_CHUNK = 150;
    for (let i = 0; i < updatesToApply.length; i += BULK_CHUNK) {
      const chunk = updatesToApply.slice(i, i + BULK_CHUNK);
      const payloads = chunk.map((c) => c.payload);

      const { error: upsertErr } = await admin
        .from('paquetes')
        .upsert(payloads, { onConflict: 'id' });

      if (!upsertErr) {
        dbActualizados += chunk.length;
        for (const c of chunk) {
          if (detalles.length < 60) {
            detalles.push({
              wr: c.pkg.numero_recibo_bodega,
              cliente: String(c.payload.nombre_consignatario || ''),
              tracking: String(c.payload.tracking || ''),
              peso: typeof c.payload.peso_kg === 'number' ? c.payload.peso_kg : undefined,
              estado: String(c.payload.estado_tib || ''),
              cambio: c.hasDataChange,
            });
          }

          if (c.hasDataChange) {
            kardexEntries.push({
              paquete_id: c.pkg.id,
              codigo_paquete: c.pkg.numero_recibo_bodega,
              consignatario: String(c.payload.nombre_consignatario || 'Cliente AMEX'),
              origen_descripcion: 'API Oficial TIB Courier',
              destino_descripcion: `Almacén Lince (${c.pkg.posicion_estante || 'REC'})`,
              tipo_movimiento: 'ACTUALIZACION_TIB',
              motivo: `Sincronización directa API TIB: Estado=${c.payload.estado_tib} | Tracking=${c.payload.tracking || 'S/T'} | Peso=${c.payload.peso_kg ?? 0}kg`,
              usuario_operador: userNombre,
              usuario_email: userEmail || null,
              usuario_id: userId,
            });
          }
        }
      } else {
        for (const c of chunk) {
          const { error: singleErr } = await admin
            .from('paquetes')
            .update(c.payload)
            .eq('id', c.pkg.id);
          if (!singleErr) dbActualizados++;
        }
      }
    }

    // 4. Registrar movimientos en Kardex para los paquetes que tuvieron cambios reales
    if (kardexEntries.length > 0) {
      const KARDEX_CHUNK = 200;
      for (let i = 0; i < kardexEntries.length; i += KARDEX_CHUNK) {
        const kChunk = kardexEntries.slice(i, i + KARDEX_CHUNK);
        try {
          const { error: kErr } = await admin.from('movimientos_kardex').insert(kChunk);
          if (kErr) {
            const fallback = kChunk.map((e) => ({ ...e, usuario_id: null }));
            await admin.from('movimientos_kardex').insert(fallback);
          }
        } catch {
          // Continuar sin bloquear la respuesta
        }
      }
    }

    // 5. Si se solicitó también actualizar la caché de archivos del día en R2 + Worker VPS (para Cobros)
    if (syncCloudFiles) {
      const slots: TibSlotType[] = ['delivered', 'sent', 'received'];
      await Promise.all(
        slots.map(async (slot) => {
          const statusKey = SLOT_TO_TIB_STATUS[slot];
          const items = tibData.byStatus[statusKey] || [];
          const xlsxBuf = generateTibXlsxBuffer(items);
          await syncSingleSlotToCloudAndWorker(slot, xlsxBuf, userNombre, todayLima);
        })
      ).catch((e) => {
        console.warn('[sync-inventario] Aviso actualizando archivos TIB en R2:', e);
      });
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      mode: 'direct_api_sync',
      filtroEstado,
      totalEvaluados: dbPackages.length,
      coincidencias,
      dbActualizados,
      cambiosDetectados,
      sinCoincidencia,
      tibCounts: tibData.counts,
      tibFetchMs: tibData.durationMs,
      durationMs,
      detalles,
      unmatchedSample: unmatchedWrs.slice(0, 30),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar con la API de TIB.';
    console.error('[api/tib/sync-inventario] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
