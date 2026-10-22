import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/auth/guards';
import { enrichPackagesHybrid } from '@/lib/tib/hybridEnricher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos límite para lotes masivos

/**
 * POST /api/paquetes/tib-enrich-hybrid
 * Endpoint de enriquecimiento híbrido de alta velocidad:
 * 1. Resuelve hasta el 95% de los paquetes en milisegundos mediante la API Oficial de TIB (.env) y su caché.
 * 2. Ejecuta fallback concurrente para los paquetes rezagados.
 * 3. Actualiza Supabase en bloques masivos.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { packageIds, wrs, forceRefresh, syncOptions } = body;

    const result = await enrichPackagesHybrid({
      packageIds: Array.isArray(packageIds) ? packageIds : undefined,
      wrs: Array.isArray(wrs) ? wrs : undefined,
      forceRefresh: Boolean(forceRefresh),
      syncOptions: typeof syncOptions === 'object' && syncOptions !== null ? syncOptions : undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al enriquecer paquetes con TIB';
    console.error('[API tib-enrich-hybrid]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
