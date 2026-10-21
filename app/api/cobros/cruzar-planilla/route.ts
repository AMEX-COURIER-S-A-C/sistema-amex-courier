import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import readXlsxFile from 'read-excel-file/node';
import { getR2Client, R2_BUCKET_NAME, R2_ROOT_FOLDER } from '@/lib/r2/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { withApi } from '@/lib/api/withApi';
import { normalizeTibWr } from '@/lib/tib/apiClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_FILAS = 5000;

interface TibItem {
  tracking: string;
  cliente: string;
  tipo: string;
  peso: number | null;
}

export interface FilaCruzarInput {
  filaOriginal?: number;
  rawWr: string;
  wrs: string[];
  delimiter?: string;
  esMultiWr?: boolean;
  consignatario?: string;
  observaciones?: string;
  descripcion?: string;
  valorDeclarado?: number | null;
  dni?: string;
}

export interface FilaResultadoCobro {
  filaOriginal: number;
  /** El código WR original o combinado (ej: "WR000468049-WR000467966") */
  wr: string;
  /** Los WRs individuales */
  wrs: string[];
  esMultiWr: boolean;
  delimiter: string;
  /** Nombre del cliente oficial (del TIB o consignatario del instructivo) */
  cliente: string;
  /** Peso en texto formateado para la celda de Excel (ej: "3.98 - 2.22" o "2.50") */
  pesoFormateado: string;
  /** Suma numérica total de los pesos (para totales y estadísticas) */
  pesoTotal: number | null;
  /** Tracking o trackings combinados con el delimitador (ej: "YCE78A3 - YCE78A6") */
  tracking: string;
  /** Tipo de paquete (ej: "CAJA") */
  tipo: string;
  /** Casillero / código cliente u observaciones */
  observaciones: string;
  /** Descripción del instructivo */
  descripcion: string;
  /** Documento de identidad */
  dni: string;
  /** True si todos los WRs de la fila fueron encontrados */
  encontrado: boolean;
  /** True si solo algunos WRs de la fila se encontraron */
  matchParcial: boolean;
  wrsEncontrados: number;
  totalWrsFila: number;
  /** Detalle individual por cada WR dentro de la celda */
  detalles: Array<TibItem & { wr: string; encontrado: boolean }>;
}

function limpiar(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (s.startsWith("'")) s = s.slice(1).trim();
  return s;
}

function aNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100) / 100;
  const n = parseFloat(limpiar(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function esKeyValida(key: string): boolean {
  return (
    key.length > 0 &&
    key.toLowerCase().endsWith('.xlsx') &&
    !key.includes('\0') &&
    !key.split('/').some((s) => s === '..')
  );
}

function indiceKeyPara(enviadoKey: string): string {
  const hash = createHash('sha1').update(enviadoKey).digest('hex').slice(0, 16);
  return `${R2_ROOT_FOLDER}/inventario-jobs/cobros-indices/${hash}.json`;
}

/**
 * Busca la clave del ENVIADO TIB más reciente:
 * 1. Primero en inventario_tib_diario (si se subió como archivo del día)
 * 2. Segundo en inventario_jobs (del módulo 13)
 */
async function resolverUltimoEnviadoKey(): Promise<string | null> {
  const admin = getSupabaseAdmin();

  // 1. Buscar en inventario_tib_diario
  const { data: tibDiario } = await admin
    .from('inventario_tib_diario')
    .select('r2_key,fecha,subido_en')
    .eq('tipo', 'sent')
    .eq('es_activo', true)
    .order('fecha', { ascending: false })
    .order('subido_en', { ascending: false })
    .limit(1);

  if (tibDiario && tibDiario.length > 0 && tibDiario[0].r2_key) {
    return tibDiario[0].r2_key;
  }

  // 2. Buscar en inventario_jobs
  const { data: jobs } = await admin
    .from('inventario_jobs')
    .select('enviado_key,fuentes,creado_en')
    .not('enviado_key', 'is', null)
    .order('creado_en', { ascending: false })
    .limit(20);

  const hit = (jobs || []).find(
    (j) => Array.isArray((j as { fuentes?: unknown }).fuentes) && ((j as { fuentes: string[] }).fuentes.includes('sent'))
  ) as { enviado_key: string } | undefined;

  return hit?.enviado_key || null;
}

async function leerIndice(client: ReturnType<typeof getR2Client>, key: string): Promise<Record<string, TibItem> | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return JSON.parse(Buffer.from(bytes).toString('utf-8')) as Record<string, TibItem>;
  } catch {
    return null;
  }
}

async function resolverFuentesTibDiario(): Promise<Record<string, string>> {
  const admin = getSupabaseAdmin();
  const { data: diarios } = await admin
    .from('inventario_tib_diario')
    .select('tipo,r2_key,fecha,subido_en')
    .eq('es_activo', true)
    .order('fecha', { ascending: false })
    .order('subido_en', { ascending: false });

  const map: Record<string, string> = {};
  for (const d of diarios || []) {
    if (!map[d.tipo]) {
      map[d.tipo] = d.r2_key;
    }
  }
  return map;
}

async function construirIndiceMultiestado(
  client: ReturnType<typeof getR2Client>,
  enviadoKey: string
): Promise<Record<string, TibItem>> {
  const fuentesMap = await resolverFuentesTibDiario();
  // Orden de precedencia: RECIBIDO primero, luego ENVIADO, luego ENTREGADO
  const keysToLoad: string[] = [];
  if (fuentesMap.received) keysToLoad.push(fuentesMap.received);
  if (enviadoKey) keysToLoad.push(enviadoKey);
  else if (fuentesMap.sent) keysToLoad.push(fuentesMap.sent);
  if (fuentesMap.delivered) keysToLoad.push(fuentesMap.delivered);

  const uniqueKeys = Array.from(new Set(keysToLoad));
  const indice: Record<string, TibItem> = {};

  for (const key of uniqueKeys) {
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      if (!res.Body) continue;
      const bytes = await res.Body.transformToByteArray();
      const sheetResult = await readXlsxFile(Buffer.from(bytes));
      const rows = (sheetResult[0]?.data || sheetResult) as unknown as unknown[][];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const raw = limpiar(r[0]);
        if (!raw) continue;
        const norm = normalizeTibWr(raw);
        const item: TibItem = {
          tracking: limpiar(r[1]),
          cliente: limpiar(r[2]),
          tipo: limpiar(r[3]),
          peso: aNumero(r[4]),
        };
        indice[raw.toUpperCase()] = item;
        if (norm) indice[norm] = item;
      }
    } catch (readErr) {
      console.warn(`[Cruzar Planilla] Error leyendo fuente R2 ${key}:`, readErr);
    }
  }
  return indice;
}

async function enriquecerConSupabasePaquetes(
  filasResultado: FilaResultadoCobro[]
): Promise<FilaResultadoCobro[]> {
  const wrsMap = new Map<string, string>();

  for (const f of filasResultado) {
    if (!f.encontrado) {
      for (const d of f.detalles) {
        if (!d.encontrado && d.wr) {
          const norm = normalizeTibWr(d.wr);
          if (norm) wrsMap.set(norm, d.wr);
        }
      }
    }
  }

  if (wrsMap.size === 0) return filasResultado;

  try {
    const admin = getSupabaseAdmin();
    const normalizedKeys = Array.from(wrsMap.keys());
    const dbHits = new Map<string, any>();

    const CHUNK_SIZE = 200;
    for (let i = 0; i < normalizedKeys.length; i += CHUNK_SIZE) {
      const chunk = normalizedKeys.slice(i, i + CHUNK_SIZE);
      const { data: pkgs } = await admin
        .from('paquetes')
        .select('numero_recibo_bodega, tracking, nombre_consignatario, peso_kg, tipo_empaque, estado_tib')
        .in('numero_recibo_bodega', chunk);

      if (pkgs) {
        for (const p of pkgs) {
          if (p.numero_recibo_bodega) {
            dbHits.set(p.numero_recibo_bodega.toUpperCase(), p);
          }
        }
      }
    }

    if (dbHits.size === 0) return filasResultado;

    for (const f of filasResultado) {
      if (f.encontrado) continue;

      let rowUpdated = false;
      for (const d of f.detalles) {
        if (!d.encontrado && d.wr) {
          const norm = normalizeTibWr(d.wr);
          const hit = dbHits.get(norm);
          if (hit) {
            d.encontrado = true;
            d.tracking = hit.tracking || d.tracking || '';
            d.cliente = hit.nombre_consignatario || d.cliente || '';
            d.tipo = hit.tipo_empaque || d.tipo || 'CAJA';
            d.peso = hit.peso_kg !== null && hit.peso_kg !== undefined ? Number(hit.peso_kg) : d.peso;
            rowUpdated = true;
          }
        }
      }

      if (rowUpdated) {
        const wrsEncontrados = f.detalles.filter(d => d.encontrado).length;
        f.encontrado = wrsEncontrados === f.detalles.length;
        f.matchParcial = wrsEncontrados > 0 && wrsEncontrados < f.detalles.length;
        f.wrsEncontrados = wrsEncontrados;

        const delimiter = f.delimiter || ' - ';
        const nombresClientes = f.detalles.map(d => d.cliente || f.cliente || 'SIN CLIENTE');
        f.cliente = f.detalles.length > 1 ? nombresClientes.join(delimiter) : (nombresClientes[0] || f.cliente);

        const pesosValidos = f.detalles.filter(d => d.peso !== null).map(d => d.peso as number);
        f.pesoTotal = pesosValidos.length > 0 ? Math.round(pesosValidos.reduce((a, b) => a + b, 0) * 100) / 100 : null;
        f.pesoFormateado = f.detalles.map(d => (d.peso !== null ? d.peso.toFixed(2) : '?')).join(delimiter);
        f.tracking = f.detalles.map(d => d.tracking || '').filter(Boolean).join(delimiter);
      }
    }
  } catch (err) {
    console.warn('[Cruzar Planilla] Error al enriquecer con Supabase paquetes:', err);
  }

  return filasResultado;
}

/**
 * Consulta en vivo la API oficial de TIB para cualquier WR que no haya hecho match en la caché
 * ni en Supabase (ej: paquetes registrados hoy o hace minutos en TIB Miami).
 */
async function enriquecerConTibApiEnVivo(
  filasResultado: FilaResultadoCobro[]
): Promise<FilaResultadoCobro[]> {
  const missingWrs = new Set<string>();
  for (const f of filasResultado) {
    if (!f.encontrado) {
      for (const d of f.detalles) {
        if (!d.encontrado && d.wr) {
          const norm = normalizeTibWr(d.wr);
          if (norm) missingWrs.add(norm);
        }
      }
    }
  }

  if (missingWrs.size === 0) return filasResultado;

  try {
    const { fetchTibWarehouseByStatus } = await import('@/lib/tib/apiClient');
    // Consultar estados en vivo (ENVIADO y RECIBIDO son los más comunes para embarques recientes)
    const [resSent, resRec] = await Promise.all([
      fetchTibWarehouseByStatus('ENVIADO', 12000).catch(() => null),
      fetchTibWarehouseByStatus('RECIBIDO', 12000).catch(() => null),
    ]);

    const liveHits = new Map<string, any>();
    if (resSent?.items) {
      for (const item of resSent.items) {
        if (missingWrs.has(item.wr)) liveHits.set(item.wr, item);
      }
    }
    if (resRec?.items) {
      for (const item of resRec.items) {
        if (missingWrs.has(item.wr) && !liveHits.has(item.wr)) liveHits.set(item.wr, item);
      }
    }

    if (liveHits.size === 0) return filasResultado;

    for (const f of filasResultado) {
      if (f.encontrado) continue;

      let rowUpdated = false;
      for (const d of f.detalles) {
        if (!d.encontrado && d.wr) {
          const norm = normalizeTibWr(d.wr);
          const hit = liveHits.get(norm);
          if (hit) {
            d.encontrado = true;
            d.tracking = hit.tracking || d.tracking || '';
            d.cliente = hit.cliente || d.cliente || '';
            d.tipo = hit.tipoEmpaque || d.tipo || 'CAJA';
            d.peso = hit.peso !== null && hit.peso !== undefined ? Number(hit.peso) : d.peso;
            rowUpdated = true;
          }
        }
      }

      if (rowUpdated) {
        const wrsEncontrados = f.detalles.filter((d) => d.encontrado).length;
        f.encontrado = wrsEncontrados === f.detalles.length;
        f.matchParcial = wrsEncontrados > 0 && wrsEncontrados < f.detalles.length;
        f.wrsEncontrados = wrsEncontrados;

        const delimiter = f.delimiter || ' - ';
        const nombresClientes = f.detalles.map((d) => d.cliente || f.cliente || 'SIN CLIENTE');
        f.cliente = f.detalles.length > 1 ? nombresClientes.join(delimiter) : (nombresClientes[0] || f.cliente);

        const pesosValidos = f.detalles.filter((d) => d.peso !== null).map((d) => d.peso as number);
        f.pesoTotal = pesosValidos.length > 0 ? Math.round(pesosValidos.reduce((a, b) => a + b, 0) * 100) / 100 : null;
        f.pesoFormateado = f.detalles.map((d) => (d.peso !== null ? d.peso.toFixed(2) : '?')).join(delimiter);
        f.tracking = f.detalles.map((d) => d.tracking || '').filter(Boolean).join(delimiter);
      }
    }
  } catch (err) {
    console.warn('[Cruzar Planilla] Error al consultar API TIB en vivo:', err);
  }

  return filasResultado;
}

const CruzarPlanillaSchema = z.object({
  filas: z.array(z.any()).optional(),
  wrs: z.array(z.string()).optional(),
  forzar_local: z.boolean().optional(),
  fuente: z.string().optional(),
  enviado_key: z.string().optional(),
}).refine(data => (data.filas && data.filas.length > 0) || (data.wrs && data.wrs.length > 0), {
  message: 'Envía las filas del instructivo (filas) o la lista de WRs (wrs).'
});

export const POST = withApi(
  {
    auth: true,
    rateLimit: {
      limit: 30,
      windowMs: 60_000,
      prefix: 'cobros-cruzar-planilla',
    },
    bodySchema: CruzarPlanillaSchema,
  },
  async ({ body }) => {
    const rawFilas: FilaCruzarInput[] = Array.isArray(body.filas) ? body.filas : [];
    const rawWrs: string[] = Array.isArray(body.wrs) ? body.wrs : [];

    if (rawFilas.length > MAX_FILAS || rawWrs.length > MAX_FILAS) {
      return NextResponse.json({ error: `Máximo ${MAX_FILAS} registros por cruce.` }, { status: 400 });
    }

    // Normalizar a lista de filas si enviaron formato plano legacy (wrs: string[])
    const filasInput: FilaCruzarInput[] = rawFilas.length > 0
      ? rawFilas
      : rawWrs.map((w, idx) => ({
          filaOriginal: idx + 1,
          rawWr: w,
          wrs: [w],
          delimiter: ' - ',
          esMultiWr: false,
        }));

    // 1. PRIORIDAD: Delegar procesamiento al VPS de Hostinger (donde viven los TIBs en SSD local permanente)
    const vpsHost = process.env.VPS_HOST || '2.25.89.222';
    const workerPort = process.env.WORKER_PORT || '10000';
    const workerUrl = process.env.WORKER_URL || process.env.INVENTORY_WORKER_URL || process.env.RENDER_WORKER_URL || `http://${vpsHost}:${workerPort}`;

    if (workerUrl && !body.forzar_local) {
      try {
        const vpsRes = await fetch(`${workerUrl.replace(/\/+$/, '')}/cruzar-cobros`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filas: filasInput,
            fuente: body.fuente || 'sent',
            includeFallbacks: true,
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (vpsRes.ok) {
          const vpsData = await vpsRes.json();
          if (vpsData && vpsData.ok && Array.isArray(vpsData.filasCruzadas)) {
            console.log(`[Cruzar Planilla] Cruce completado en VPS Hostinger en ${vpsData.duracionMs}ms (${vpsData.coincidenciasCompletas}/${vpsData.totalFilas} filas)`);
            let filasCruzadas = vpsData.filasCruzadas;

            // Enriquecer cualquier fila sin coincidencia usando Supabase paquetes (3 estados)
            if (filasCruzadas.some((f: any) => !f.encontrado)) {
              filasCruzadas = await enriquecerConSupabasePaquetes(filasCruzadas);
            }

            // Si todavía quedan filas sin coincidencia, consultar en vivo la API oficial de TIB
            if (filasCruzadas.some((f: any) => !f.encontrado)) {
              filasCruzadas = await enriquecerConTibApiEnVivo(filasCruzadas);
            }

            const sinMatch = filasCruzadas.filter((f: any) => !f.encontrado).map((f: any) => f.wr);
            const totalWrs = filasCruzadas.reduce((acc: number, f: any) => acc + (f.totalWrsFila || 1), 0);
            const wrsEncontrados = filasCruzadas.reduce((acc: number, f: any) => acc + (f.wrsEncontrados || 0), 0);

            return NextResponse.json({
              vps_procesado: true,
              duracion_ms: vpsData.duracionMs,
              fuente_usada: 'multi_estado_vps_y_bd',
              total_filas: vpsData.totalFilas,
              total_wrs: totalWrs,
              wrs_encontrados: wrsEncontrados,
              sin_match: sinMatch,
              filas: filasCruzadas,
            });
          }
        } else {
          console.warn(`[Cruzar Planilla] VPS respondió status ${vpsRes.status}. Usando fallback R2...`);
        }
      } catch (vpsErr: any) {
        console.warn(`[Cruzar Planilla] VPS no disponible (${vpsErr.message}). Usando fallback R2...`);
      }
    }

    let enviadoKey = String(body.enviado_key || '').trim();
    if (!enviadoKey) {
      const ultimo = await resolverUltimoEnviadoKey();
      if (!ultimo) {
        return NextResponse.json(
          { error: 'No se encontró ningún archivo ENVIADO TIB en el sistema. Por favor cárgalo primero en el módulo de Inventario.' },
          { status: 404 }
        );
      }
      enviadoKey = ultimo;
    }

    if (!esKeyValida(enviadoKey)) {
      return NextResponse.json({ error: 'Clave de archivo ENVIADO inválida.' }, { status: 400 });
    }

    const client = getR2Client();
    const indiceKey = indiceKeyPara(enviadoKey);

    let indice = await leerIndice(client, indiceKey);
    let indiceCacheado = true;

    if (!indice) {
      indiceCacheado = false;
      indice = await construirIndiceMultiestado(client, enviadoKey);
      // Guardar caché en R2 para que los siguientes cruces sean instantáneos (< 200 ms)
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: indiceKey,
            Body: Buffer.from(JSON.stringify(indice)),
            ContentType: 'application/json',
          })
        );
      } catch (cacheErr) {
        console.warn('[Cruzar Planilla] No se pudo guardar el índice en caché:', cacheErr);
      }
    }

    // Cruce fila por fila manteniendo celdas multi-WR agrupadas
    let filasResultado: FilaResultadoCobro[] = [];
    const sinMatch: string[] = [];
    let totalWrsEncontrados = 0;
    let totalWrsBuscados = 0;

    for (let i = 0; i < filasInput.length; i++) {
      const f = filasInput[i];
      const delimiter = f.delimiter || (f.rawWr.includes('/') ? ' / ' : ' - ');
      const wrsTokens = (f.wrs && f.wrs.length > 0)
        ? f.wrs.map(w => limpiar(w).toUpperCase()).filter(Boolean)
        : (f.rawWr.toUpperCase().match(/WR\d+/gi) || []);

      totalWrsBuscados += wrsTokens.length;

      const detalles: Array<TibItem & { wr: string; encontrado: boolean }> = [];
      const pesosValidos: number[] = [];
      const pesosTextos: string[] = [];
      const trackingsTextos: string[] = [];
      const tiposSet = new Set<string>();
      let clienteNombre = '';

      for (const wr of wrsTokens) {
        const hit = indice[wr];
        if (hit) {
          totalWrsEncontrados++;
          detalles.push({ wr, tracking: hit.tracking, cliente: hit.cliente, tipo: hit.tipo, peso: hit.peso, encontrado: true });
          if (hit.peso !== null) {
            pesosValidos.push(hit.peso);
            pesosTextos.push(hit.peso.toFixed(2));
          } else {
            pesosTextos.push('—');
          }
          if (hit.tracking) trackingsTextos.push(hit.tracking);
          if (hit.tipo) tiposSet.add(hit.tipo);
          if (!clienteNombre && hit.cliente) clienteNombre = hit.cliente;
        } else {
          sinMatch.push(wr);
          detalles.push({ wr, tracking: '', cliente: '', tipo: '', peso: null, encontrado: false });
          pesosTextos.push('?');
        }
      }

      const wrsEncontrados = detalles.filter(d => d.encontrado).length;
      const encontrado = wrsEncontrados === wrsTokens.length && wrsTokens.length > 0;
      const matchParcial = wrsEncontrados > 0 && wrsEncontrados < wrsTokens.length;

      // Si es multi-WR, combinar los nombres individuales con el delimitador
      const nombresClientes = detalles.map((d) => d.cliente || f.consignatario || 'SIN CLIENTE');
      clienteNombre = wrsTokens.length > 1
        ? nombresClientes.join(delimiter)
        : (nombresClientes[0] || f.consignatario || 'SIN CLIENTE');

      // Formatear pesos con el delimitador original (ej: "3.98 - 2.22")
      const pesoFormateado = pesosTextos.join(delimiter);
      const pesoTotal = pesosValidos.length > 0
        ? Math.round(pesosValidos.reduce((a, b) => a + b, 0) * 100) / 100
        : null;

      // Formatear trackings con el delimitador original (ej: "YCE78A3 - YCE78A6")
      const tracking = trackingsTextos.join(delimiter);

      // Tipo de paquete consolidado
      const tipo = tiposSet.size > 0 ? Array.from(tiposSet).join(' / ') : 'CAJA';

      filasResultado.push({
        filaOriginal: f.filaOriginal || i + 1,
        wr: f.rawWr,
        wrs: wrsTokens,
        esMultiWr: wrsTokens.length > 1,
        delimiter,
        cliente: clienteNombre.toUpperCase(),
        pesoFormateado,
        pesoTotal,
        tracking,
        tipo,
        observaciones: f.observaciones || '',
        descripcion: f.descripcion || '',
        dni: f.dni || '',
        encontrado,
        matchParcial,
        wrsEncontrados,
        totalWrsFila: wrsTokens.length,
        detalles,
      });
    }

    if (filasResultado.some((f) => !f.encontrado)) {
      filasResultado = await enriquecerConSupabasePaquetes(filasResultado);
    }

    if (filasResultado.some((f) => !f.encontrado)) {
      filasResultado = await enriquecerConTibApiEnVivo(filasResultado);
    }

    const finalSinMatch = filasResultado.filter((f) => !f.encontrado).map((f) => f.wr);
    const finalWrsEncontrados = filasResultado.reduce((acc, f) => acc + (f.wrsEncontrados || 0), 0);

    return NextResponse.json({
      enviado_key: enviadoKey,
      indice_cacheado: indiceCacheado,
      total_filas: filasResultado.length,
      total_wrs: totalWrsBuscados,
      wrs_encontrados: finalWrsEncontrados,
      sin_match: finalSinMatch,
      filas: filasResultado,
    });
  }
);
