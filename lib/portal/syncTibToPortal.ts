import { getPortalAdmin } from '@/lib/supabase/portal-admin';
import { normalizeTibWr, getTibApiCredentials } from '@/lib/tib/apiClient';

export interface RawTibItem {
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
  _fetchedStatus?: string;
}

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

const TIB_MEDIA_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

/**
 * Consulta la API oficial de TIB para un estado dado ('RECIBIDO', 'ENVIADO', 'ENTREGADO')
 */
async function fetchTibStatus(url: string, email: string, password: string, status: string): Promise<RawTibItem[]> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, status }),
    });

    if (!res.ok) {
      console.warn(`[TIB API] HTTP ${res.status} al consultar estado ${status}`);
      return [];
    }

    const json = await res.json();
    return (json.data || []).map((item: RawTibItem) => ({ ...item, _fetchedStatus: status }));
  } catch (err) {
    console.error(`[TIB API] Error al consultar estado ${status}:`, err);
    return [];
  }
}

/**
 * Sincroniza paquetes ÚNICA Y EXCLUSIVAMENTE desde la API oficial de TIB hacia paquetes_portal.
 * Desacoplado 100% del ERP interno de paquetes.
 * Regla de asignación: Coincidencia EXACTA estricta entre el nclient de TIB y las palabras clave / alias del cliente.
 */
export async function syncTibPackagesToPortal(options?: { specificEmail?: string }) {
  const portalAdmin = getPortalAdmin();
  const credentials = getTibApiCredentials();

  // 1. Obtener los clientes registrados en clientes_portal
  let clientQuery = portalAdmin
    .from('clientes_portal')
    .select('email, nombre_completo, alias_palabras_clave, casillero_codigo')
    .eq('activo', true);

  if (options?.specificEmail) {
    clientQuery = clientQuery.eq('email', options.specificEmail.trim().toLowerCase());
  }

  const { data: clientes, error: cErr } = await clientQuery;
  if (cErr) {
    console.error('[syncTibPackagesToPortal] Error al consultar clientes_portal:', cErr);
    throw new Error('Error al consultar directorio de clientes');
  }

  const clientesList = clientes || [];
  if (clientesList.length === 0) {
    return { success: true, count: 0, message: 'No hay clientes registrados para sincronizar.' };
  }

  // 2. Construir mapas de coincidencia exacta estricta
  // nclientExactMap: mapea "NOMBRE CONSIGNATARIO EXACTO" -> email
  const nclientExactMap = new Map<string, string>();
  // iclientMap: mapea "31888" -> email
  const iclientMap = new Map<string, string>();

  for (const c of clientesList) {
    const targetEmail = c.email.trim().toLowerCase();

    // Nombre completo exacto
    const cleanNombre = cleanExactString(c.nombre_completo);
    if (cleanNombre) {
      nclientExactMap.set(cleanNombre, targetEmail);
    }

    // Palabras clave o alias exactos
    if (Array.isArray(c.alias_palabras_clave)) {
      for (const alias of c.alias_palabras_clave) {
        const cleanAlias = cleanExactString(alias);
        if (cleanAlias && cleanAlias.length >= 3) {
          nclientExactMap.set(cleanAlias, targetEmail);
        }
      }
    }

    // Código de casillero / iclient si existiera
    if (c.casillero_codigo) {
      const cleanCasillero = cleanExactString(c.casillero_codigo);
      if (cleanCasillero) {
        iclientMap.set(cleanCasillero, targetEmail);
      }
    }
  }

  // 3. Descargar en paralelo todos los estados de la API oficial de TIB
  const [recibidos, enviados, entregados] = await Promise.all([
    fetchTibStatus(credentials.url, credentials.email, credentials.password, 'RECIBIDO'),
    fetchTibStatus(credentials.url, credentials.email, credentials.password, 'ENVIADO'),
    fetchTibStatus(credentials.url, credentials.email, credentials.password, 'ENTREGADO'),
  ]);

  const allTibPackages = [...recibidos, ...enviados, ...entregados];

  // 4. Filtrar y procesar solo aquellos paquetes que coincidan EXACTAMENTE con un cliente
  const recordsToUpsert = [];

  for (const item of allTibPackages) {
    const cleanConsignee = cleanExactString(item.nclient);
    const cleanIclient = cleanExactString(item.iclient);

    // Búsqueda de coincidencia exacta estricta
    let matchedEmail: string | undefined = undefined;

    if (cleanConsignee && nclientExactMap.has(cleanConsignee)) {
      matchedEmail = nclientExactMap.get(cleanConsignee);
    } else if (cleanIclient && iclientMap.has(cleanIclient)) {
      matchedEmail = iclientMap.get(cleanIclient);
    }

    // Si coincide exactamente con un cliente, estructurar para paquetes_portal
    if (matchedEmail) {
      const canonicalWr = normalizeTibWr(item.wr, item.seqwr);
      if (!canonicalWr) continue;

      const fullImgUrl = item.img
        ? `${TIB_MEDIA_BASE_URL}${item.img.replace(/^\/+/, '')}`
        : null;

      const fullTicketUrl = item.ticket
        ? `${TIB_MEDIA_BASE_URL}${item.ticket.replace(/^\/+/, '')}`
        : null;

      const weightNum = item.weight != null ? parseFloat(String(item.weight)) : 0;
      const statusTib = item._fetchedStatus || item.status || 'RECIBIDO';

      let parsedDate = new Date().toISOString();
      if (item.fecRegister) {
        const d = new Date(item.fecRegister);
        if (!isNaN(d.getTime())) parsedDate = d.toISOString();
      }

      recordsToUpsert.push({
        numero_recibo_bodega: canonicalWr,
        tracking: item.tracking?.trim() || null,
        nombre_consignatario: (item.nclient || '').trim(),
        usuario_email: matchedEmail,
        tipo_empaque: (item.container || item.description || 'CAJA').trim().toUpperCase(),
        peso_kg: isNaN(weightNum) ? 0 : weightNum,
        estado_tib: statusTib,
        estado_amex: 'en_almacen',
        estado_visible: getEstadoVisiblePortal('en_almacen', statusTib),
        tib_imagen_url: fullImgUrl,
        tib_ticket_pdf_url: fullTicketUrl,
        ubicacion_almacen: item.rack?.trim() || null,
        erp_paquete_id: null,
        creado_en: parsedDate,
        actualizado_en: new Date().toISOString(),
      });
    }
  }

  if (recordsToUpsert.length === 0) {
    return {
      success: true,
      count: 0,
      totalTib: allTibPackages.length,
      message: 'No se encontraron paquetes en TIB que coincidan con las palabras clave exactas.',
    };
  }

  // 5. Upsert por lotes en paquetes_portal
  const CHUNK_SIZE = 100;
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
