# Servicios internos de procesamiento

## Responsabilidades

| Componente | Responsabilidad | No debe hacer |
| --- | --- | --- |
| `worker/worker.js` | Polling de jobs, descarga/subida R2, caché TIB, progreso y estado del job | Gestionar sockets HTTP del procesador o duplicar el fallback CLI |
| `worker/processor-client.js` | Ciclo de vida del daemon C#, health, warmup, ejecución HTTP y fallback CLI | Consultar Supabase o conocer reglas de negocio de paquetes |
| `worker/processor/AmexInventoryProcessor/Program.cs` | CLI, parsing OpenXML, matching y generación de resultados | Resolver transporte HTTP del daemon |
| `worker/processor/AmexInventoryProcessor/ProcessorDaemon.cs` | HTTP loopback, contratos de request/response, correlation IDs y logs estructurados | Transformar workbooks o acceder a R2 |

## Contrato operativo

- El worker intenta primero `POST /process` contra `127.0.0.1:${PROCESSOR_PORT}`.
- Si el daemon no está disponible o devuelve un resultado inválido, `processor-client.js` ejecuta el binario en modo CLI.
- `GET /health` y `POST /warmup` son operaciones internas de loopback; no se exponen a Internet.
- Cada petición del daemon conserva o genera `x-request-id` y `x-correlation-id` y los devuelve en la respuesta.
- Los logs del daemon se emiten como JSON para poder recogerlos en el agregador del worker.

## Verificación

```powershell
node --check worker/worker.js
node --check worker/processor-client.js
dotnet build worker/processor/AmexInventoryProcessor/AmexInventoryProcessor.csproj --configuration Release
```

El worker no debe iniciarse localmente contra una cola Supabase/R2 compartida. Para E2E remoto se deben proporcionar las variables sólo al proceso de Playwright:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://www.sistemaamexcourier.online'
$env:E2E_EMAIL = '<cuenta-de-pruebas>'
$env:E2E_PASSWORD = '<secreto-no-guardado>'
npx playwright test tests/e2e/real-readonly.auth.spec.ts --project=chromium
```

Ese spec sólo valida login, sesión, historial de inventario y contratos HTTP. No crea jobs, no sube archivos y no sincroniza scanner.
