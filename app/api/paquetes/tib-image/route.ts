import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/auth/guards';
import { fetchSinglePackageFallback } from '@/lib/tib/hybridEnricher';
import { resolveDisplayTicketUrl, splitPhotoUrls } from '@/lib/tib/cargoSystemHelpers';
import { normalizeTibWr } from '@/lib/tib/apiClient';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = req.nextUrl;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 300), 1), 1000);

    const admin = getSupabaseAdmin();

    // 1. Obtener todos los paquetes que tienen un número WR válido
    const { data: packages, error } = await admin
      .from('paquetes')
      .select('id, numero_recibo_bodega, tracking, nombre_consignatario, peso_kg, tipo_empaque, estado_tib, tib_imagen_url, tib_ticket_pdf_url, creado_en')
      .not('numero_recibo_bodega', 'is', null)
      .neq('numero_recibo_bodega', '')
      .order('creado_en', { ascending: false });

    if (error) {
      throw error;
    }

    const all = packages || [];
    let withImageCount = 0;
    let missingImage = 0;
    let missingTracking = 0;
    let missingPeso = 0;
    let missingCliente = 0;
    let missingEmpaque = 0;
    let missingEstadoTib = 0;

    const missingList: any[] = [];

    for (const p of all) {
      const isMissingImage = !p.tib_imagen_url;
      const isMissingTracking = !p.tracking || p.tracking === '-' || p.tracking.trim() === '';
      const isMissingPeso = !p.peso_kg || Number(p.peso_kg) <= 0;
      const isMissingCliente =
        !p.nombre_consignatario ||
        p.nombre_consignatario.trim() === '' ||
        p.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX');
      const isMissingEmpaque = !p.tipo_empaque || p.tipo_empaque.trim() === '';
      const isMissingEstadoTib = !p.estado_tib || p.estado_tib.trim() === '';

      if (!isMissingImage) withImageCount++;
      if (isMissingImage) missingImage++;
      if (isMissingTracking) missingTracking++;
      if (isMissingPeso) missingPeso++;
      if (isMissingCliente) missingCliente++;
      if (isMissingEmpaque) missingEmpaque++;
      if (isMissingEstadoTib) missingEstadoTib++;

      const hasAnyMissing =
        isMissingImage ||
        isMissingTracking ||
        isMissingPeso ||
        isMissingCliente ||
        isMissingEmpaque ||
        isMissingEstadoTib;

      if (hasAnyMissing) {
        const missingFields: string[] = [];
        if (isMissingImage) missingFields.push('foto');
        if (isMissingTracking) missingFields.push('tracking');
        if (isMissingPeso) missingFields.push('peso');
        if (isMissingCliente) missingFields.push('cliente');
        if (isMissingEmpaque) missingFields.push('empaque');
        if (isMissingEstadoTib) missingFields.push('estado_tib');

        missingList.push({
          id: p.id,
          numeroReciboBodega: p.numero_recibo_bodega,
          tracking: p.tracking || '',
          nombreConsignatario: p.nombre_consignatario || '',
          pesoKg: Number(p.peso_kg || 0),
          tipoEmpaque: p.tipo_empaque || '',
          estadoTib: p.estado_tib || '',
          tibImagenUrl: p.tib_imagen_url || null,
          tibTicketPdfUrl: p.tib_ticket_pdf_url || null,
          missingFields,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalPackages: all.length,
      withImage: withImageCount,
      totalMissing: missingList.length,
      stats: {
        missingImage,
        missingTracking,
        missingPeso,
        missingCliente,
        missingEmpaque,
        missingEstadoTib,
      },
      missing: missingList.slice(0, limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar estadísticas TIB';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const rawWr = String(body.wr || '').trim();
    const id = body.id ? String(body.id).trim() : null;
    const forceRefresh = Boolean(body.forceRefresh);
    const syncOptions = body.syncOptions || {};

    const syncImages = syncOptions.images ?? true;
    const syncTracking = syncOptions.tracking ?? true;
    const syncPeso = syncOptions.peso ?? true;
    const syncCliente = syncOptions.cliente ?? true;
    const syncEmpaque = syncOptions.empaque ?? true;
    const syncEstadoTib = syncOptions.estadoTib ?? true;

    if (!rawWr) {
      return NextResponse.json({ error: 'El parámetro "wr" es obligatorio.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Obtener registro actual en AMEX
    let query = admin
      .from('paquetes')
      .select('id, numero_recibo_bodega, tracking, nombre_consignatario, peso_kg, tipo_empaque, estado_tib, tib_imagen_url, tib_ticket_pdf_url');

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.ilike('numero_recibo_bodega', rawWr);
    }

    const { data: currentPkg } = await query.maybeSingle();

    // 2. Si no se fuerza refresco y ya cuenta con la imagen de TIB en BD, responder al instante
    if (!forceRefresh && currentPkg?.tib_imagen_url) {
      const wrDisplay = currentPkg.numero_recibo_bodega || normalizeTibWr(rawWr);
      return NextResponse.json({
        ok: true,
        found: true,
        cached: true,
        updatedFields: [],
        tibImagenUrl: currentPkg.tib_imagen_url,
        tibImagenes: splitPhotoUrls(currentPkg.tib_imagen_url),
        tibTicketPdfUrl: resolveDisplayTicketUrl(currentPkg.tib_ticket_pdf_url, wrDisplay),
        updatedData: currentPkg,
        wr: wrDisplay,
      });
    }

    // 3. Validar formato de WR
    const cleanNumericWr = rawWr.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanNumericWr) {
      return NextResponse.json({ error: 'Formato de WR inválido.' }, { status: 400 });
    }

    // 4. Consultar TIB v2 (Cargo System - api.tibgrupo.com) con respaldo automático a TIB v1 histórico
    const tibItem = await fetchSinglePackageFallback(rawWr, 12000);
    if (!tibItem) {
      return NextResponse.json({
        ok: true,
        found: false,
        message: `No se encontró información en TIB para el WR ${rawWr}.`,
      });
    }

    const tibImagenUrl = tibItem.fotoUrl || null;
    const tibTicketPdfUrlRaw = tibItem.ticketUrl || null;
    const canonicalWr = currentPkg?.numero_recibo_bodega || tibItem.wr || normalizeTibWr(rawWr);

    // 5. Construir campos a actualizar de forma inteligente
    const updatePayload: Record<string, any> = {
      actualizado_en: new Date().toISOString(),
    };
    const updatedFields: string[] = [];

    // Fotos y Tickets
    if (syncImages) {
      if (tibImagenUrl && (forceRefresh || !currentPkg?.tib_imagen_url)) {
        updatePayload.tib_imagen_url = tibImagenUrl;
        updatedFields.push('foto');
      }
      if (tibTicketPdfUrlRaw && (forceRefresh || !currentPkg?.tib_ticket_pdf_url)) {
        updatePayload.tib_ticket_pdf_url = tibTicketPdfUrlRaw;
        updatedFields.push('ticket');
      }
    }

    // Tracking
    if (syncTracking && tibItem.tracking) {
      const cleanTracking = tibItem.tracking.trim();
      const currentTrackingEmpty = !currentPkg?.tracking || currentPkg.tracking === '-' || currentPkg.tracking.trim() === '';
      if (cleanTracking && (forceRefresh || currentTrackingEmpty)) {
        updatePayload.tracking = cleanTracking;
        updatedFields.push('tracking');
      }
    }

    // Cliente / Consignatario
    if (syncCliente && tibItem.cliente) {
      const cleanCliente = tibItem.cliente.trim();
      const currentClienteEmpty =
        !currentPkg?.nombre_consignatario ||
        currentPkg.nombre_consignatario.trim() === '' ||
        currentPkg.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX');
      if (cleanCliente && (forceRefresh || currentClienteEmpty)) {
        updatePayload.nombre_consignatario = cleanCliente;
        updatedFields.push('cliente');
      }
    }

    // Peso Kg
    if (syncPeso && tibItem.peso !== null && tibItem.peso > 0) {
      const currentPesoEmpty = !currentPkg?.peso_kg || Number(currentPkg.peso_kg) <= 0;
      if (forceRefresh || currentPesoEmpty) {
        updatePayload.peso_kg = tibItem.peso;
        updatedFields.push('peso');
      }
    }

    // Tipo de Empaque
    if (syncEmpaque && tibItem.tipoEmpaque) {
      const cleanEmpaque = tibItem.tipoEmpaque.trim().toUpperCase();
      const currentEmpaqueEmpty = !currentPkg?.tipo_empaque || currentPkg.tipo_empaque.trim() === '';
      if (cleanEmpaque && (forceRefresh || currentEmpaqueEmpty)) {
        updatePayload.tipo_empaque = cleanEmpaque;
        updatedFields.push('empaque');
      }
    }

    // Estado TIB
    if (syncEstadoTib && tibItem.estadoBd) {
      const currentEstadoEmpty = !currentPkg?.estado_tib || currentPkg.estado_tib.trim() === '';
      if (forceRefresh || currentEstadoEmpty) {
        updatePayload.estado_tib = tibItem.estadoBd;
        updatedFields.push('estado_tib');
      }
    }

    // 6. Guardar en Supabase si hay campos para actualizar
    if (Object.keys(updatePayload).length > 1) {
      if (currentPkg?.id) {
        await admin.from('paquetes').update(updatePayload).eq('id', currentPkg.id);
      } else {
        await admin
          .from('paquetes')
          .update(updatePayload)
          .ilike('numero_recibo_bodega', rawWr);
      }
    }

    return NextResponse.json({
      ok: true,
      found: true,
      cached: false,
      source: tibItem.source || 'tib_v2',
      updatedFields,
      tibImagenUrl,
      tibImagenes: splitPhotoUrls(tibImagenUrl),
      tibTicketPdfUrl: resolveDisplayTicketUrl(tibTicketPdfUrlRaw, canonicalWr),
      updatedData: {
        ...(currentPkg || {}),
        ...updatePayload,
      },
      tibData: {
        wr: tibItem.wr,
        seqwr: tibItem.seqwr,
        tracking: tibItem.tracking,
        cliente: tibItem.cliente,
        pesoKg: tibItem.peso !== null ? String(tibItem.peso) : '',
        estado: tibItem.status,
        fecha: tibItem.fecRegister,
        rack: tibItem.rack,
        empaque: tibItem.tipoEmpaque,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al consultar TIB';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
