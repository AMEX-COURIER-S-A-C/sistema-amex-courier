import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No se encontró el token de seguridad de recuperación. Por favor, solicita un nuevo enlace.' },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Validar el token de recuperación directamente con Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      console.warn('⚠️ [Cambiar Password] Token inválido o expirado:', userError?.message);
      return NextResponse.json(
        { error: 'El enlace de recuperación ha caducado o es inválido. Por favor, solicita uno nuevo.' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 2. Actualizar la contraseña del usuario en Supabase con privilegios administrativos
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error('❌ [Cambiar Password] Error al actualizar clave de usuario:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'No se pudo actualizar la contraseña en este momento.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.',
    });
  } catch (err: any) {
    console.error('❌ [Cambiar Password] Excepción:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar el cambio de contraseña.' },
      { status: 500 }
    );
  }
}
