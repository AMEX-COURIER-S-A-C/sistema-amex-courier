import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi } from '@/lib/api/withApi';
import { extractDniNameFromImage } from '@/lib/openai/analyzer';
import { recordAiUsage } from '@/lib/ai/cost-tracker';

const ExtractDniSchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'Se requiere la imagen del anverso en formato base64.')
    .max(15_000_000, 'La imagen supera el límite permitido.'),
});

export const POST = withApi(
  {
    auth: true,
    rateLimit: {
      limit: 120, // 120 peticiones por minuto por IP/usuario
      windowMs: 60_000,
      prefix: 'ai-dni-extraction',
    },
    bodySchema: ExtractDniSchema,
  },
  async ({ body, user }) => {
    const { imageBase64 } = body;
    const result = await extractDniNameFromImage(imageBase64);

    // Registrar telemetría de costos en segundo plano
    if (result.usage) {
      recordAiUsage({
        feature: 'dni-extraction',
        model: result.usage.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
        usuarioId: user?.id,
        usuarioEmail: user?.email,
      }).catch((e) => console.warn('[AI Usage Logging Warning]:', e));
    }

    if (!result.nombre_completo && !result.dni) {
      console.warn('[API DNI Extraction Warning]: No se detectaron nombres ni DNI en la imagen.');
      return NextResponse.json(
        {
          success: false,
          error: 'La IA no pudo detectar nombres ni número de DNI legibles en la imagen proporcionada.',
        },
        { status: 422 }
      );
    }

    console.log('[API DNI Extraction Success]:', {
      nombre: result.nombre_completo,
      dni: result.dni,
    });

    return NextResponse.json({
      success: true,
      nombre_completo: result.nombre_completo || '',
      dni: result.dni || '',
      nombres: result.nombres || '',
      apellidos: result.apellidos || '',
    });
  }
);
