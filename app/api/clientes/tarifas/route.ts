import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { authorizeUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const TARIFAS_R2_KEY = 'config/tarifas-clientes.json';

function getR2Client(): S3Client {
  const accountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || '')
    .replace(/^https?:\/\//i, '')
    .replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
    .trim();
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim(),
    },
  });
}

const BUCKET_NAME = (process.env.CLOUDFLARE_R2_BUCKET_NAME || 'amex-courier-cloud').trim();

// Cache en memoria para lecturas ultrarrápidas
let cachedTarifas: Record<string, number> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 segundos

async function loadTarifasFromCloud(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedTarifas && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedTarifas;
  }

  try {
    const client = getR2Client();
    const res = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: TARIFAS_R2_KEY,
      })
    );
    const bodyStr = await res.Body?.transformToString();
    if (bodyStr) {
      cachedTarifas = JSON.parse(bodyStr);
      lastCacheTime = now;
      return cachedTarifas || {};
    }
  } catch (err: unknown) {
    // Si no existe el archivo aún, retorna vacío
    const code = (err as { name?: string; Code?: string })?.name;
    if (code !== 'NoSuchKey' && code !== 'NotFound') {
      console.warn('[Tarifas API] Error cargando tarifas de R2:', err);
    }
  }

  cachedTarifas = {};
  lastCacheTime = now;
  return cachedTarifas;
}

async function saveTarifasToCloud(tarifas: Record<string, number>): Promise<void> {
  const client = getR2Client();
  cachedTarifas = tarifas;
  lastCacheTime = Date.now();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: TARIFAS_R2_KEY,
      Body: JSON.stringify(tarifas, null, 2),
      ContentType: 'application/json',
    })
  );
}

/**
 * GET /api/clientes/tarifas — Carga todas las tarifas personalizadas guardadas en la nube
 */
export async function GET() {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tarifas = await loadTarifasFromCloud();
    return NextResponse.json({ tarifas });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/clientes/tarifas — Guarda o actualiza la tarifa por kilo de un cliente
 * Body: { clienteNombre: string, tarifa: number } (o { tarifasBatch: Record<string, number> })
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const current = await loadTarifasFromCloud();

    if (body.tarifasBatch && typeof body.tarifasBatch === 'object') {
      for (const [rawName, val] of Object.entries(body.tarifasBatch)) {
        const norm = String(rawName).trim().toUpperCase();
        const num = parseFloat(String(val));
        if (norm && !isNaN(num) && num > 0) {
          current[norm] = Math.round(num * 100) / 100;
        } else if (norm && num <= 0) {
          delete current[norm];
        }
      }
    } else {
      const clienteNombre = String(body.clienteNombre || '').trim().toUpperCase();
      const tarifa = parseFloat(String(body.tarifa));

      if (!clienteNombre) {
        return NextResponse.json({ error: 'Falta el nombre del cliente.' }, { status: 400 });
      }

      if (isNaN(tarifa) || tarifa <= 0) {
        // Si la tarifa es 0 o inválida, se elimina para volver a "Sin tarifa"
        delete current[clienteNombre];
      } else {
        current[clienteNombre] = Math.round(tarifa * 100) / 100;
      }
    }

    await saveTarifasToCloud(current);
    return NextResponse.json({ success: true, tarifas: current });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
