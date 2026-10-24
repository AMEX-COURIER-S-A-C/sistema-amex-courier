import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi } from '@/lib/api/withApi';
import { parseRotuloWithAi, ROTULO_AI_MODEL } from '@/lib/openai/analyzer';
import { recordAiUsage } from '@/lib/ai/cost-tracker';

const ParseRotuloSchema = z
  .object({
    text: z.string().max(20_000, 'El texto supera el límite permitido.').optional(),
    imageBase64: z.string().max(15_000_000, 'La imagen supera el límite permitido.').optional(),
  })
  .refine((data) => data.text || data.imageBase64, {
    message: 'Debes proporcionar un texto del pedido o una captura de pantalla en formato base64.',
  });

export const POST = withApi(
  {
    auth: true,
    rateLimit: {
      limit: 60,
      windowMs: 60_000,
      prefix: 'ai-parse-rotulo',
    },
    bodySchema: ParseRotuloSchema,
  },
  async ({ body, user }) => {
    const data = await parseRotuloWithAi({
      text: body.text,
      imageBase64: body.imageBase64,
    });

    recordAiUsage({
      feature: 'rotulo-parsing',
      model: ROTULO_AI_MODEL,
      promptTokens: 400,
      completionTokens: 200,
      usuarioId: user?.id,
      usuarioEmail: user?.email,
    }).catch((e) => console.warn('[AI Usage Logging Warning]:', e));

    return NextResponse.json({
      success: true,
      data,
    });
  }
);
