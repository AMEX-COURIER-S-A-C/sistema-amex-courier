import OpenAI from 'openai';

function getOpenAiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

/**
 * Modelo único y exclusivo para todo el sistema: GPT-6.1 Sol en modo Ultrafast.
 * Se fuerza en código para garantizar que ningún módulo ni fallback utilice otro modelo.
 */
export const OPENAI_SOL_ULTIMATE_MODEL = 'gpt-6.1-sol' as const;
export const OPENAI_ULTIMATE_SERVICE_TIER = 'ultrafast' as const;

export const DEFAULT_OPENAI_MODEL = OPENAI_SOL_ULTIMATE_MODEL;
export const FAST_TEXT_MODEL = OPENAI_SOL_ULTIMATE_MODEL;
export const MANIFEST_AI_MODEL = OPENAI_SOL_ULTIMATE_MODEL;
export const SHALOM_AI_MODEL = OPENAI_SOL_ULTIMATE_MODEL;
export const ROTULO_AI_MODEL = OPENAI_SOL_ULTIMATE_MODEL;
export const DNI_AI_MODEL = OPENAI_SOL_ULTIMATE_MODEL;

/**
 * Esquemas JSON estrictos (Structured Outputs)
 * Compilados con gramática libre de contexto por OpenAI para máxima velocidad y 0 errores
 */
export const DNI_JSON_SCHEMA = {
  name: 'dni_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      dni: { type: 'string', description: 'Número del documento de 8 dígitos para DNI o CE' },
      nombres: { type: 'string', description: 'Nombres de la persona en mayúsculas' },
      apellidos: { type: 'string', description: 'Apellidos de la persona en mayúsculas' },
      nombre_completo: { type: 'string', description: 'Nombres y apellidos completos en mayúsculas' }
    },
    required: ['dni', 'nombres', 'apellidos', 'nombre_completo'],
    additionalProperties: false
  }
} as const;

export const INVOICE_JSON_SCHEMA = {
  name: 'invoice_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tracking: { type: 'string', description: 'Número de rastreo de la compra' },
      invoice_number: { type: 'string', description: 'Número de factura' },
      descripcion_mercancia: { type: 'string', description: 'Descripción breve de la mercancía' },
      peso_kg: { type: 'number', description: 'Peso en kilogramos' },
      valor_usd: { type: 'number', description: 'Valor total en dólares USD' }
    },
    required: ['tracking', 'invoice_number', 'descripcion_mercancia', 'peso_kg', 'valor_usd'],
    additionalProperties: false
  }
} as const;

export const ROTULO_JSON_SCHEMA = {
  name: 'rotulo_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      pedidos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            siglas: { type: 'string' },
            totalCajas: { type: 'string' },
            agencia: { type: 'string', enum: ['SHALOM', 'CRUZ DEL SUR', 'OLVA', 'OTRA'] },
            agenciaOtra: { type: 'string' },
            nombre: { type: 'string' },
            dni: { type: 'string' },
            celular: { type: 'string' },
            destino: { type: 'string' },
            remitente: { type: 'string' }
          },
          required: ['siglas', 'totalCajas', 'agencia', 'agenciaOtra', 'nombre', 'dni', 'celular', 'destino', 'remitente'],
          additionalProperties: false
        }
      }
    },
    required: ['pedidos'],
    additionalProperties: false
  }
} as const;

export const SHALOM_BOLETA_JSON_SCHEMA = {
  name: 'shalom_boleta_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      nro_orden: { type: 'string', description: 'Número de orden o guía de Shalom impreso en negrita (7 a 9 dígitos, ej: 95294190)' },
      codigo: { type: 'string', description: 'Código alfanumérico corto de retiro o seguimiento en agencia (ej: 7HH7)' },
      fecha_emision: { type: 'string', description: 'Fecha de emisión en formato YYYY-MM-DD' },
      destinatario_nombre: { type: 'string', description: 'Nombres y apellidos completos de quien recibe en mayúsculas' },
      destinatario_dni: { type: 'string', description: 'DNI (8 dígitos) o RUC (11 dígitos) del destinatario' },
      destinatario_telefono: { type: 'string', description: 'Número de celular o teléfono del destinatario (9 dígitos)' },
      destino: { type: 'string', description: 'Ciudad y agencia Shalom de destino en mayúsculas' },
      tipo_entrega: { type: 'string', description: 'ENTREGAR EN AGENCIA o ENTREGA A DOMICILIO' },
      forma_pago: { type: 'string', description: 'PAGO_DESTINO (Pendiente de Pago) o PAGADO (Contado)' },
      descripcion: { type: 'string', description: 'Descripción de la encomienda (ej: BULTO, PAQUETE, CAJA)' },
      cantidad: { type: 'number', description: 'Cantidad de bultos o piezas (entero, default 1)' },
      peso: { type: 'number', description: 'Peso o volumen numérico decimal en Kg' },
      monto_total: { type: 'number', description: 'Importe total en Soles (PEN)' }
    },
    required: [
      'nro_orden',
      'codigo',
      'fecha_emision',
      'destinatario_nombre',
      'destinatario_dni',
      'destinatario_telefono',
      'destino',
      'tipo_entrega',
      'forma_pago',
      'descripcion',
      'cantidad',
      'peso',
      'monto_total'
    ],
    additionalProperties: false
  }
} as const;

/**
 * Singleton del Cliente OpenAI:
 * Mantiene conexiones TLS/HTTP persistentes y reutiliza el cliente.
 */
let openAiClientInstance: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  if (!openAiClientInstance) {
    const apiKey = getOpenAiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.');
    }
    openAiClientInstance = new OpenAI({ apiKey });
  }
  return openAiClientInstance;
}

/**
 * Opciones dinámicas para el modelo OpenAI configurado (GPT-6.1 Sol).
 */
export function getOpenAiModelOptions(maxTokens = 500, _modelOverride?: string) {
  return {
    max_completion_tokens: maxTokens,
    reasoning_effort: 'low' as const
  };
}

/**
 * Separa el MIME type y el string Base64 puro de un Data URL
 */
export function parseBase64Data(dataUrl: string): { mimeType: string; base64: string } {
  if (dataUrl.startsWith('data:')) {
    const commaIndex = dataUrl.indexOf(',');
    const mimeMatch = dataUrl.substring(0, commaIndex).match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64 = dataUrl.substring(commaIndex + 1);
    return { mimeType, base64 };
  }
  return { mimeType: 'image/jpeg', base64: dataUrl };
}

/**
 * Parseo directo y optimizado de JSON devuelto por los modelos de IA
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAiJsonResponse<T = any>(rawText?: string | null): T {
  if (!rawText) return {} as T;
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Seguir al fallback de limpieza
    }
  }
  const cleanJson = trimmed.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson || '{}');
}

export interface UltrafastResponseResult {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    model: string;
    service_tier: string;
  };
}

/**
 * Ejecuta una llamada exclusiva usando la Responses API (/v1/responses) de OpenAI
 * con el modelo fijo `gpt-6.1-sol`, `service_tier: "ultrafast"`, `reasoning: { effort: "low" }`
 * y Structured Outputs (JSON Schema estricto). No realiza fallback a ningún otro modelo.
 */
export async function callOpenAiResponsesUltrafast(params: {
  prompt: string;
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  maxOutputTokens?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonSchema?: { name: string; strict?: boolean; schema: Record<string, any> };
}): Promise<UltrafastResponseResult> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentList: any[] = [];

  if (params.text && params.text.trim()) {
    contentList.push({
      type: 'input_text',
      text: `Texto del pedido a interpretar:\n${params.text.trim()}`
    });
  }

  if (params.imageBase64) {
    const parsed = parseBase64Data(params.imageBase64);
    const mimeType = params.imageMimeType || parsed.mimeType || 'image/jpeg';
    contentList.push({
      type: 'input_image',
      image_url: `data:${mimeType};base64,${parsed.base64}`,
      detail: 'high'
    });
  }

  if (params.pdfBase64) {
    const parsed = parseBase64Data(params.pdfBase64);
    contentList.push({
      type: 'input_file',
      filename: params.pdfFilename || 'document.pdf',
      file_data: `data:application/pdf;base64,${parsed.base64}`
    });
  }

  contentList.push({
    type: 'input_text',
    text: params.prompt
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    model: OPENAI_SOL_ULTIMATE_MODEL,
    service_tier: OPENAI_ULTIMATE_SERVICE_TIER,
    reasoning: { effort: 'low' },
    input: [
      {
        role: 'user',
        content: contentList
      }
    ]
  };

  if (params.maxOutputTokens) {
    payload.max_output_tokens = params.maxOutputTokens;
  }

  if (params.jsonSchema) {
    payload.text = {
      format: {
        type: 'json_schema',
        name: params.jsonSchema.name,
        strict: params.jsonSchema.strict ?? true,
        schema: params.jsonSchema.schema
      }
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[GPT-6.1 Sol Ultrafast HTTP ${res.status}]: ${errText.substring(0, 300)}`);
      }

      const json = await res.json();
      let outputText = '';

      for (const item of json.output || []) {
        if (item.type === 'message') {
          for (const c of item.content || []) {
            if (c.type === 'output_text' && c.text) {
              outputText = c.text;
              break;
            }
          }
        }
        if (outputText) break;
      }

      const usage = json.usage || {};
      return {
        text: outputText || '{}',
        usage: {
          prompt_tokens: Number(usage.input_tokens || 0),
          completion_tokens: Number(usage.output_tokens || 0),
          total_tokens: Number(usage.total_tokens || 0),
          model: OPENAI_SOL_ULTIMATE_MODEL,
          service_tier: json.service_tier || OPENAI_ULTIMATE_SERVICE_TIER
        }
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[GPT-6.1 Sol Ultrafast Intento ${attempt}/2]:`, lastError.message);
    }
  }

  throw lastError || new Error('Error al invocar GPT-6.1 Sol Ultrafast en OpenAI Responses API.');
}

/**
 * Analiza facturas de compra/invoices para el módulo de inventario usando exclusivamente GPT-6.1 Sol Ultrafast
 */
export async function analyzeInvoiceDocument(fileBase64: string, mimeType: string) {
  const prompt = `Analiza esta factura de compra/invoice de paquete importado. 
Extrae la siguiente información en formato JSON estricto:
{
  "tracking": "número de rastreo de la tienda o courier si aparece",
  "invoice_number": "número de factura/invoice de la compra",
  "descripcion_mercancia": "breve descripción del producto comprado",
  "peso_kg": 0.0,
  "valor_usd": 0.00
}
Si algún valor no es visible, retorna cadena vacía o 0.
Devuelve exclusivamente un objeto JSON válido con los campos solicitados.`;

  const isPdf = (mimeType || '').toLowerCase().includes('pdf');

  const response = await callOpenAiResponsesUltrafast({
    prompt,
    ...(isPdf
      ? { pdfBase64: fileBase64, pdfFilename: 'invoice.pdf' }
      : { imageBase64: fileBase64, imageMimeType: mimeType || 'image/jpeg' }),
    maxOutputTokens: 350,
    jsonSchema: INVOICE_JSON_SCHEMA
  });

  return parseAiJsonResponse(response.text);
}

/**
 * Analiza la imagen del anverso del DNI para extraer nombres, apellidos y número de DNI automáticamente
 */
export interface ExtractedDniResult {
  nombre_completo: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens?: number;
    model: string;
  };
}

export async function extractDniNameFromImage(imageInput: string): Promise<ExtractedDniResult> {
  const prompt = `Analiza con máxima precisión la imagen de este Documento de Identidad del Perú (DNI 1.0 clásico azul/amarillo, DNIe 2.0/3.0 electrónico blanco, o Carnet de Extranjería CE).

Tu objetivo es leer y extraer con la máxima fidelidad:
1. El número del documento de identidad ("dni")
2. Los nombres y apellidos de la persona ("nombres", "apellidos", "nombre_completo")

============================================================
REGLAS CRÍTICAS PARA IDENTIFICAR EL NÚMERO DE DNI (8 DÍGITOS OBLIGATORIO):
============================================================
En el Perú existen 4 tipos de documentos. Aplica las siguientes reglas según el tipo de documento detectado:

1. DNI ELECTRÓNICO (DNIe 2.0 y 3.0 - Tarjeta blanca/celeste con chip):
   - El número de DNI se encuentra en la ESQUINA SUPERIOR DERECHA, rotulado con la etiqueta "CUI" (Código Único de Identificación).
     Ejemplo: "CUI 76219579-3".
     El número de DNI son ÚNICAMENTE los 8 dígitos antes del guión: "76219579". El último número tras el guión (ej: -3) es el dígito verificador y NO forma parte del DNI.
   - También está impreso en vertical al lado izquierdo o sobre la fotografía en miniatura: "76219579".
   - ⚠️ ¡ADVERTENCIA ESTRICTA Y PROHIBICIÓN!: En el centro de la tarjeta, debajo de los prenombres o al lado de "Sexo F/M", aparece un número de 6 DÍGITOS (ej: "873517"). ¡ESE NÚMERO DE 6 DÍGITOS NO ES EL DNI! Es un código de ubigeo o lote de emisión de la tarjeta. NUNCA extraigas un número de 6 dígitos. Un DNI peruano tiene SIEMPRE EXACTAMENTE 8 DÍGITOS.
   - Tampoco confundas el "N° de Tarjeta" de 10 dígitos (ej: 0203284723) con el DNI.

2. DNI CLÁSICO AZUL (DNI 1.0) o AMARILLO (MENORES):
   - El número de 8 dígitos está en la esquina superior derecha en color negro o rojo (ej: "45879632" o "45879632-1"). Extrae los 8 dígitos principales antes del guión.

4. ZONA DE LECTURA MECÁNICA MRZ (Líneas inferiores con signos <<< en DNI electrónico):
   - La línea con "I<PER..." contiene el DNI de 8 dígitos tras PER (ej: "I<PER73674972<5..." -> DNI: "73674972").
   - La línea inferior contiene "APELLIDOS<<NOMBRES<<" (ej: "CABALLERO<<ALEXANDER<ASMIR<<" -> Apellidos: CABALLERO, Nombres: ALEXANDER ASMIR).
   - Siempre examina la zona MRZ para extraer o verificar el DNI y los nombres con máxima precisión.

5. ORIENTACIÓN Y REFLEJOS:
   - Lee el documento sin importar si está orientado horizontalmente o con inclinación.

FORMATO DE SALIDA JSON ESTRICTO:
{
  "dni": "SOLO DIGITOS DEL DNI (8 dígitos para DNI peruano, ej: 73674972; 9 dígitos para CE)",
  "nombres": "NOMBRES DE LA PERSONA",
  "apellidos": "APELLIDOS DE LA PERSONA",
  "nombre_completo": "[NOMBRES] [APELLIDOS] EN MAYÚSCULAS"
}

Reglas estrictas:
1. El campo "dni" DEBE ser los 8 dígitos reales del DNI (ej: "73674972"). Si viste 6 dígitos como "873517", DESCÁRTALO y busca el CUI de 8 dígitos en la esquina superior derecha o en la línea MRZ "I<PER...".
2. "nombre_completo": siempre primero nombres de pila y luego apellidos (ej: "ALEXANDER ASMIR CABALLERO CACERES").
3. Todo el texto de nombres debe estar 100% en MAYÚSCULAS y limpio de símbolos extraños o puntuaciones innecesarias.
4. Si la imagen no es un documento o resulta totalmente ilegible, devuelve en formato JSON: {"dni": "", "nombre_completo": ""}.`;

  const ultrafastResult = await callOpenAiResponsesUltrafast({
    prompt,
    imageBase64: imageInput,
    maxOutputTokens: 200,
    jsonSchema: DNI_JSON_SCHEMA
  });

  try {
    const parsed = parseAiJsonResponse(ultrafastResult.text);
    const nombreCompleto = (parsed.nombre_completo || '').trim().toUpperCase();
    let rawDni = (parsed.dni || '').toString().replace(/[^0-9A-Za-z]/g, '').trim();

    // Si viene con guión o dígito verificador pegado (9 dígitos de DNI estándar que no empieza en 00):
    if (rawDni.length === 9 && !rawDni.startsWith('00')) {
      rawDni = rawDni.slice(0, 8);
    }

    // Regla de salvaguarda: Un DNI peruano NUNCA tiene 6 dígitos (código de ubigeo o lote)
    if (rawDni.length === 6) {
      console.warn(`[DNI Parser] Se descartó código interno de 6 dígitos (${rawDni}), no corresponde a un DNI.`);
      rawDni = '';
    }

    return {
      nombre_completo: nombreCompleto,
      dni: rawDni,
      nombres: (parsed.nombres || '').trim().toUpperCase(),
      apellidos: (parsed.apellidos || '').trim().toUpperCase(),
      usage: {
        prompt_tokens: ultrafastResult.usage.prompt_tokens || 300,
        completion_tokens: ultrafastResult.usage.completion_tokens || 60,
        total_tokens: ultrafastResult.usage.total_tokens || 360,
        model: OPENAI_SOL_ULTIMATE_MODEL
      }
    };
  } catch (err) {
    console.error('Error al parsear respuesta JSON de IA para DNI:', ultrafastResult.text, err);
    throw new Error('No se pudo procesar la respuesta de la Inteligencia Artificial.');
  }
}

export interface ExtractedRotuloData {
  siglas?: string;
  totalCajas?: string;
  agencia?: 'SHALOM' | 'CRUZ DEL SUR' | 'OLVA' | 'OTRA';
  agenciaOtra?: string;
  nombre?: string;
  dni?: string;
  celular?: string;
  destino?: string;
  remitente?: string;
  items?: ExtractedRotuloData[];
}

/**
 * AMEXito IA (GPT-6.1 Sol Ultrafast): Interpreta capturas de pantalla de WhatsApp o textos no estructurados
 * y extrae todos los campos requeridos para el rótulo de agencias (individual o lista múltiple)
 */
export async function parseRotuloWithAi(input: {
  text?: string;
  imageBase64?: string;
}): Promise<ExtractedRotuloData> {
  const prompt = `Eres AMEXito IA, el asistente inteligente de AMEX Courier Perú especializado en logística y rotulación de agencias.
Tu objetivo es analizar el texto y/o la imagen de un mensaje de WhatsApp u orden de envío, y extraer de forma estructurada los datos del o los destinatarios para generar rótulos de agencia de transporte (Shalom, Olva, Cruz del Sur u otra).

IMPORTANTE: Si el contenido contiene MÁS DE UN PEDIDO O DESTINATARIO (ej: 2, 3, 4 o 5 personas distintas en un mismo mensaje de WhatsApp), extrae CADA UNO en una lista de pedidos.

Estructura de salida requerida en JSON:
{
  "pedidos": [
    {
      "siglas": "Código o clave del paquete alfanumérico (ej: 'CE79', 'CE39', 'CP89', 'CP58', 'CE150', 'CP 68'). Si no hay, dejar en blanco ''",
      "totalCajas": "Cantidad total de cajas o bultos solo el número (ej: '2 cajas' -> '2', '3 cajas' -> '3', si no especifica poner '1')",
      "agencia": "Debe ser exactamente una de estas 4 opciones en mayúsculas: 'SHALOM', 'CRUZ DEL SUR', 'OLVA', o 'OTRA'",
      "agenciaOtra": "Si la agencia fue 'OTRA', el nombre de dicha agencia (ej: 'MARVISUR', 'MÓVIL BUS'). Si es Shalom, Cruz del Sur u Olva, dejar en blanco ''",
      "nombre": "Nombres y apellidos completos del destinatario (en MAYÚSCULAS)",
      "dni": "Número de identificación del destinatario: DNI (8 dígitos), Carnet de Extranjería / CE (ej: '008619120'), o RUC (11 dígitos). Solo dígitos alfanuméricos limpios sin guiones",
      "celular": "Número telefónico o de celular del destinatario (ej: '934548741', '981081414'. Solo los 9 dígitos sin espacios ni guiones)",
      "destino": "Destino completo, departamento/ciudad, agencia de entrega y/o dirección de destino (ej: 'ANCASH - CASMA - CASMA SHALOM AV. MIGUEL GRAU', 'TACNA - AV. VIGIL - SHALOM', 'CHANCAY', 'CHIMBOTE (AV. JOSÉ GÁLVEZ 767)'). En MAYÚSCULAS",
      "remitente": "Siempre 'AMEX COURIER PERÚ' (fijo e inalterable)"
    }
  ]
}

Reglas estrictas:
1. Devuelve un objeto JSON con la propiedad "pedidos" conteniendo de 1 a N pedidos detectados.
2. Limpia los números de teléfono y documentos de espacios o guiones.
3. Si algún campo no se encuentra en el texto o imagen, devuelve cadena vacía "".
4. No inventes información; solo extrae lo que esté presente o se deduzca claramente del contexto.`;

  const isTextOnly = !input.imageBase64 && Boolean(input.text && input.text.trim());
  const maxTokens = isTextOnly ? 400 : 600;

  const ultrafastResult = await callOpenAiResponsesUltrafast({
    prompt,
    text: input.text,
    imageBase64: input.imageBase64,
    maxOutputTokens: maxTokens,
    jsonSchema: ROTULO_JSON_SCHEMA
  });

  try {
    const parsed = parseAiJsonResponse(ultrafastResult.text);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawList: any[] = Array.isArray(parsed.pedidos)
      ? parsed.pedidos
      : (Array.isArray(parsed) ? parsed : [parsed]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizeOrder = (p: any): ExtractedRotuloData => {
      let agencia: 'SHALOM' | 'CRUZ DEL SUR' | 'OLVA' | 'OTRA' = 'SHALOM';
      const rawAgencia = String(p.agencia || '').toUpperCase();
      if (rawAgencia.includes('CRUZ')) {
        agencia = 'CRUZ DEL SUR';
      } else if (rawAgencia.includes('OLVA')) {
        agencia = 'OLVA';
      } else if (rawAgencia.includes('SHALOM')) {
        agencia = 'SHALOM';
      } else if (rawAgencia && rawAgencia !== 'SHALOM') {
        agencia = 'OTRA';
      }

      return {
        siglas: (p.siglas || '').trim().toUpperCase(),
        totalCajas: (p.totalCajas || '').trim(),
        agencia,
        agenciaOtra: (p.agenciaOtra || '').trim().toUpperCase(),
        nombre: (p.nombre || '').trim().toUpperCase(),
        dni: (p.dni || '').trim().toUpperCase(),
        celular: (p.celular || '').trim(),
        destino: (p.destino || '').trim().toUpperCase(),
        remitente: 'AMEX COURIER PERÚ'
      };
    };

    const items = rawList.map(normalizeOrder).filter((it) => it.nombre || it.destino || it.dni);
    const firstItem = items[0] || normalizeOrder(parsed);

    return {
      ...firstItem,
      items: items.length > 0 ? items : [firstItem]
    };
  } catch (err) {
    console.error('Error al parsear respuesta JSON de IA para rótulo:', ultrafastResult.text, err);
    throw new Error('No se pudo procesar la respuesta de la Inteligencia Artificial.');
  }
}

export interface ShalomBoletaExtractedData {
  nro_orden: string;
  codigo: string;
  fecha_emision: string; // YYYY-MM-DD
  destinatario_nombre: string;
  destinatario_dni: string;
  destinatario_telefono: string;
  destino: string;
  tipo_entrega: string;
  forma_pago: string;
  monto_total: number;
  descripcion: string;
  cantidad: number;
  peso: number;
  // Campos opcionales para retrocompatibilidad
  numero_guia?: string;
  codigo_seguimiento?: string;
  destinatario_documento?: string;
  agencia_destino?: string;
  modalidad_pago?: string;
  contenido_bultos?: string;
  peso_total?: number;
  origen?: string;
  moneda?: string;
  hora_emision?: string;
  fecha_traslado?: string;
  remitente_nombre?: string;
  remitente_dni?: string;
  remitente_telefono?: string;
  unidad_medida?: string;
  observaciones?: string;
}

/**
 * Analiza un documento PDF o imagen de ticket / boleta de SHALOM
 * Utiliza exclusivamente AMEXito IA con GPT-6.1 Sol Ultrafast y Structured Outputs (JSON Schema estricto)
 */
export async function analyzeShalomBoletaPdf(pdfBase64: string): Promise<ShalomBoletaExtractedData> {
  const { mimeType, base64 } = parseBase64Data(pdfBase64);

  const prompt = `Eres AMEXito IA con GPT-6.1 Sol Ultrafast, el sistema de visión e inteligencia artificial de AMEX Courier SAC especializado en comprobantes de Shalom en Perú.
Analiza con máxima precisión este TICKET O BOLETA DE SHALOM y extrae ÚNICAMENTE los datos operativos esenciales:

CAMPOS A EXTRAER:
1. "nro_orden": Número de orden o guía impreso en negrita (ej: "95294190").
2. "codigo": Código alfanumérico corto de retiro en agencia (ej: "7HH7", "W3W").
3. "fecha_emision": Fecha de emisión en formato YYYY-MM-DD (ej: "2026-09-28").
4. "destinatario_nombre": Nombres y apellidos completos de quien recibe en mayúsculas (ej: "ORTEGA USCA LEANDRA ELIZABETH").
5. "destinatario_dni": DNI (8 dígitos) o documento de quien recibe.
6. "destinatario_telefono": Celular o teléfono del receptor (9 dígitos).
7. "destino": Ciudad y agencia Shalom de destino (ej: "AREQUIPA - MALL LAMBRAMANI").
8. "tipo_entrega": "ENTREGAR EN AGENCIA" o "ENTREGA A DOMICILIO".
9. "forma_pago": "Pendiente de Pago" (o PAGO DESTINO) o "Pagado" (Contado).
10. "descripcion": Tipo de paquete (ej: "BULTO", "PAQUETE", "CAJA").
11. "cantidad": Número entero de bultos (default 1).
12. "peso": Peso numérico decimal en Kg (ej: 0.50).
13. "monto_total": Importe total en Soles (número decimal, ej: 22.00).

REGLAS ESTRICTAS:
- Nombres y destino siempre en MAYÚSCULAS.
- Fechas siempre en formato ISO YYYY-MM-DD.
- Omite texto legal de observaciones o datos repetitivos del remitente.`;

  const isPdf = (mimeType || '').toLowerCase().includes('pdf');

  const ultrafastResult = await callOpenAiResponsesUltrafast({
    prompt,
    ...(isPdf
      ? { pdfBase64: base64, pdfFilename: 'ticket.pdf' }
      : { imageBase64: base64, imageMimeType: mimeType || 'image/jpeg' }),
    maxOutputTokens: 1200,
    jsonSchema: SHALOM_BOLETA_JSON_SCHEMA
  });

  try {
    const parsed = parseAiJsonResponse(ultrafastResult.text);
    const nroOrden = (parsed.nro_orden || parsed.numero_guia || '').trim().toUpperCase();
    const codigo = (parsed.codigo || parsed.codigo_seguimiento || '').trim().toUpperCase();
    const fechaEmision = (parsed.fecha_emision || new Date().toISOString().split('T')[0]).trim();
    const destNombre = (parsed.destinatario_nombre || '').trim().toUpperCase();
    const destDni = (parsed.destinatario_dni || parsed.destinatario_documento || '').trim();
    const destTel = (parsed.destinatario_telefono || '').trim();
    const destino = (parsed.destino || '').trim().toUpperCase();
    const tipoEntrega = (parsed.tipo_entrega || 'ENTREGAR EN AGENCIA').trim().toUpperCase();
    const formaPago = (parsed.forma_pago || 'Pendiente de Pago').trim();
    const desc = (parsed.descripcion || parsed.contenido_bultos || 'BULTO').trim().toUpperCase();
    const cantidad = parseInt(parsed.cantidad, 10) || 1;
    const peso = parseFloat(parsed.peso || parsed.peso_total) || 0;
    const montoTotal = parseFloat(parsed.monto_total) || 0;

    return {
      nro_orden: nroOrden,
      codigo,
      fecha_emision: fechaEmision,
      destinatario_nombre: destNombre,
      destinatario_dni: destDni,
      destinatario_telefono: destTel,
      destino,
      tipo_entrega: tipoEntrega,
      forma_pago: formaPago,
      monto_total: montoTotal,
      descripcion: desc,
      cantidad,
      peso,
      // Retrocompatibilidad
      numero_guia: nroOrden || codigo,
      codigo_seguimiento: codigo,
      destinatario_documento: destDni,
      modalidad_pago: formaPago.toUpperCase().includes('PENDIENTE') ? 'PAGO_DESTINO' : formaPago.toUpperCase(),
      contenido_bultos: desc,
      peso_total: peso,
      agencia_destino: tipoEntrega,
      moneda: 'PEN',
      origen: 'LINCE - LIMA'
    };
  } catch (err) {
    console.error('Error al parsear respuesta JSON de IA para ticket Shalom:', ultrafastResult.text, err);
    throw new Error('No se pudo estructurar la información del comprobante de Shalom.');
  }
}
