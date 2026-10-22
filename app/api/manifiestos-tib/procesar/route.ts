import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/auth/guards';
import OpenAI from 'openai';
import sharp from 'sharp';
import { uploadFileToR2 } from '@/lib/r2/client';
import { getDateSegments, sanitizeFileName } from '@/lib/r2/datePartitionedUpload';
import { normalizeTibWr } from '@/lib/tib/apiClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 120; // 2 minutos para procesamiento de documentos multipágina

/**
 * Corrige inclinación (deskew) en páginas escaneadas mediante perfil de proyección horizontal.
 * Garantiza que las filas de la tabla queden perfectamente horizontales para evitar
 * desfases o desalineaciones entre la columna GUIA y la columna WR.
 */
async function detectAndDeskew(buffer: Buffer): Promise<Buffer> {
  try {
    const small = await sharp(buffer)
      .resize({ width: 600 })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = small;
    const { width, height } = info;
    let bestAngle = 0;
    let maxVariance = -1;

    for (let a = -5.0; a <= 5.0; a += 0.5) {
      const rot = await sharp(data, { raw: { width, height, channels: 1 } })
        .rotate(a, { background: '#ffffff' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rotData = rot.data;
      const rW = rot.info.width;
      const rH = rot.info.height;

      const startY = Math.floor(rH * 0.15);
      const endY = Math.floor(rH * 0.85);
      let mean = 0;
      const sums: number[] = [];
      for (let y = startY; y < endY; y++) {
        let sum = 0;
        for (let x = Math.floor(rW * 0.1); x < Math.floor(rW * 0.9); x++) {
          sum += rotData[y * rW + x];
        }
        sums.push(sum);
        mean += sum;
      }
      mean /= sums.length;
      let variance = 0;
      for (const s of sums) {
        variance += (s - mean) * (s - mean);
      }

      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = a;
      }
    }

    if (Math.abs(bestAngle) >= 0.5) {
      return await sharp(buffer)
        .rotate(bestAngle, { background: '#ffffff' })
        .jpeg({ quality: 95 })
        .toBuffer();
    }
  } catch (err) {
    console.warn('[Deskew]: Error al corregir inclinación, continuando con imagen original:', err);
  }
  return buffer;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo PDF o imagen.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Subida paralela a Cloudflare R2 para visualización y descarga
    let archivoUrl: string | null = null;
    try {
      const { year, month, day } = getDateSegments();
      const cleanBase = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '')) || 'MANIFIESTO';
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const subPath = `manifiestos-tib/${year}/${month}/${day}/${cleanBase}.${ext}`;
      const r2Res = await uploadFileToR2(fileBuffer, subPath, file.type || 'application/pdf');
      archivoUrl = r2Res.url;
    } catch (r2Err) {
      console.warn('[R2 Upload Warning in procesar]:', r2Err);
    }

    // 1. Intentar procesar en el microservicio Python VPS si está disponible
    const vpsHost = process.env.VPS_HOST || '2.25.89.222';
    const engineUrl = process.env.MANIFEST_ENGINE_URL || `http://${vpsHost}:8000`;

    try {
      const pythonFormData = new FormData();
      const blob = new Blob([fileBuffer], { type: file.type || 'application/pdf' });
      pythonFormData.append('file', blob, file.name);

      // Timeout corto (3s) para no bloquear al operador si el puerto o VPS no está activo
      const pyRes = await fetch(`${engineUrl}/process-manifest`, {
        method: 'POST',
        body: pythonFormData,
        signal: AbortSignal.timeout(3500),
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json({ ...pyData, archivo_url: archivoUrl });
      }
    } catch {
      // Si el microservicio Python en VPS no está disponible, pasar a motor multimodal
    }

    // 2. Motor de Contingencia Inteligente (Soporta PDF multipágina e imágenes)
    if (process.env.OPENAI_API_KEY) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      // Extraer imágenes de cada página si es PDF, o usar la imagen directa
      let pageImages: Array<{ buffer: Buffer; mime: string }> = [];

      if (isPdf) {
        // En PDFs escaneados de bodegas y courier, cada página es un stream JPEG
        const extractedJpegs: Buffer[] = [];
        let pos = 0;
        while (pos < fileBuffer.length) {
          const start = fileBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), pos);
          if (start === -1) break;
          const end = fileBuffer.indexOf(Buffer.from([0xff, 0xd9]), start + 3);
          if (end === -1) break;
          const jpegBuf = fileBuffer.subarray(start, end + 2);
          if (jpegBuf.length > 15000) {
            extractedJpegs.push(jpegBuf);
          }
          pos = end + 2;
        }

        if (extractedJpegs.length > 0) {
          pageImages = extractedJpegs.map((buf) => ({ buffer: buf, mime: 'image/jpeg' }));
        } else {
          return NextResponse.json(
            {
              error:
                'No se pudieron extraer imágenes legibles del PDF escaneado. Por favor sube fotografías (.jpg, .png) o un PDF escaneado estándar.',
            },
            { status: 400 }
          );
        }
      } else {
        const mime = file.type || 'image/jpeg';
        pageImages = [{ buffer: fileBuffer, mime }];
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_MANIFEST_MODEL || 'gpt-6.1-sol';

      let encabezadoExtraid: any = {
        fecha_vuelo: '',
        cliente: 'AMEX',
        modalidad: 'OFICINA',
        guias_declaradas: 0,
        paquetes_declarados: 0,
      };

      const todasLasFilas: any[] = [];

      // Procesar cada página para evitar truncamiento de tokens y asegurar 100% de filas
      for (let pIdx = 0; pIdx < pageImages.length; pIdx++) {
        const pageNum = pIdx + 1;
        const pageItem = pageImages[pIdx];

        // Corregir inclinación óptica (deskew) para que las líneas de la cuadrícula queden 100% horizontales
        const processedBuffer = await detectAndDeskew(pageItem.buffer);
        const pageBase64 = processedBuffer.toString('base64');
        const isFirstPage = pIdx === 0;

        const pagePrompt = isFirstPage
          ? `Esta es la Página 1 de un manifiesto físico diario de entrega de TIB Courier a AMEX.
La tabla contiene 3 columnas principales: "GUIA", "OBSERVACION" y "WR".

Debes extraer con total precisión:
1. "encabezado":
   - "fecha_vuelo": Texto en 'FECHA DE VUELO' (ej: "4-10").
   - "cliente": Nombre del cliente (ej: "AMEX").
   - "modalidad": Uno de ['OFICINA', 'DOMICILIO', 'PROVINCIA']. Observa con sumo cuidado los tres recuadros a la derecha de DOMICILIO, OFICINA y PROVINCIA: identifica cuál de los 3 recuadros tiene marcada la 'X', cruz o aspa. Si la 'X' está en el recuadro de OFICINA, la modalidad es "OFICINA". Si está en DOMICILIO, es "DOMICILIO". Si está en PROVINCIA, es "PROVINCIA".
   - "guias_declaradas": El número en '# GUIAS' (ej: 159).
   - "paquetes_declarados": El número en '# PAQUETES EMBARCADOS' (ej: 196).
2. "filas": Todas las filas de la tabla presentes en esta página 1:
   INSTRUCCIONES CRÍTICAS DE FORMATO Y OCR:
   - FORMATO CANÓNICO DE CÓDIGO WR: Todo recibo de bodega TIB tiene EXACTAMENTE 11 caracteres: "WR" + TRES CEROS INICIALES ("000") + 6 DÍGITOS CORRELATIVOS (ejemplo: "WR000481141"). NUNCA omitas el tercer cero aunque la tinta del margen izquierdo esté desgastada o cortada. Si ves "WR00482...", el código real impreso es "WR000482...".
   - ALERTA TIPOGRÁFICA DE MATRIZ DE PUNTOS (0 vs 8, 1 vs 4, 1 vs 7): En esta tipografía de agujas, NUNCA confundas: 
     * "0" con "8": "WR000482002" termina en "2002" (NO "2802"); "WR000481988" termina en "988" (NO "908").
     * "1" con "4": "WR000480131" tiene "131" (NO "431"); "WR000481904" termina en "904" (NO "901").
     * "1" con "7": "WR000480177" tiene "177" (NO "777"); "WR000481101" tiene "101" (NO "701").
   - FORMATO DE GUÍA AMX: Siempre inicia con "AMX" seguido de dígitos correlativos (ej: "AMX000010658").
   - ALINEACIÓN POR LÍNEA HORIZONTAL: Cada fila está estrictamente delimitada por las líneas horizontales negras continuas de la tabla. Sigue la cuadrícula fila por fila de arriba a abajo. Cada código AMX de la columna izquierda se corresponde ÚNICA Y EXCLUSIVAMENTE con el código WR que está dentro de sus MISMAS líneas divisorias horizontales.
   - FILAS CON MÚLTIPLES PAQUETES: Si una fila tiene 2 o más códigos WR dentro de la misma celda (por ejemplo separados por '/' o '-', o en varios renglones dentro de la misma casilla), agrúpalos TODOS en el arreglo "wrs" de ESA misma guía. NUNCA desplaces códigos WR a las filas contiguas.
   - NUNCA DESPLACES FILAS: Si una celda WR estuviese vacía, asigna "wrs": []. NUNCA le asignes a una fila el WR de otra fila.
   - No omitas ninguna fila visible.`
          : `Esta es la Página ${pageNum} del manifiesto físico de entrega de TIB Courier a AMEX.
La tabla contiene 3 columnas: "GUIA", "OBSERVACION" y "WR".

INSTRUCCIONES CRÍTICAS DE FORMATO Y OCR:
- FORMATO CANÓNICO DE CÓDIGO WR: Todo recibo de bodega TIB tiene EXACTAMENTE 11 caracteres: "WR" + TRES CEROS INICIALES ("000") + 6 DÍGITOS CORRELATIVOS (ejemplo: "WR000481141"). Si la tinta del borde izquierdo está tenue o cortada y ves "WR00...", debes saber que siempre son 3 ceros: "WR000...".
- ALERTA TIPOGRÁFICA DE MATRIZ DE PUNTOS (0 vs 8, 1 vs 4, 1 vs 7): En esta tipografía física de agujas, mucho cuidado con no confundir:
  * "0" con "8" (ej: "WR000482002" termina en "2002", NO "2802"; "WR000481988" termina en "988", NO "908").
  * "1" con "4" (ej: "WR000480131" tiene "131", NO "431"; "WR000481904" termina en "904", NO "901").
  * "1" con "7" (ej: "WR000480177" tiene "177", NO "777"; "WR000481101" tiene "101", NO "701").
- ALINEACIÓN POR LÍNEA HORIZONTAL: Cada fila está estrictamente delimitada por las líneas horizontales negras continuas de la tabla. Sigue la cuadrícula fila por fila de arriba a abajo. Cada código AMX de la columna izquierda se corresponde ÚNICA Y EXCLUSIVAMENTE con el código WR que está dentro de sus MISMAS líneas divisorias horizontales.
- FILAS CON MÚLTIPLES PAQUETES: Si una fila tiene 2 o más códigos WR dentro de la misma celda (por ejemplo separados por '/' o '-', o en varios renglones dentro de la misma casilla), agrúpalos TODOS en el arreglo "wrs" de ESA misma guía. NUNCA desplaces códigos WR hacia arriba o hacia abajo.
- NUNCA DESPLACES FILAS: Si una celda WR estuviese en blanco, asigna "wrs": []. NUNCA le asignes a una fila el WR de otra fila.
- REVISA TODAS LAS FILAS DE ARRIBA A ABAJO: No omitas ninguna fila visible en la tabla.`;

        const schema = isFirstPage
          ? {
              type: 'object',
              properties: {
                encabezado: {
                  type: 'object',
                  properties: {
                    fecha_vuelo: { type: 'string' },
                    cliente: { type: 'string' },
                    modalidad: { type: 'string', enum: ['OFICINA', 'DOMICILIO', 'PROVINCIA'] },
                    guias_declaradas: { type: 'number' },
                    paquetes_declarados: { type: 'number' },
                  },
                  required: ['fecha_vuelo', 'cliente', 'modalidad', 'guias_declaradas', 'paquetes_declarados'],
                  additionalProperties: false,
                },
                filas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      guia: { type: 'string' },
                      wrs: { type: 'array', items: { type: 'string' } },
                      observacion: { type: 'string' },
                    },
                    required: ['guia', 'wrs', 'observacion'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['encabezado', 'filas'],
              additionalProperties: false,
            }
          : {
              type: 'object',
              properties: {
                filas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      guia: { type: 'string' },
                      wrs: { type: 'array', items: { type: 'string' } },
                      observacion: { type: 'string' },
                    },
                    required: ['guia', 'wrs', 'observacion'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['filas'],
              additionalProperties: false,
            };

        const pageResponse = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: pagePrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${pageItem.mime};base64,${pageBase64}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `page_${pageNum}_extraction`,
              strict: true,
              schema: schema as any,
            },
          },
        });

        const parsedContent = JSON.parse(pageResponse.choices[0]?.message?.content || '{}');
        if (isFirstPage && parsedContent.encabezado) {
          encabezadoExtraid = parsedContent.encabezado;
        }

        const pageRows = (parsedContent.filas || []).map((r: any) => {
          const rawWrs = Array.isArray(r.wrs) ? r.wrs : [];
          const normalizedWrs = rawWrs
            .map((w: unknown) => normalizeTibWr(w))
            .filter((w: string) => Boolean(w));

          return {
            guia: String(r.guia || '').trim().toUpperCase(),
            wrs: normalizedWrs,
            observacion: String(r.observacion || '').trim(),
            pagina: pageNum,
          };
        });
        todasLasFilas.push(...pageRows);
      }

      // Validación y Autocorrección Contextual contra Paquetes Registrados en Supabase
      try {
        const admin = getSupabaseAdmin();
        const { data: dbPackages } = await admin
          .from('paquetes')
          .select('id, numero_recibo_bodega, tracking')
          .not('numero_recibo_bodega', 'is', null)
          .order('creado_en', { ascending: false })
          .limit(1000);

        if (dbPackages && dbPackages.length > 0) {
          const knownWrSet = new Set(
            dbPackages
              .map((p) => p.numero_recibo_bodega?.toUpperCase().trim())
              .filter(Boolean) as string[]
          );

          for (const f of todasLasFilas) {
            f.wrs = f.wrs.map((wr: string) => {
              if (knownWrSet.has(wr)) return wr;

              // Buscar si existe un WR en BD con distancia 1 (típica confusión matriz de puntos)
              for (const known of knownWrSet) {
                if (known.length === wr.length && known.startsWith('WR000')) {
                  let diffCount = 0;
                  let diffIdx = -1;
                  for (let i = 0; i < wr.length; i++) {
                    if (wr[i] !== known[i]) {
                      diffCount++;
                      diffIdx = i;
                    }
                  }
                  if (diffCount === 1) {
                    const charWr = wr[diffIdx];
                    const charKnown = known[diffIdx];
                    const isCommonConfusion =
                      (charWr === '4' && charKnown === '1') ||
                      (charWr === '1' && charKnown === '4') ||
                      (charWr === '0' && charKnown === '8') ||
                      (charWr === '8' && charKnown === '0') ||
                      (charWr === '7' && charKnown === '1') ||
                      (charWr === '1' && charKnown === '7');

                    if (isCommonConfusion) {
                      console.log(`[OCR Auto-Correction]: Replaced ${wr} with ${known} (matched known DB package with 1-char difference)`);
                      return known;
                    }
                  }
                }
              }
              return wr;
            });
          }
        }
      } catch (dbErr) {
        console.warn('[OCR Reconcile Warning]: Error checking known packages in DB:', dbErr);
      }

      // Reconciliación Matemática de Cuadre
      const guiasDeclaradas = Number(encabezadoExtraid.guias_declaradas || 0);
      const paquetesDeclarados = Number(encabezadoExtraid.paquetes_declarados || 0);

      const totalGuiasExtraidas = todasLasFilas.length;
      let totalWrsExtraidos = 0;
      const guiasMultiPaquete: any[] = [];
      const guiasSinPaquete: any[] = [];

      for (const f of todasLasFilas) {
        const wrs = f.wrs || [];
        totalWrsExtraidos += wrs.length;
        if (wrs.length > 1) {
          guiasMultiPaquete.push({ guia: f.guia, cantidad: wrs.length, wrs });
        } else if (wrs.length === 0) {
          guiasSinPaquete.push({ guia: f.guia, observacion: f.observacion });
        }
      }

      const difGuias = totalGuiasExtraidas - guiasDeclaradas;
      const difPaquetes = totalWrsExtraidos - paquetesDeclarados;
      const cuadrePerfecto = guiasDeclaradas > 0 && difGuias === 0 && difPaquetes === 0;

      return NextResponse.json({
        success: true,
        archivo: file.name,
        archivo_url: archivoUrl,
        motor: 'openai_vision_multipage',
        total_paginas: pageImages.length,
        encabezado: encabezadoExtraid,
        cuadre: {
          cuadre_perfecto: cuadrePerfecto,
          status_code: cuadrePerfecto ? 'CUADRE_PERFECTO' : 'DESCUADRE',
          mensaje: cuadrePerfecto
            ? `✓ Cuadre Perfecto: 100% de coincidencia (${totalGuiasExtraidas} Guías / ${totalWrsExtraidos} Paquetes).`
            : `⚠️ Descuadre detectado: Guías (${totalGuiasExtraidas}/${guiasDeclaradas}) • Paquetes (${totalWrsExtraidos}/${paquetesDeclarados})`,
          totales: {
            guias_declaradas: guiasDeclaradas,
            guias_extraidas: totalGuiasExtraidas,
            diferencia_guias: difGuias,
            paquetes_declarados: paquetesDeclarados,
            paquetes_extraidos: totalWrsExtraidos,
            diferencia_paquetes: difPaquetes,
          },
          auditoria: {
            total_guias_con_multiples_paquetes: guiasMultiPaquete.length,
            guias_multi_paquete: guiasMultiPaquete,
            total_guias_sin_paquete: guiasSinPaquete.length,
            guias_sin_paquete: guiasSinPaquete,
          },
        },
        filas: todasLasFilas,
      });
    }

    return NextResponse.json(
      { error: 'No se pudo conectar al motor Python VPS y no hay clave OPENAI_API_KEY configurada para contingencia.' },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al procesar el manifiesto';
    console.error('[API Manifiestos TIB]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
