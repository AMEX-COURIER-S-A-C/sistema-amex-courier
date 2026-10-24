import { NextResponse } from 'next/server';
import { getPortalAdmin } from '@/lib/supabase/portal-admin';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { syncPackagesToClientPortal } from '@/lib/portal/syncPackageToPortal';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      nombre_completo,
      email,
      password,
      telefono,
      documento_identidad,
      casillero_codigo,
      alias_palabras_clave,
    } = body;

    if (!nombre_completo || !nombre_completo.trim()) {
      return NextResponse.json({ error: 'El nombre completo o empresa es requerido.' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = nombre_completo.trim().toUpperCase();

    // Palabras clave para matching (incluye el nombre completo por defecto)
    const keywords: string[] = [cleanNombre];
    if (Array.isArray(alias_palabras_clave)) {
      alias_palabras_clave.forEach((k: string) => {
        const trimmed = String(k).trim().toUpperCase();
        if (trimmed && !keywords.includes(trimmed)) {
          keywords.push(trimmed);
        }
      });
    }

    const portalAdmin = getPortalAdmin();

    // 1. Crear usuario en Supabase Auth del Portal de Clientes (Oregon us-west-2)
    const { data: authData, error: authErr } = await portalAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: cleanNombre,
        telefono: telefono?.trim() || null,
        documento_identidad: documento_identidad?.trim() || null,
        rol: 'cliente',
      },
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este correo electrónico ya está registrado en el portal.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Error de autenticación: ${authErr.message}` }, { status: 500 });
    }

    const newUserId = authData.user.id;

    // 2. Registrar en la tabla public.clientes_portal
    const { error: profileErr } = await portalAdmin.from('clientes_portal').upsert({
      id: newUserId,
      nombre_completo: cleanNombre,
      email: cleanEmail,
      telefono: telefono?.trim() || null,
      documento_identidad: documento_identidad?.trim() || null,
      casillero_codigo: casillero_codigo?.trim() || null,
      alias_palabras_clave: keywords,
      activo: true,
      actualizado_en: new Date().toISOString(),
    });

    if (profileErr) {
      console.error('[CrearCliente] Error al crear perfil clientes_portal:', profileErr);
    }

    // 3. Auto-cruce de paquetes existentes en el ERP principal
    let syncedCount = 0;
    try {
      const erpAdmin = getSupabaseAdmin();

      // Buscar paquetes en el ERP cuyo consignatario coincida con el cliente
      const { data: erpPaquetes } = await erpAdmin
        .from('paquetes')
        .select(`
          id,
          numero_recibo_bodega,
          tracking,
          nombre_consignatario,
          tipo_empaque,
          peso_kg,
          estado_tib,
          estado_amex,
          tib_imagen_url,
          tib_ticket_pdf_url,
          ubicacion_almacen,
          creado_en
        `)
        .ilike('nombre_consignatario', `%${cleanNombre}%`)
        .order('creado_en', { ascending: false });

      if (erpPaquetes && erpPaquetes.length > 0) {
        // Enlazar los paquetes en el ERP con el correo del cliente
        await erpAdmin
          .from('paquetes')
          .update({ usuario_email: cleanEmail })
          .ilike('nombre_consignatario', `%${cleanNombre}%`);

        // Sincronizarlos al portal de clientes
        const syncRes = await syncPackagesToClientPortal(
          erpPaquetes.map(p => ({
            ...p,
            usuario_email: cleanEmail,
          }))
        );
        syncedCount = syncRes.count || 0;
      }
    } catch (crossErr) {
      console.warn('[CrearCliente] Aviso en cruce inicial de paquetes:', crossErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email: cleanEmail,
        nombre_completo: cleanNombre,
        telefono: telefono || null,
      },
      paquetes_vinculados: syncedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al crear usuario cliente';
    console.error('[API crear-usuario cliente] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
