import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/auth/guards';

const TIB_API_URL = 'https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php';
const TIB_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

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

    // 2. Si no se fuerza refresco, verificar si ya cuenta con todos los campos solicitados
    if (!forceRefresh && currentPkg) {
      const needsImage = syncImages && !currentPkg.tib_imagen_url;
      const needsTracking = syncTracking && (!currentPkg.tracking || currentPkg.tracking === '-' || currentPkg.tracking.trim() === '');
      const needsPeso = syncPeso && (!currentPkg.peso_kg || Number(currentPkg.peso_kg) <= 0);
      const needsCliente = syncCliente && (!currentPkg.nombre_consignatario || currentPkg.nombre_consignatario.trim() === '' || currentPkg.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX'));
      const needsEmpaque = syncEmpaque && (!currentPkg.tipo_empaque || currentPkg.tipo_empaque.trim() === '');
      const needsEstadoTib = syncEstadoTib && (!currentPkg.estado_tib || currentPkg.estado_tib.trim() === '');

      const needsSync = needsImage || needsTracking || needsPeso || needsCliente || needsEmpaque || needsEstadoTib;

      if (!needsSync) {
        return NextResponse.json({
          ok: true,
          cached: true,
          updatedFields: [],
          tibImagenUrl: currentPkg.tib_imagen_url,
          tibTicketPdfUrl: currentPkg.tib_ticket_pdf_url,
          updatedData: currentPkg,
          wr: currentPkg.numero_recibo_bodega,
        });
      }
    }

    // 3. Extraer dígitos significativos del WR (WR000475750 -> 475750)
    const cleanNumericWr = rawWr.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanNumericWr) {
      return NextResponse.json({ error: 'Formato de WR inválido.' }, { status: 400 });
    }

    // 4. Consultar la API backend de TIBCARGO
    const tibResponse = await fetch(TIB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({ warehouse: cleanNumericWr }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tibResponse.ok) {
      return NextResponse.json(
        { error: `Error del servidor TIB (HTTP ${tibResponse.status})` },
        { status: 502 }
      );
    }

    const tibData = await tibResponse.json();

    if (!Array.isArray(tibData) || tibData.length === 0) {
      return NextResponse.json({
        ok: true,
        found: false,
        message: `No se encontró información en TIB para el WR ${rawWr}.`,
      });
    }

    const pkg = tibData[0];
    const tibImagenUrl = pkg.img ? `${TIB_BASE_URL}${pkg.img}` : null;
    const tibTicketPdfUrl = pkg.ticket ? `${TIB_BASE_URL}${pkg.ticket}` : null;

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
      if (tibTicketPdfUrl && (forceRefresh || !currentPkg?.tib_ticket_pdf_url)) {
        updatePayload.tib_ticket_pdf_url = tibTicketPdfUrl;
        updatedFields.push('ticket');
      }
    }

    // Tracking
    if (syncTracking && pkg.tracking && typeof pkg.tracking === 'string' && pkg.tracking.trim() !== '') {
      const cleanTracking = pkg.tracking.trim();
      const currentTrackingEmpty = !currentPkg?.tracking || currentPkg.tracking === '-' || currentPkg.tracking.trim() === '';
      if (forceRefresh || currentTrackingEmpty) {
        updatePayload.tracking = cleanTracking;
        updatedFields.push('tracking');
      }
    }

    // Cliente / Consignatario
    if (syncCliente && pkg.nclient && typeof pkg.nclient === 'string' && pkg.nclient.trim() !== '') {
      const cleanCliente = pkg.nclient.trim();
      const currentClienteEmpty =
        !currentPkg?.nombre_consignatario ||
        currentPkg.nombre_consignatario.trim() === '' ||
        currentPkg.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX');
      if (forceRefresh || currentClienteEmpty) {
        updatePayload.nombre_consignatario = cleanCliente;
        updatedFields.push('cliente');
      }
    }

    // Peso Kg
    if (syncPeso && pkg.weight) {
      const parsedWeight = parseFloat(String(pkg.weight).replace(/,/g, '.'));
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        const currentPesoEmpty = !currentPkg?.peso_kg || Number(currentPkg.peso_kg) <= 0;
        if (forceRefresh || currentPesoEmpty) {
          updatePayload.peso_kg = parsedWeight;
          updatedFields.push('peso');
        }
      }
    }

    // Tipo de Empaque
    if (syncEmpaque && pkg.container && typeof pkg.container === 'string' && pkg.container.trim() !== '') {
      const cleanEmpaque = pkg.container.trim().toUpperCase();
      const currentEmpaqueEmpty = !currentPkg?.tipo_empaque || currentPkg.tipo_empaque.trim() === '';
      if (forceRefresh || currentEmpaqueEmpty) {
        updatePayload.tipo_empaque = cleanEmpaque;
        updatedFields.push('empaque');
      }
    }

    // Estado TIB
    if (syncEstadoTib && pkg.status && typeof pkg.status === 'string' && pkg.status.trim() !== '') {
      const rawStatus = pkg.status.trim();
      let mappedStatus = rawStatus;
      const upper = rawStatus.toUpperCase();
      if (upper.includes('RECIBIDO')) mappedStatus = 'Recibido';
      else if (upper.includes('ENTREGADO')) mappedStatus = 'Entregado';
      else if (upper.includes('ENVIADO')) mappedStatus = 'Enviado';
      else if (upper.includes('ALMACEN')) mappedStatus = 'EnAlmacen';

      const currentEstadoEmpty = !currentPkg?.estado_tib || currentPkg.estado_tib.trim() === '';
      if (forceRefresh || currentEstadoEmpty) {
        updatePayload.estado_tib = mappedStatus;
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
      updatedFields,
      tibImagenUrl,
      tibTicketPdfUrl,
      updatedData: {
        ...(currentPkg || {}),
        ...updatePayload,
      },
      tibData: {
        wr: pkg.wr,
        seqwr: pkg.seqwr,
        tracking: pkg.tracking,
        cliente: pkg.nclient,
        pesoKg: pkg.weight,
        estado: pkg.status,
        fecha: pkg.fecRegister,
        rack: pkg.rack,
        empaque: pkg.container,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al consultar TIB';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
