import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/auth/guards';
import { sendUserWelcomeEmail } from '@/lib/email/welcomeUser';

async function requireAdmin() {
  const auth = await authorizeAdmin();
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

// GET: Listar usuarios, perfiles y roles del sistema
export async function GET() {
  try {
    const authorization = await requireAdmin();
    if (authorization) return authorization;

    const supabase = getSupabaseAdmin();

    const [usersRes, rolesRes, perfilesRes] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from('roles_sistema').select('*').order('nombre'),
      supabase.from('perfiles_usuarios').select('*').order('creado_en', { ascending: false })
    ]);

    if (usersRes.error) throw usersRes.error;
    if (rolesRes.error) throw rolesRes.error;

    const authUsers = usersRes.data.users || [];
    const roles = rolesRes.data || [];
    const perfiles = perfilesRes.data || [];

    // Cruzar información de usuario con perfil y rol
    const usersWithRoles = authUsers.map(u => {
      const perfil = perfiles.find(p => p.id === u.id || p.email === u.email);
      const rol = roles.find(r => r.id === perfil?.rol_id);
      const perfilHasCustom = Boolean(
        perfil?.permisos &&
        typeof perfil.permisos === 'object' &&
        Object.keys(perfil.permisos).length > 0
      );

      return {
        id: u.id,
        email: u.email,
        nombre_completo:
          perfil?.nombre_completo ||
          (u.user_metadata?.nombre_completo as string) ||
          u.email?.split('@')[0] ||
          'Usuario',
        rol_id: perfil?.rol_id || rol?.id || null,
        rol_nombre: rol?.nombre || (u.user_metadata?.rol as string) || 'Sin Rol',
        permisos: perfilHasCustom ? perfil.permisos : (rol?.permisos || {}),
        permisos_personalizados: perfilHasCustom,
        activo: perfil?.activo !== false,
        creado_en: u.created_at,
        ultimo_ingreso: u.last_sign_in_at
      };
    });

    return NextResponse.json({
      users: usersWithRoles,
      roles
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al listar usuarios';
    console.error('API /api/admin/users GET Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Crear nuevo usuario con rol o crear nuevo rol
export async function POST(request: Request) {
  try {
    const authorization = await requireAdmin();
    if (authorization) return authorization;

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { action } = body;

    // Acción 1: Crear nuevo rol con matriz de permisos
    if (action === 'create_role') {
      const { nombre, descripcion, permisos } = body;
      if (!nombre || !nombre.trim()) {
        return NextResponse.json({ error: 'El nombre del rol es obligatorio' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('roles_sistema')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          permisos: permisos || {}
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ role: data });
    }

    // Acción 2: Actualizar permisos de un rol existente
    if (action === 'update_role') {
      const { id, permisos, descripcion } = body;
      const { data, error } = await supabase
        .from('roles_sistema')
        .update({
          permisos,
          ...(descripcion !== undefined && { descripcion })
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Revocar sesiones de los usuarios asignados a este rol para que sus permisos se actualicen al reingresar
      const nowIso = new Date().toISOString();
      await supabase
        .from('perfiles_usuarios')
        .update({
          session_revoked_at: nowIso,
          actualizado_en: nowIso,
        })
        .eq('rol_id', id);

      return NextResponse.json({ role: data, session_revoked: true });
    }

    // Acción 3: Crear nuevo usuario
    if (action === 'create_user') {
      const { email, password, nombre_completo, rol_id } = body;

      if (!email || !password || !nombre_completo) {
        return NextResponse.json({ error: 'Correo, contraseña y nombre son requeridos' }, { status: 400 });
      }

      // Obtener nombre del rol
      let rolNombre = 'Operador Logístico';
      if (rol_id) {
        const { data: rData } = await supabase.from('roles_sistema').select('nombre').eq('id', rol_id).single();
        if (rData?.nombre) rolNombre = rData.nombre;
      }

      const { data: uData, error: uError } = await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          nombre_completo: nombre_completo.trim(),
          rol: rolNombre
        },
        app_metadata: { rol: rolNombre }
      });

      if (uError) throw uError;
      const newUser = uData.user;

      // Crear o actualizar en perfiles_usuarios
      await supabase.from('perfiles_usuarios').upsert({
        id: newUser.id,
        nombre_completo: nombre_completo.trim(),
        email: email.trim().toLowerCase(),
        rol_id: rol_id || null,
        permisos: body.permisos || null,
        activo: true
      });

      // Enviar correo formal de bienvenida con enlace seguro para definir contraseña
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistemaamexcourier.online';
      let welcomeSent = false;
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email.trim().toLowerCase(),
          options: {
            redirectTo: `${appUrl}/login?recovered=true`,
          },
        });

        const activationLink = linkData?.properties?.action_link || `${appUrl}/login`;
        const emailRes = await sendUserWelcomeEmail({
          email: email.trim().toLowerCase(),
          nombreCompleto: nombre_completo.trim(),
          rolNombre,
          activationLink,
        });
        welcomeSent = Boolean(emailRes.success);
      } catch (emailErr) {
        console.warn('⚠️ No se pudo enviar el correo de bienvenida:', emailErr);
      }

      return NextResponse.json({ success: true, user: newUser, welcome_sent: welcomeSent });
    }

    // Acción 5: Reenviar Invitación / Bienvenida al colaborador
    if (action === 'resend_invite') {
      const { email, nombre_completo, rol_nombre } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return NextResponse.json({ error: 'El correo del colaborador es requerido' }, { status: 400 });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistemaamexcourier.online';
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/login?recovered=true`,
        },
      });

      if (linkError) throw linkError;
      const activationLink = linkData?.properties?.action_link || `${appUrl}/login`;

      const emailRes = await sendUserWelcomeEmail({
        email: cleanEmail,
        nombreCompleto: nombre_completo || cleanEmail.split('@')[0],
        rolNombre: rol_nombre || 'Colaborador AMEX',
        activationLink,
      });

      if (!emailRes.success) {
        return NextResponse.json({ error: emailRes.error || 'Error al enviar correo de bienvenida' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Correo de bienvenida y activación reenviado exitosamente a ${cleanEmail}`,
      });
    }

    // Acción 4: Actualizar rol, nombre, permisos o estado de usuario
    if (action === 'update_user') {
      const { user_id, rol_id, activo, password, nombre_completo, permisos } = body;

      let rolNombre: string | undefined = undefined;
      if (rol_id) {
        const { data: rData } = await supabase.from('roles_sistema').select('nombre').eq('id', rol_id).single();
        if (rData?.nombre) rolNombre = rData.nombre;
      }

      const nowIso = new Date().toISOString();

      // Actualizar metadata de Auth con marca de revocación de sesión
      const updateData: {
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
        password?: string;
      } = {
        user_metadata: {
          ...(rolNombre ? { rol: rolNombre } : {}),
          ...(nombre_completo && typeof nombre_completo === 'string' ? { nombre_completo: nombre_completo.trim() } : {}),
          session_revoked_at: nowIso,
        },
        app_metadata: {
          ...(rolNombre ? { rol: rolNombre } : {}),
          session_revoked_at: nowIso,
        }
      };
      if (password && password.trim()) {
        updateData.password = password.trim();
      }

      await supabase.auth.admin.updateUserById(user_id, updateData);

      // Actualizar perfiles_usuarios registrando session_revoked_at para forzar reinicio de sesión inmediato
      await supabase
        .from('perfiles_usuarios')
        .update({
          ...(nombre_completo && typeof nombre_completo === 'string' && { nombre_completo: nombre_completo.trim() }),
          ...(rol_id !== undefined && { rol_id }),
          ...(activo !== undefined && { activo }),
          ...(permisos !== undefined && { permisos }),
          session_revoked_at: nowIso,
          actualizado_en: nowIso,
        })
        .eq('id', user_id);

      return NextResponse.json({ success: true, session_revoked: true, revoked_at: nowIso });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error procesando solicitud de usuarios';
    console.error('API /api/admin/users POST Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
