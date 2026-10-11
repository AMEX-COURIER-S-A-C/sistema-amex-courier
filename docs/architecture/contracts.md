# Contratos y límites de integración

## Versión actual

Las respuestas nuevas y las rutas migradas usan `contractVersion: "v1"`, además de
`x-request-id`, `x-correlation-id` y `x-contract-version`.

Los errores conservan el campo `error` como texto para no romper clientes existentes,
pero añaden `code`, `details`, `requestId` y `contractVersion`.

## Reglas

1. Validar entradas con Zod antes de tocar Supabase, R2 o un proceso externo.
2. Validar también la respuesta recibida desde worker, Python o C#.
3. No propagar secretos ni documentos completos en logs.
4. Propagar `x-request-id` y `x-correlation-id` entre servicios.
5. Las migraciones de contratos deben ser expand/contract y backward-compatible.
6. Un cambio incompatible requiere una versión nueva del contrato y un adaptador temporal.

## Servicios

- Next.js: API pública y autorización de usuario.
- Worker Node: jobs, caché TIB y coordinación de procesadores.
- C# OpenXML: procesamiento determinista de Excel.
- Python FastAPI: OCR/OMR y extracción de manifiestos.
- Supabase/R2: persistencia y archivos, respectivamente.
