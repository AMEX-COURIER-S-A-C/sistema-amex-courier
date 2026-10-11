# Desarrollo local

## Estado inicial

El proyecto web local está preparado para usar el Supabase y R2 definidos en
`.env.local`. La CLI de Supabase está instalada como dependencia local, pero no
existe una instancia Supabase local porque Docker no está instalado.

Verifica la configuración sin mostrar secretos:

```bash
npm run doctor
```

## Arranque seguro

```bash
npm install
npm run dev
```

El servidor web queda disponible en `http://localhost:3000`. Si el puerto está
ocupado, Next.js selecciona otro puerto y lo informa en la consola.

## Worker y procesador C#

El worker consume la cola `inventario_jobs` y puede descargar/subir archivos a
R2. No debe ejecutarse contra credenciales compartidas de producción desde una
sesión local. Para probarlo se requiere un proyecto Supabase/R2 de staging y
compilar primero el procesador:

```bash
dotnet publish worker/processor/AmexInventoryProcessor/AmexInventoryProcessor.csproj \
  -c Release -r win-x64 --self-contained true \
  -o worker/processor/AmexInventoryProcessor/publish/win-x64
npm run worker
```

En Windows, usa PowerShell si el comando multilínea no funciona en tu shell.

## Verificación

```bash
npm run verify:contracts
npm test
npm run build
npm run test:e2e
```

El flujo E2E autenticado requiere `E2E_EMAIL` y `E2E_PASSWORD`; sin esas
variables se omite intencionalmente para no usar credenciales reales.
