import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import * as Sentry from '@sentry/nextjs';

export interface AiUsageRecord {
  feature: 'dni-extraction' | 'invoice-analysis' | 'shalom-boleta' | 'rotulo-parsing' | 'generic';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  usuarioId?: string;
  usuarioEmail?: string;
  metadata?: Record<string, unknown>;
}

// Costos por millón de tokens en USD (OpenAI Pricing oficial)
const MODEL_PRICING_PER_MILLION: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
  'gpt-4o': { prompt: 2.50, completion: 10.00 },
  'gpt-4o-2024-08-06': { prompt: 2.50, completion: 10.00 },
  'gpt-4o-mini-2024-07-18': { prompt: 0.15, completion: 0.60 },
  'o1': { prompt: 15.00, completion: 60.00 },
  'o1-mini': { prompt: 3.00, completion: 12.00 },
  'o3-mini': { prompt: 1.10, completion: 4.40 },
  'gpt-6-luna': { prompt: 2.00, completion: 8.00 },
  'gpt-6.1-sol': { prompt: 2.50, completion: 10.00 },
  'gpt-6_1-sol': { prompt: 2.50, completion: 10.00 },
};

export function estimateAiCost(model: string, promptTokens: number, completionTokens: number): number {
  const normModel = model.toLowerCase().trim();
  const pricing = MODEL_PRICING_PER_MILLION[normModel] || { prompt: 0.50, completion: 1.50 };
  
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  return Number((promptCost + completionCost).toFixed(6));
}

// Control en memoria para no enviar spam de emails el mismo día
let lastAlertDate = '';

/**
 * Registra el uso de IA en Supabase y dispara alertas si supera el umbral diario configurado
 */
export async function recordAiUsage(record: AiUsageRecord): Promise<void> {
  const totalTokens = record.totalTokens || (record.promptTokens + record.completionTokens);
  const costUsd = estimateAiCost(record.model, record.promptTokens, record.completionTokens);

  try {
    const admin = getSupabaseAdmin();
    await admin.from('ai_usage_logs').insert({
      feature: record.feature,
      model: record.model,
      prompt_tokens: record.promptTokens,
      completion_tokens: record.completionTokens,
      total_tokens: totalTokens,
      costo_estimado_usd: costUsd,
      usuario_id: record.usuarioId || null,
      usuario_email: record.usuarioEmail || null,
      metadata: record.metadata || {},
      creado_en: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[AiCostTracker] No se pudo guardar log en Supabase:', err);
  }

  // Verificar consumo diario acumulado en segundo plano
  checkDailyThreshold(costUsd, record).catch((err) => {
    console.error('[AiCostTracker] Error al verificar umbral diario:', err);
  });
}

async function checkDailyThreshold(latestCost: number, record: AiUsageRecord) {
  const thresholdUsd = Number(process.env.AI_DAILY_COST_LIMIT_USD || '5.0');
  const alertEmail = process.env.AI_ALERT_EMAIL || 'sistemaamexcourier@gmail.com';
  const todayStr = new Date().toISOString().slice(0, 10);

  if (lastAlertDate === todayStr) {
    // Ya se envió alerta el día de hoy
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    const { data, error } = await admin
      .from('ai_usage_logs')
      .select('costo_estimado_usd')
      .gte('creado_en', startOfDay)
      .lte('creado_en', endOfDay);

    if (error || !data) return;

    const totalDailyCost = data.reduce((acc, row) => acc + Number(row.costo_estimado_usd || 0), 0);

    if (totalDailyCost >= thresholdUsd) {
      lastAlertDate = todayStr;

      // 1. Notificar a Sentry
      Sentry.captureMessage(
        `[Alerta Gasto IA] Consumo diario de OpenAI superó el umbral: $${totalDailyCost.toFixed(2)} USD (Límite: $${thresholdUsd.toFixed(2)} USD)`,
        'warning'
      );

      // 2. Enviar email al administrador vía Resend
      await sendEmail({
        to: alertEmail,
        subject: `⚠️ Alerta de Gasto en IA - AMEX Courier ($${totalDailyCost.toFixed(2)} USD hoy)`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #d97706; margin-top: 0;">⚠️ Alerta de Consumo de IA (AMEXito)</h2>
            <p>Se ha detectado un incremento en el consumo diario de los modelos de inteligencia artificial en el sistema:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Gasto acumulado hoy:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; color: #b45309; font-weight: bold;">$${totalDailyCost.toFixed(4)} USD</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Umbral configurado:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">$${thresholdUsd.toFixed(2)} USD</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Último usuario activo:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${record.usuarioEmail || 'Desconocido'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Última operación:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${record.feature} (${record.model})</td>
              </tr>
            </table>
            <p style="font-size: 13px; color: #64748b;">
              <strong>Nota:</strong> Los usuarios NO han sido bloqueados para no interrumpir la operativa diaria. Puedes consultar el detalle en el panel de OpenAI o en Sentry.
            </p>
          </div>
        `,
      });

      console.log(`[AiCostTracker] Alerta de gasto diario enviada exitosamente a ${alertEmail}`);
    }
  } catch (err) {
    console.error('[AiCostTracker] Error evaluando umbral de gasto diario:', err);
  }
}
