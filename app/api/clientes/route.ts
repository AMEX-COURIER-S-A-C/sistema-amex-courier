import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('clientes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clientes: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      nombre,
      apellido,
      documento_identidad,
      telefono,
      email,
      departamento,
      provincia,
      distrito,
      direccion_entrega,
    } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const nombreNormalizado = String(nombre).trim().toUpperCase();

    // Verificar si el cliente ya existe por nombre
    const { data: existing } = await admin
      .from('clientes')
      .select('id, nombre')
      .ilike('nombre', nombreNormalizado)
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      result = await admin
        .from('clientes')
        .update({
          apellido: apellido ?? undefined,
          documento_identidad: documento_identidad ?? undefined,
          telefono: telefono ?? undefined,
          email: email ?? undefined,
          departamento: departamento ?? undefined,
          provincia: provincia ?? undefined,
          distrito: distrito ?? undefined,
          direccion_entrega: direccion_entrega ?? undefined,
        })
        .eq('id', existing[0].id)
        .select()
        .single();
    } else {
      result = await admin
        .from('clientes')
        .insert({
          nombre: nombreNormalizado,
          apellido: apellido || null,
          documento_identidad: documento_identidad || '',
          telefono: telefono || null,
          email: email || null,
          departamento: departamento || 'LIMA',
          provincia: provincia || 'LIMA',
          distrito: distrito || '',
          direccion_entrega: direccion_entrega || null,
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cliente: result.data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
