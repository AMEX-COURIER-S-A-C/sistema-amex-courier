import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToR2, getR2ViewUrl } from '@/lib/r2/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/auth/guards';
import { getDateSegments, sanitizeFileName } from '@/lib/r2/datePartitionedUpload';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * POST /api/despacho/rutas/[id]/fotos
 * Sube una fotografía vinculada a la ruta completa (ej. carga del vehículo, hoja general, odómetro).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id: rutaId } = await params;
    if (!rutaId) {
      return NextResponse.json({ error: 'ID de ruta no proporcionado.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const nombreRuta = (formData.get('nombreRuta') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo de imagen.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten archivos de imagen (JPEG, PNG, WEBP, etc.).' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede exceder los 15 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { year, month, day } = getDateSegments();
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const cleanNombre = sanitizeFileName(nombreRuta || 'ruta');
    const fileName = `${timestamp}_${cleanNombre}.${ext}`;
    const subPath = `despacho-rutas/${year}/${month}/${day}/rutas/${rutaId}/${fileName}`;

    // Subida a Cloudflare R2 FOLDER AMEX
    const { key, url: rawUrl, publicUrl } = await uploadFileToR2(buffer, subPath, file.type);
    const finalPhotoUrl = getR2ViewUrl(key) || publicUrl || rawUrl;

    const admin = getSupabaseAdmin();

    // 1. Obtener fotos actuales de la ruta
    const { data: ruta, error: fetchErr } = await admin
      .from('despachos_rutas')
      .select('fotos')
      .eq('id', rutaId)
      .single();

    if (fetchErr) {
      console.error('Error buscando ruta:', fetchErr);
      return NextResponse.json({ error: 'Ruta no encontrada en la base de datos.' }, { status: 404 });
    }

    const currentFotos: string[] = Array.isArray(ruta?.fotos) ? ruta.fotos : [];
    const updatedFotos = [...currentFotos, finalPhotoUrl];

    // 2. Actualizar ruta con la nueva foto
    const { error: updateErr } = await admin
      .from('despachos_rutas')
      .update({ fotos: updatedFotos, actualizado_en: new Date().toISOString() })
      .eq('id', rutaId);

    if (updateErr) {
      console.error('Error actualizando fotos de ruta:', updateErr);
      return NextResponse.json({ error: 'Error al asociar la foto a la ruta.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: finalPhotoUrl,
      fotos: updatedFotos
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la subida de foto de ruta';
    console.error('[API Despacho Ruta Foto Upload Error]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/despacho/rutas/[id]/fotos
 * Elimina una foto asociada a una ruta.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id: rutaId } = await params;
    if (!rutaId) {
      return NextResponse.json({ error: 'ID de ruta no proporcionado.' }, { status: 400 });
    }

    const body = await req.json();
    const { fotoUrl } = body;
    if (!fotoUrl) {
      return NextResponse.json({ error: 'URL de la foto no proporcionada.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: ruta, error: fetchErr } = await admin
      .from('despachos_rutas')
      .select('fotos')
      .eq('id', rutaId)
      .single();

    if (fetchErr || !ruta) {
      return NextResponse.json({ error: 'Ruta no encontrada.' }, { status: 404 });
    }

    const currentFotos: string[] = Array.isArray(ruta.fotos) ? ruta.fotos : [];
    const updatedFotos = currentFotos.filter(f => f !== fotoUrl);

    const { error: updateErr } = await admin
      .from('despachos_rutas')
      .update({ fotos: updatedFotos, actualizado_en: new Date().toISOString() })
      .eq('id', rutaId);

    if (updateErr) {
      return NextResponse.json({ error: 'Error al actualizar fotos de la ruta.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fotos: updatedFotos
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar foto de ruta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
