import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * GET /api/usuarios
 * Retorna la lista de usuarios activos registrados en el sistema con sus roles.
 * Usado para selección de choferes, asignaciones y filtros del sistema.
 */
export async function GET() {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = getSupabaseAdmin();

    const [perfilesRes, rolesRes] = await Promise.all([
      supabase
        .from('perfiles_usuarios')
        .select('id, nombre_completo, email, rol_id, activo')
        .order('nombre_completo', { ascending: true }),
      supabase
        .from('roles_sistema')
        .select('id, nombre')
    ]);

    if (perfilesRes.error) {
      console.error('Error al consultar perfiles_usuarios:', perfilesRes.error);
      return NextResponse.json({ error: perfilesRes.error.message }, { status: 500 });
    }

    const rolesMap = new Map((rolesRes.data || []).map(r => [r.id, r.nombre]));

    const usuarios = (perfilesRes.data || [])
      .filter(p => p.activo !== false)
      .map(p => {
        const nombre = (p.nombre_completo || '').trim() || p.email?.split('@')[0] || 'Usuario';
        return {
          id: p.id,
          nombre_completo: nombre,
          email: p.email || '',
          rol_nombre: rolesMap.get(p.rol_id) || 'Usuario'
        };
      })
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

    return NextResponse.json({ usuarios });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al listar usuarios';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
