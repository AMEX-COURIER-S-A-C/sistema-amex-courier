import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OPENAI_SOL_ULTIMATE_MODEL,
  OPENAI_ULTIMATE_SERVICE_TIER,
  DEFAULT_OPENAI_MODEL,
  FAST_TEXT_MODEL,
  MANIFEST_AI_MODEL,
  SHALOM_AI_MODEL,
  ROTULO_AI_MODEL,
  DNI_AI_MODEL,
  callOpenAiResponsesUltrafast,
  parseRotuloWithAi,
  analyzeShalomBoletaPdf,
  analyzeInvoiceDocument,
  extractDniNameFromImage,
} from '@/lib/openai/analyzer';

describe('GPT-6.1 Sol Ultrafast Exclusive Configuration', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test-sol-ultrafast';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('enforces gpt-6.1-sol and ultrafast across all model constants', () => {
    expect(OPENAI_SOL_ULTIMATE_MODEL).toBe('gpt-6.1-sol');
    expect(OPENAI_ULTIMATE_SERVICE_TIER).toBe('ultrafast');
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-6.1-sol');
    expect(FAST_TEXT_MODEL).toBe('gpt-6.1-sol');
    expect(MANIFEST_AI_MODEL).toBe('gpt-6.1-sol');
    expect(SHALOM_AI_MODEL).toBe('gpt-6.1-sol');
    expect(ROTULO_AI_MODEL).toBe('gpt-6.1-sol');
    expect(DNI_AI_MODEL).toBe('gpt-6.1-sol');
  });

  it('invokes /v1/responses exclusively with model=gpt-6.1-sol, service_tier=ultrafast, and reasoning.effort=low', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-6.1-sol',
        service_tier: 'ultrafast',
        usage: { input_tokens: 100, output_tokens: 25, total_tokens: 125 },
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  pedidos: [
                    {
                      siglas: 'CE79',
                      totalCajas: '2',
                      agencia: 'SHALOM',
                      agenciaOtra: '',
                      nombre: 'JUAN PEREZ',
                      dni: '45879632',
                      celular: '987654321',
                      destino: 'AREQUIPA',
                      remitente: 'AMEX COURIER PERÚ',
                    },
                  ],
                }),
              },
            ],
          },
        ],
      }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await parseRotuloWithAi({ text: 'CE79 Juan Perez Arequipa' });
    expect(result.siglas).toBe('CE79');
    expect(result.nombre).toBe('JUAN PEREZ');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-6.1-sol');
    expect(body.service_tier).toBe('ultrafast');
    expect(body.reasoning).toEqual({ effort: 'low' });
    expect(body.text.format.type).toBe('json_schema');
    expect(body.text.format.name).toBe('rotulo_extraction');
  });

  it('uses gpt-6.1-sol ultrafast with input_file for Shalom PDF and Invoice PDF', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const reqBody = JSON.parse(init.body as string);
      const schemaName = reqBody.text?.format?.name;
      const mockPayload =
        schemaName === 'shalom_boleta_extraction'
          ? {
              nro_orden: '95294190',
              codigo: '7HH7',
              fecha_emision: '2026-10-28',
              destinatario_nombre: 'MARIA LOPEZ',
              destinatario_dni: '71234567',
              destinatario_telefono: '999888777',
              destino: 'TRUJILLO',
              tipo_entrega: 'ENTREGAR EN AGENCIA',
              forma_pago: 'Pendiente de Pago',
              descripcion: 'CAJA',
              cantidad: 1,
              peso: 2.5,
              monto_total: 25.0,
            }
          : schemaName === 'invoice_extraction'
          ? {
              tracking: '1Z999AA10123456784',
              invoice_number: 'INV-9981',
              descripcion_mercancia: 'ZAPATILLAS',
              peso_kg: 1.5,
              valor_usd: 120.5,
            }
          : {
              dni: '73674972',
              nombres: 'ALEXANDER',
              apellidos: 'CABALLERO',
              nombre_completo: 'ALEXANDER CABALLERO',
            };

      return {
        ok: true,
        json: async () => ({
          model: 'gpt-6.1-sol',
          service_tier: 'ultrafast',
          usage: { input_tokens: 200, output_tokens: 40, total_tokens: 240 },
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: JSON.stringify(mockPayload) }],
            },
          ],
        }),
      };
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const shalom = await analyzeShalomBoletaPdf('data:application/pdf;base64,JVBERi0xLjQ=');
    expect(shalom.nro_orden).toBe('95294190');

    const invoice = await analyzeInvoiceDocument('JVBERi0xLjQ=', 'application/pdf');
    expect(invoice.invoice_number).toBe('INV-9981');

    const dni = await extractDniNameFromImage('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    expect(dni.dni).toBe('73674972');
    expect(dni.usage?.model).toBe('gpt-6.1-sol');

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    for (const call of fetchSpy.mock.calls) {
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('gpt-6.1-sol');
      expect(body.service_tier).toBe('ultrafast');
      expect(body.reasoning).toEqual({ effort: 'low' });
    }
  });
});
