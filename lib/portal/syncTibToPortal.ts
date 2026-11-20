import { getPortalAdmin } from '@/lib/supabase/portal-admin';
import { fetchAllTibWarehouseLists } from '@/lib/tib/apiClient';

export function cleanExactString(str: unknown): string {
  return String(str || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function getEstadoVisiblePortal(estadoAmex?: string | null, estadoTib?: string | null): string {
  const normTib = (estadoTib || '').toUpperCase();
  if (normTib === 'ENTREGADO' || estadoAmex === 'entregado') return 'ENTREGADO';
  if (normTib === 'ENVIADO') return 'EN VUELO';
  if (normTib === 'RECIBIDO') return 'RECIBIDO MIAMI';
  if (estadoAmex === 'en_almacen' || estadoAmex === 'recibido') return 'EN ALMACÉN LINCE';
  return 'RECIBIDO MIAMI';
}

export const ADMIN_MASTER_EMAIL = 'sistemaamexcourier@gmail.com';

interface PortalClienteRow {
  email: string;
  nombre_completo?: string | null;
  alias_palabras_clave?: string[] | null;
  casillero_codigo?: string | null;
}

/**
 * Sincroniza paquetes desde TIB (TIB v2 Cargo System prioritario + historial TIB v1)
 * hacia paquetes_portal.
 */
export async function syncTibPackagesToPortal(options?: { specificEmail?: string }) {
  const portalAdmin = getPortalAdmin();
  const isSpecificRegularClient =
    options?.specificEmail && options.specificEmail.trim().toLowerCase() !== ADMIN_MASTER_EMAIL;

  // 1. Obtener los clientes registrados en clientes_portal (resiliente si no existe casillero_codigo)
  const buildClientQuery = (selectCols: string) => {
    let q = portalAdmin.from('clientes_portal').select(selectCols).eq('activo', true);
    if (isSpecificRegularClient) {
      q = q.eq('email', options!.specificEmail!.trim().toLowerCase());
    }
    return q;
  };

  let { data: clientes, error: cErr } = await buildClientQuery(
    'email, nombre_completo, alias_palabras_clave, casillero_codigo'
  );
  if (cErr && /casillero_codigo/i.test(cErr.message || '')) {
    const fallback = await buildClientQuery('email, nombre_completo, alias_palabras_clave');
    clientes = fallback.data;
    cErr = fallback.error;
  }

  if (cErr) {
    console.error('[syncTibPackagesToPortal] Error al consultar clientes_portal:', cErr);
    throw new Error('Error al consultar directorio de clientes');
  }

  const clientesList = (clientes || []) as unknown as PortalClienteRow[];

  // 2. Construir mapas de coincidencia exacta estricta para clientes regulares
  const nclientExactMap = new Map<string, string>();
  const iclientMap = new Map<string, string>();

  for (const c of clientesList) {
    const targetEmail = c.email.trim().toLowerCase();
    if (targetEmail === ADMIN_MASTER_EMAIL) continue;

    const cleanNombre = cleanExactString(c.nombre_completo);
    if (cleanNombre) {
      nclientExactMap.set(cleanNombre, targetEmail);
    }

    if (Array.isArray(c.alias_palabras_clave)) {
      for (const alias of c.alias_palabras_clave) {
        const cleanAlias = cleanExactString(alias);
        if (cleanAlias && cleanAlias.length >= 3) {
          nclientExactMap.set(cleanAlias, targetEmail);
        }
      }
    }

    if (c.casillero_codigo) {
      const cleanCasillero = cleanExactString(c.casillero_codigo);
      if (cleanCasillero) {
        iclientMap.set(cleanCasillero, targetEmail);
      }
    }
  }

  // 3. Descargar índice unificado TIB v2 (prioridad) + TIB v1 (historial)
  const tibData = await fetchAllTibWarehouseLists(['RECIBIDO', 'ENVIADO', 'ENTREGADO']);
  const allTibPackages = Array.from(tibData.lookup.values());

  // 4. Filtrar y asignar paquetes según reglas de coincidencia
  const recordsToUpsert = [];
  const nowIso = new Date().toISOString();

  for (const item of allTibPackages) {
    const cleanConsignee = cleanExactString(item.cliente);
    let matchedEmail: string | undefined;

    if (cleanConsignee && nclientExactMap.has(cleanConsignee)) {
      matchedEmail = nclientExactMap.get(cleanConsignee);
    }

    if (!matchedEmail) {
      const consigneeUpper = (item.cliente || '').toUpperCase();
      const descUpper = (item.tipoEmpaque || '').toUpperCase();
      if (consigneeUpper.includes('AMEX') || descUpper.includes('AMEX')) {
        matchedEmail = ADMIN_MASTER_EMAIL;
      }
    }

    if (options?.specificEmail) {
      const target = options.specificEmail.trim().toLowerCase();
      if (matchedEmail !== target) continue;
    }

    if (!matchedEmail || !item.wr) continue;

    let parsedDate = nowIso;
    if (item.fecRegister) {
      const d = new Date(item.fecRegister);
      if (!Number.isNaN(d.getTime())) parsedDate = d.toISOString();
    }

    recordsToUpsert.push({
      numero_recibo_bodega: item.wr,
      tracking: item.tracking || null,
      nombre_consignatario: item.cliente || '',
      usuario_email: matchedEmail,
      tipo_empaque: (item.tipoEmpaque || 'CAJA').toUpperCase(),
      peso_kg: item.peso ?? 0,
      estado_tib: item.status,
      estado_amex: 'en_almacen',
      estado_visible: getEstadoVisiblePortal('en_almacen', item.status),
      tib_imagen_url: item.fotoUrl,
      tib_ticket_pdf_url: item.ticketUrl,
      ubicacion_almacen: item.rack || null,
      erp_paquete_id: null,
      creado_en: parsedDate,
      actualizado_en: nowIso,
    });
  }

  if (recordsToUpsert.length === 0) {
    return {
      success: true,
      count: 0,
      totalTib: allTibPackages.length,
      message: 'No se encontraron paquetes en TIB para sincronizar.',
    };
  }

  // 5. Upsert optimizado por lotes (500 por lote) en paquetes_portal
  const CHUNK_SIZE = 500;
  let insertedCount = 0;

  for (let i = 0; i < recordsToUpsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToUpsert.slice(i, i + CHUNK_SIZE);
    const { error: upsertErr } = await portalAdmin
      .from('paquetes_portal')
      .upsert(chunk, { onConflict: 'numero_recibo_bodega' });

    if (upsertErr) {
      console.error('[syncTibPackagesToPortal] Error en lote upsert:', upsertErr);
    } else {
      insertedCount += chunk.length;
    }
  }

  return {
    success: true,
    count: insertedCount,
    totalTib: allTibPackages.length,
  };
}
