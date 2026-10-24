import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { syncPackagesToClientPortal } from '@/lib/portal/syncPackageToPortal';

export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(() => ({ email: null }));

    // Seguridad: solo el superadmin puede sincronizar en lote
    if (email?.toLowerCase() !== 'sistemaamexcourier@gmail.com') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const erpAdmin = getSupabaseAdmin();

    // Obtener paquetes registrados del ERP principal
    const { data: paquetes, error } = await erpAdmin
      .from('paquetes')
      .select(`
        id,
        numero_recibo_bodega,
        tracking,
        nombre_consignatario,
        usuario_email,
        tipo_empaque,
        peso_kg,
        estado_tib,
        estado_amex,
        tib_imagen_url,
        tib_ticket_pdf_url,
        ubicacion_actual,
        creado_en
      `)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('[API sync-all] Error querying paquetes ERP:', error);
      throw new Error(error.message || 'Error al consultar paquetes en ERP');
    }

    const mapped = (paquetes || []).map((p) => ({
      ...p,
      ubicacion_almacen: p.ubicacion_actual || null,
    }));

    const syncRes = await syncPackagesToClientPortal(mapped);

    return NextResponse.json({
      success: true,
      total_erp: paquetes?.length || 0,
      sincronizados: syncRes.count || 0,
    });
  } catch (err: any) {
    const msg = err?.message || 'Error al sincronizar paquetes';
    console.error('[API sync-all] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
