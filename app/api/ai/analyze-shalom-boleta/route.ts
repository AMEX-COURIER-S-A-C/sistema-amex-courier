import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi } from '@/lib/api/withApi';
import { analyzeShalomBoletaPdf, SHALOM_AI_MODEL } from '@/lib/openai/analyzer';
import { recordAiUsage } from '@/lib/ai/cost-tracker';

const AnalyzeShalomSchema = z.object({
  pdfBase64: z
    .string()
    .min(1, 'Se requiere el archivo PDF o imagen en formato base64.')
    .max(15_000_000, 'El archivo supera el límite de 10 MB.'),
});

export const POST = withApi(
  {
    auth: true,
    rateLimit: {
      limit: 60,
      windowMs: 60_000,
      prefix: 'ai-shalom-boleta',
    },
    bodySchema: AnalyzeShalomSchema,
  },
  async ({ body, user }) => {
    const { pdfBase64 } = body;
    const extracted = await analyzeShalomBoletaPdf(pdfBase64);

    // Registro de consumo de IA
    recordAiUsage({
      feature: 'shalom-boleta',
      model: SHALOM_AI_MODEL,
      promptTokens: 800, // Estimado de visión para boleta
      completionTokens: 250,
      usuarioId: user?.id,
      usuarioEmail: user?.email,
    }).catch((e) => console.warn('[AI Usage Logging Warning]:', e));

    return NextResponse.json({
      success: true,
      data: extracted,
      model: SHALOM_AI_MODEL,
    });
  }
);
