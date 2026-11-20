import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/auth/guards';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  extractNumericWrId,
  isAuthorizedLegacyTicketUrl,
  parseTibV2TicketId,
} from '@/lib/tib/cargoSystemHelpers';
import { createCargoSystemClient, isTibV2Configured } from '@/lib/tib/cargoSystemClient';
import { normalizeTibWr } from '@/lib/tib/apiClient';

export const dynamic = 'force-dynamic';

function buildPdfResponse(body: ArrayBuffer | ReadableStream<Uint8Array>, wr: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="Ticket-${wr}.pdf"`,
      'X-Robots-Tag': 'noindex',
    },
  });
}

/**
 * Proxy autenticado de Tickets PDF de almacén TIB para operadores del ERP:
 * - Oculta totalmente el dominio interno y el Bearer JWT de TIB v2 al navegador.
 * - Soporta tanto Tickets de TIB v2 (api.tibgrupo.com) como históricos de TIB v1 (tibcourier.com).
 *
 * GET /api/paquetes/tib-ticket/[wr]
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ wr: string }> }) {
  const auth = await authorizeUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { wr: rawParam } = await ctx.params;
  const decoded = decodeURIComponent(rawParam || '').trim();
  const canonicalWr = normalizeTibWr(decoded);
  const numericIdFromWr = extractNumericWrId(canonicalWr || decoded);

  if (!canonicalWr || numericIdFromWr === null) {
    return NextResponse.json({ error: 'Código WR inválido.' }, { status: 400 });
  }

  let storedTicketUrl: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from('paquetes')
      .select('tib_ticket_pdf_url')
      .ilike('numero_recibo_bodega', canonicalWr)
      .limit(1)
      .maybeSingle();
    storedTicketUrl = data?.tib_ticket_pdf_url || null;
  } catch {
    // Continuar con descarga directa por ID numérico si la consulta BD falla
  }

  const v2IdFromRef = parseTibV2TicketId(storedTicketUrl);

  // 1. Prioridad TIB v2: referencia explícita tibv2://receipt/{id} o consulta directa por ID numérico
  if (isTibV2Configured()) {
    const targetV2Id = v2IdFromRef ?? numericIdFromWr;
    try {
      const client = createCargoSystemClient({ timeoutMs: 20000, maxRetries: 2 });
      const pdf = await client.fetchWarehousePdf(targetV2Id);
      if (pdf) {
        return buildPdfResponse(pdf.buffer, canonicalWr);
      }
    } catch (err) {
      console.warn(
        `[API TIB Ticket Proxy v2] Aviso descargando PDF para ${canonicalWr}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // 2. Respaldo histórico TIB v1 (estrictamente validado contra SSRF)
  if (isAuthorizedLegacyTicketUrl(storedTicketUrl)) {
    try {
      const upstream = await fetch(storedTicketUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
      if (
        upstream.ok &&
        upstream.body &&
        (contentType.includes('application/pdf') || contentType.includes('octet-stream'))
      ) {
        return buildPdfResponse(upstream.body, canonicalWr);
      }
    } catch (err) {
      console.warn(
        `[API TIB Ticket Proxy v1] Error descargando PDF histórico para ${canonicalWr}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({ error: `Ticket PDF no disponible para ${canonicalWr}.` }, { status: 404 });
}
