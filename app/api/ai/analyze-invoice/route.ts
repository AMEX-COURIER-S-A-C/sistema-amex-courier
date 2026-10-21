import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/withApi';
import { analyzeInvoiceDocument, DEFAULT_OPENAI_MODEL } from '@/lib/openai/analyzer';
import { recordAiUsage } from '@/lib/ai/cost-tracker';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const POST = withApi(
  {
    auth: true,
    rateLimit: {
      limit: 60,
      windowMs: 60_000,
      prefix: 'ai-analyze-invoice',
    },
  },
  async ({ req, user }) => {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Debes enviar una imagen o PDF de factura.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 10 MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const result = await analyzeInvoiceDocument(base64, file.type);

    recordAiUsage({
      feature: 'invoice-analysis',
      model: DEFAULT_OPENAI_MODEL,
      promptTokens: 1200,
      completionTokens: 300,
      usuarioId: user?.id,
      usuarioEmail: user?.email,
    }).catch((e) => console.warn('[AI Usage Logging Warning]:', e));

    return NextResponse.json(result);
  }
);
