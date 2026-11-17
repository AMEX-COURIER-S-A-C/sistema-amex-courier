# Graph Report - sistema-amex-courier  (2026-11-16)

## Corpus Check
- 540 files · ~587,363 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2577 nodes · 5770 edges · 190 communities (140 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d067bb02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- constants.ts
- components/DniMatrixTab.tsx
- Program
- DashboardTabContent.tsx
- main.py
- confirmDialog
- useFormatoEntrega.ts
- worker.js
- getSupabaseAdmin
- components/BoletasShalomTab.tsx
- guards.ts
- components/RotulosA4Tab.tsx
- dialog.ts
- wr-matching.ts
- test-real-flow.mjs
- SmoothScrollManager
- analyzer.ts
- excelExport.ts
- inventario-jobs/route.ts
- paquetes.schema.ts
- compilerOptions
- ui/index.ts
- dependencies
- HalloweenBackdrop.tsx
- alertDialog
- types/index.ts
- shalom.service.ts
- devDependencies
- invoiceLayoutAndExport.test.ts
- Paquete
- worker/package.json
- components/AdminUsersTab.tsx
- What You Must Do When Invoked
- r2/client.ts
- InventoryToolbar.tsx
- scripts
- gen-certs.mjs
- whatsappGenerator.ts
- AmexInventoryProcessor.csproj
- next-env.d.ts
- vercel.json
- postcss.config.mjs
- local-doctor.mjs
- benchmark-comparativo-completo.mjs
- batch-sync/route.ts
- cleanup-test-data.mjs
- request-context.ts
- Program.cs
- test-scanner-performance.mjs
- ref_node_fs
- app/page.tsx
- Find Skills
- cruzar-planilla/route.ts
- cobros/types.ts
- matchesFuzzySearch
- graphify reference: extra exports and benchmark
- eslint.config.mjs
- FUENTE_VACIA_10bb5c65.md
- syncTibToPortal.ts
- graphify reference: query, path, explain
- next.config.ts
- ✈️ SISTEMA AMEX COURIER - Plataforma Logística Integrada v2.0
- Procesador AMEX con Open XML
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- rules/graphify.md
- extraction-spec.md
- workflows/graphify.md
- live-sheets/types.ts
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- scanner.ts
- tib-daily-sync.js
- tib-mirror-daemon.mjs
- docx
- test-api-scanner-batch.mjs
- Python Visualization Code Patterns
- test-credentials.js
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- KPI Dashboard Design
- Cliente
- withApi.ts
- RegistrarCobroDiarioModal.tsx
- parseWarehouseLocation
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- uploadFileToR2
- useInventoryData.ts
- InventoryHeader.tsx
- Logger
- MobileScannerModal.tsx
- getOrSyncCachedTibFile
- Common KPIs by Department
- ref_fs
- useCobrosOperaciones.ts
- components/InfoAmexTab.tsx
- .ReadRowValues
- sendEmail
- .WarmUpSources
- analyze-oct-week.mjs
- security-check.mjs
- check-vercel-envs.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- .PatchInventory
- shalom-boletas/route.ts
- eslint-config-next
- ProcessorDaemon
- extraer-clientes-tib.mjs
- security-secrets.md
- tarifas/route.ts
- analisis-clientes.mjs
- .CopyXmlNode
- register
- CachedSourceData
- write-excel-file
- file-saver
- lucide-react
- xlsx
- supabase/client.ts
- portal-client.ts
- zod
- inspect-usuarios.mjs
- components/CobrosTab.tsx
- @aws-sdk/client-s3
- selfsigned
- Q: ANALIZA ESTOS 2 PROYECTOS QUE TENGO ACTUALMENTE EN GENERAL, HACIENDO UN ANALISIS PROFESIONAL A LA ESTRUCTURA EN GENERAL COMO FUNCIONA CUAL ES SU MODELO DE NEGOCIO QUE VENTAJAS TIENE ETC ANALIZANDO LOS GRAPHIFY ETC
- Q: analiza todo y dime todos los servicios que se estan utilizando actualmetne por ejemplo vercel supabase sentry hostinger etc, listame todos
- Q: puedes ayudarme a hacer una migracion profesional de archivos y datos de R2 al nuevo Cloudflare de amexcourier sin perder nada; que necesitas para realizar todo el cambio?
- Q: puedes restaurarlos?, y modificar el codigo para que proxima vez o el sistema no tenga relaciones con el inventario de wrs ? ya que el modulo de despachos y rutas es aparte y no debe tener relacion con el inventario modulo 3 aunque tenga wrs del modulo 3 el modulo 16
- Q: Conectarse al VPS con las credenciales de .env.local, migrar el worker a la nueva cuenta Cloudflare R2, mejorar y publicar el código en producción
- package.json
- @aws-sdk/s3-request-presigner
- barcode-detector
- jspdf
- jszip
- lenis
- next
- openai
- react
- react-dom
- rxjs
- @sentry/nextjs
- @supabase/ssr
- @univerjs/preset-sheets-conditional-formatting
- @univerjs/preset-sheets-core
- @univerjs/preset-sheets-data-validation
- @univerjs/preset-sheets-filter
- @univerjs/preset-sheets-find-replace
- @univerjs/preset-sheets-sort
- @univerjs/presets
- zxing-wasm
- @playwright/test
- tailwindcss
- @tailwindcss/postcss
- @types/file-saver
- @types/react
- vite
- vitest

## God Nodes (most connected - your core abstractions)
1. `Paquete` - 110 edges
2. `getSupabaseAdmin()` - 81 edges
3. `authorizeUser()` - 77 edges
4. `alertDialog()` - 59 edges
5. `Cliente` - 57 edges
6. `Program` - 50 edges
7. `confirmDialog()` - 37 edges
8. `supabase` - 29 edges
9. `SmoothScrollManager` - 25 edges
10. `parseWarehouseLocation()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `authorizeUser()`  [EXTRACTED]
  app/api/shalom-boletas/route.ts → lib/auth/guards.ts
- `GET()` --calls--> `authorizeUser()`  [EXTRACTED]
  app/api/tib/recepcion-diaria/route.ts → lib/auth/guards.ts
- `NewPackageModalProps` --references--> `Cliente`  [EXTRACTED]
  components/modals/NewPackageModal.tsx → types/index.ts
- `PasteWrListModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/PasteWrListModal.tsx → types/index.ts
- `CobrosList()` --calls--> `getR2ViewUrl()`  [EXTRACTED]
  features/cobros/components/CobrosList.tsx → lib/r2/client.ts

## Import Cycles
- None detected.

## Communities (190 total, 50 thin omitted)

### Community 0 - "constants.ts"
Cohesion: 0.16
Nodes (21): POST(), GET, handleGet(), buildFallbackUserFromAuth(), DashboardUser, getSessionStartCookie(), readCachedUser(), saveCachedUser() (+13 more)

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (58): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+50 more)

### Community 2 - "Program"
Cohesion: 0.11
Nodes (17): int, long, object, CellData, CellKind, JsonSerializerOptions, string, HeaderColumn (+9 more)

### Community 3 - "DashboardTabContent.tsx"
Cohesion: 0.05
Nodes (64): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+56 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "confirmDialog"
Cohesion: 0.05
Nodes (57): EvidenciaPhotoModal(), EvidenciaPhotoModalProps, PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab() (+49 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.17
Nodes (18): ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps, getTodayFormatted() (+10 more)

### Community 7 - "worker.js"
Cohesion: 0.06
Nodes (47): ref_node_http, candidateEnvPaths, { createProcessorClient }, { createTibDailyScheduler, createTibDailySync, TIB_API_DEFAULT_URL }, crypto, deleteFromR2(), downloadFromR2(), fs (+39 more)

### Community 8 - "getSupabaseAdmin"
Cohesion: 0.11
Nodes (31): dynamic, POST(), dynamic, GET(), POST(), FuenteTibOpcion, GET(), DELETE() (+23 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.13
Nodes (17): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomPdfViewerPanel() (+9 more)

### Community 10 - "guards.ts"
Cohesion: 0.16
Nodes (16): GET(), POST(), requireAdmin(), RESTORABLE_MODULES, GET(), POST(), POST(), dynamic (+8 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.13
Nodes (32): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosA4TabProps, RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown() (+24 more)

### Community 12 - "dialog.ts"
Cohesion: 0.15
Nodes (18): DialogProvider(), GlobalDialogModal(), GlobalDialogModalProps, VARIANT_COLORS, VARIANT_ICONS, AlertDialogOptions, ConfirmDialogOptions, DialogItem (+10 more)

### Community 13 - "wr-matching.ts"
Cohesion: 0.13
Nodes (37): FilaCruzarInput, FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero() (+29 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "SmoothScrollManager"
Cohesion: 0.05
Nodes (31): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, ToastProvider(), ToastContainer() (+23 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.09
Nodes (37): POST, AnalyzeShalomSchema, POST, ExtractDniSchema, POST, ParseRotuloSchema, POST, AiUsageRecord (+29 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.12
Nodes (23): TableSkeleton(), AuditoriaTab(), AuditRecord, InventoryTable(), KardexView(), KardexViewProps, exportClientesToExcel(), exportCobrosToExcel() (+15 more)

### Community 18 - "inventario-jobs/route.ts"
Cohesion: 0.15
Nodes (17): GET, handleGet(), handlePost(), isXlsxKey(), POST, purgeCompletedAndStaleJobs(), SOURCE_KEY_FIELD, VALID_SOURCES (+9 more)

### Community 19 - "paquetes.schema.ts"
Cohesion: 0.11
Nodes (18): LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, AssignShelfSchema, CreatePaqueteInput, CreatePaqueteSchema, EstadoEntregaSchema (+10 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.08
Nodes (29): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP, ButtonProps, SIZE_MAP, VARIANT_MAP (+21 more)

### Community 22 - "dependencies"
Cohesion: 0.22
Nodes (9): html5-qrcode, dependencies, html5-qrcode, read-excel-file, resend, @supabase/supabase-js, read-excel-file, resend (+1 more)

### Community 23 - "HalloweenBackdrop.tsx"
Cohesion: 0.13
Nodes (20): LoginPage(), createBatSprite(), createGhostSprite(), createHarvestMoonSprite(), createHorizonSprite(), createNightCloudSprite(), createPumpkinSprite(), createSkullSprite() (+12 more)

### Community 24 - "alertDialog"
Cohesion: 0.13
Nodes (18): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, ShalomEditModal(), CobroDeliveryModalContent(), CobroPaymentModalContent(), CobrosExcelImporterModalContent(), ManifestDetailRow (+10 more)

### Community 25 - "types/index.ts"
Cohesion: 0.07
Nodes (28): InventoryTableProps, RowActionsDropdown(), RowActionsDropdownProps, InventoryPagination, UseInventoryQueryOptions, ConfirmDeliveryModal(), ConfirmDeliveryModalProps, copyPackagesTableAsImage() (+20 more)

### Community 26 - "shalom.service.ts"
Cohesion: 0.31
Nodes (10): ShalomKpiGrid(), ShalomKpiGridProps, ShalomUploadModalProps, FetchBoletasResponse, shalomService, DEFAULT_FORM, FormFields, StatsState (+2 more)

### Community 27 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint, devDependencies, eslint, supabase, @types/node, @types/react-dom, typescript, @typescript/native (+5 more)

### Community 28 - "invoiceLayoutAndExport.test.ts"
Cohesion: 0.14
Nodes (32): InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps, useInvoice() (+24 more)

### Community 29 - "Paquete"
Cohesion: 0.09
Nodes (29): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, useSmoothScroll(), ConfiguracionTabProps, InventoryTab(), InventoryTabProps, UseInventoryDataProps (+21 more)

### Community 30 - "worker/package.json"
Cohesion: 0.13
Nodes (14): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+6 more)

### Community 31 - "components/AdminUsersTab.tsx"
Cohesion: 0.06
Nodes (47): DashboardPage(), Sidebar(), SidebarProps, AdminUsersTab(), AdminUsersTabProps, AVATAR_GRADIENTS, CATEGORY_LABELS, countActiveModules() (+39 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "r2/client.ts"
Cohesion: 0.26
Nodes (12): dynamic, GET(), POST(), SLOTS, dynamic, GET(), getEnv(), getR2Client() (+4 more)

### Community 34 - "InventoryToolbar.tsx"
Cohesion: 0.22
Nodes (14): InventoryFilterBar(), InventoryFilterBarProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryToolbar(), InventoryToolbarProps, useInventoryData(), DateFilterState (+6 more)

### Community 35 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, dev, dev:https, doctor, lint, local, security-check (+8 more)

### Community 36 - "gen-certs.mjs"
Cohesion: 0.40
Nodes (3): certDir, certPath, keyPath

### Community 37 - "whatsappGenerator.ts"
Cohesion: 0.50
Nodes (3): generateDriverWhatsAppUrl(), sanitizePeruvianPhoneNumber(), WhatsAppMessageParams

### Community 38 - "AmexInventoryProcessor.csproj"
Cohesion: 0.50
Nodes (3): net8.0, DocumentFormat.OpenXml (3.3.0), Microsoft.NET.Sdk

### Community 39 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 40 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, outputDirectory, version

### Community 44 - "local-doctor.mjs"
Cohesion: 0.22
Nodes (7): ref_node_child_process, checks, commandAvailable(), localCommandAvailable(), root, createProcessorClient(), { spawn }

### Community 45 - "benchmark-comparativo-completo.mjs"
Cohesion: 0.10
Nodes (28): DELETE(), GET(), getLimaDateString(), POST(), TibTipo, mapEstadoEntrega(), normalizeKey(), ParsedRow (+20 more)

### Community 46 - "batch-sync/route.ts"
Cohesion: 0.29
Nodes (9): GET(), mapPaqueteRow(), POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, validateBody() (+1 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "request-context.ts"
Cohesion: 0.17
Nodes (19): ApiHandler, withErrorHandler(), ApiErrorSchema, apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders(), CONTRACT_VERSION_HEADER (+11 more)

### Community 49 - "Program.cs"
Cohesion: 0.15
Nodes (13): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, system_diagnostics, system_globalization, system_io_compression, system_text, system_text_json, system_xml (+5 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_fs"
Cohesion: 0.07
Nodes (21): ref_node_fs, ref_node_os, ref_node_path, invHeaders, invRows, outDir, envContent, supabase (+13 more)

### Community 53 - "app/page.tsx"
Cohesion: 0.14
Nodes (25): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPackageModal(), NewPackageModalProps (+17 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "cruzar-planilla/route.ts"
Cohesion: 0.07
Nodes (48): aNumero(), construirIndiceMultiestado(), CruzarPlanillaSchema, dynamic, enriquecerConSupabasePaquetes(), enriquecerConTibApiEnVivo(), esKeyValida(), indiceKeyPara() (+40 more)

### Community 56 - "cobros/types.ts"
Cohesion: 0.21
Nodes (13): CobrosKpiCardsProps, CobrosList(), CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, CobrosService, features_cobros_types_cliente (+5 more)

### Community 57 - "matchesFuzzySearch"
Cohesion: 0.44
Nodes (7): useCobrosData(), useVoucherForm(), cleanAlphanumeric(), extractDigits(), matchesFuzzySearch(), normalizeText(), stripLeadingZeros()

### Community 58 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 61 - "syncTibToPortal.ts"
Cohesion: 0.26
Nodes (10): getEstadoVisiblePortal(), PaqueteSyncData, syncPackagesToClientPortal(), ADMIN_MASTER_EMAIL, cleanExactString(), fetchTibStatus(), getEstadoVisiblePortal(), RawTibItem (+2 more)

### Community 62 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 64 - "✈️ SISTEMA AMEX COURIER - Plataforma Logística Integrada v2.0"
Cohesion: 0.33
Nodes (5): ⚡ Comandos Rápidos, 🗄️ Esquema de Base de Datos en Supabase PostgreSQL (12 Tablas Activas), 🏛️ Estructura del Proyecto, ✈️ SISTEMA AMEX COURIER - Plataforma Logística Integrada v2.0, 🔐 Variables de entorno

### Community 65 - "Procesador AMEX con Open XML"
Cohesion: 0.33
Nodes (5): Compilar/publicar para Windows x64, Contrato del procesador, Límites y validaciones, Procesador AMEX con Open XML, Regla de datos

### Community 66 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 67 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 68 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 75 - "live-sheets/types.ts"
Cohesion: 0.05
Nodes (77): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, FormulaBarProps, features_live_sheets_components_live_sheets, formatStatNumber() (+69 more)

### Community 76 - "Desarrollo local"
Cohesion: 0.33
Nodes (5): Arranque seguro, Desarrollo local, Estado inicial, Verificación, Worker y procesador C#

### Community 77 - "Contratos y límites de integración"
Cohesion: 0.40
Nodes (4): Contratos y límites de integración, Reglas, Servicios, Versión actual

### Community 78 - "Servicios internos de procesamiento"
Cohesion: 0.40
Nodes (4): Contrato operativo, Responsabilidades, Servicios internos de procesamiento, Verificación

### Community 79 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 81 - "tib-daily-sync.js"
Cohesion: 0.13
Nodes (19): createTibDailyScheduler(), createTibDailySync(), crypto, { DeleteObjectCommand, PutObjectCommand }, generateTibXlsxBuffer(), getLimaDateString(), getLimaParts(), isPastLimaRunTime() (+11 more)

### Community 82 - "tib-mirror-daemon.mjs"
Cohesion: 0.16
Nodes (14): cleanExactString(), daemonWrStatusCache, __dirname, __filename, getEstadoVisiblePortal(), intervalId, normalizeTibWr(), notifyClientDeliveredPackage() (+6 more)

### Community 84 - "test-api-scanner-batch.mjs"
Cohesion: 0.33
Nodes (3): adminSupabase, envContent, serviceKey

### Community 85 - "Python Visualization Code Patterns"
Cohesion: 0.08
Nodes (23): Accessibility Checklist, Accessibility Considerations, Accuracy, Bar Chart (Comparison), Chart Selection Guide, Choose by Data Relationship, Color, Color Blindness (+15 more)

### Community 86 - "test-credentials.js"
Cohesion: 0.20
Nodes (20): env, fs, http, https, main(), net, path, recordResult() (+12 more)

### Community 87 - "ClipboardCopyDropdown.tsx"
Cohesion: 0.26
Nodes (12): ClipboardCopyDropdown(), ClipboardCopyDropdownProps, dropdownButtonStyle, iconBoxStyle(), copyTextToClipboard(), formatClientAndWrHyphen(), formatClientAndWrTabbed(), formatClientWrAndLocation() (+4 more)

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 93 - "KPI Dashboard Design"
Cohesion: 0.11
Nodes (17): 1. KPI Framework, 2. SMART KPIs, 3. Dashboard Hierarchy, Alert thresholds fire constantly, team ignores them, Best Practices, Core Concepts, Dashboard shows green but product team reports users complaining, Detailed worked examples and patterns (+9 more)

### Community 94 - "Cliente"
Cohesion: 0.18
Nodes (13): CobrosDailySheetViewProps, Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, DirectorioClientesTabProps, Clientes360View, DirectorioClientesView(), DirectorioClientesViewProps (+5 more)

### Community 95 - "withApi.ts"
Cohesion: 0.20
Nodes (15): POST(), formatZodError(), validateQuery(), ApiHandler, ApiHandlerContext, withApi(), WithApiOptions, apiError (+7 more)

### Community 97 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.25
Nodes (12): RegistrarCobroDiarioModal(), RegistrarCobroDiarioModalContent(), RegistrarCobroDiarioModalProps, WrItemDraft, CotizacionKambista, extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow (+4 more)

### Community 98 - "parseWarehouseLocation"
Cohesion: 0.18
Nodes (12): mapPaqueteDbRow(), isLevelLessLocation(), LEVEL_LESS_LOCATIONS, LevelLessLocation, normalizeWarehouseLocation(), ParsedWarehouseLocation, parseWarehouseLocation(), BatchSyncScannerInput (+4 more)

### Community 101 - "Despliegue en VPS (Hostinger / Ubuntu)"
Cohesion: 0.33
Nodes (5): Despliegue en VPS (Hostinger / Ubuntu), Endpoints, Motor Python de Digitalización de Manifiestos TIB Courier, Opción 1: Con Docker (Recomendado), Opción 2: Con Python venv directo

### Community 102 - "extract_table_rows"
Cohesion: 0.50
Nodes (3): extract_table_rows(), ndarray, Detecta la tabla principal en la página utilizando operaciones morfológicas y…

### Community 103 - "sync-vercel-envs.mjs"
Cohesion: 0.20
Nodes (7): envsToSync, lines, localEnv, projectId, teamId, token, vercelEnvContent

### Community 105 - "uploadFileToR2"
Cohesion: 0.40
Nodes (13): POST(), detectAndDeskew(), maxDuration, POST(), POST(), uploadFileToR2(), buildDniPath(), buildEntregaPath() (+5 more)

### Community 109 - "useInventoryData.ts"
Cohesion: 0.14
Nodes (20): ConfiguracionTab(), GestorAlmacenView(), GestorAlmacenViewProps, InventorySubTabsProps, ShelfMatrixGridProps, EditPositionModal(), EditPositionModalProps, ShelfPositionModal() (+12 more)

### Community 110 - "InventoryHeader.tsx"
Cohesion: 0.13
Nodes (16): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, InventoryHeader(), InventoryHeaderProps, InventoryStatsCards(), InventoryStatsCardsProps (+8 more)

### Community 113 - "Logger"
Cohesion: 0.20
Nodes (4): GET(), LogEntry, Logger, LogLevel

### Community 114 - "MobileScannerModal.tsx"
Cohesion: 0.08
Nodes (25): BarcodeBoundingBox, BarcodeDetectorLike, CameraDeviceOption, createWasmBarcodeDetector(), HTML5_QRCODE_FORMATS, MobileScannerModal(), MobileScannerModalProps, ScannerEngineType (+17 more)

### Community 116 - "getOrSyncCachedTibFile"
Cohesion: 0.31
Nodes (11): bootWarmUpTibIndices(), cruzarFilasCobros(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath(), readCgroup() (+3 more)

### Community 117 - "Common KPIs by Department"
Cohesion: 0.14
Nodes (13): Common KPIs by Department, Dashboard Layout Patterns, Finance KPIs, Implementation Patterns, kpi-dashboard-design — detailed worked examples, Marketing KPIs, Pattern 1: Executive Summary, Pattern 2: SaaS Metrics Dashboard (+5 more)

### Community 119 - "ref_fs"
Cohesion: 0.15
Nodes (7): ref_fs, env, supabase, envContent, matchKey, envContent, matchKey

### Community 120 - "useCobrosOperaciones.ts"
Cohesion: 0.11
Nodes (33): CobroDeliveryModal(), CobroDeliveryModalProps, CobroPaymentModal(), CobroPaymentModalProps, CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES, ExcelCobrosParser, SheetParseResult (+25 more)

### Community 122 - "components/InfoAmexTab.tsx"
Cohesion: 0.32
Nodes (7): features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 123 - ".ReadRowValues"
Cohesion: 0.26
Nodes (5): HeaderInfo, IEnumerable, List, WorksheetPart, XElement

### Community 124 - "sendEmail"
Cohesion: 0.07
Nodes (39): dynamic, POST(), GET(), POST(), requireAdmin(), sendCollaboratorActivationEmail(), dynamic, getDeviceSummary() (+31 more)

### Community 125 - ".WarmUpSources"
Cohesion: 0.24
Nodes (5): Action, CachedSourceData, SharedStringTablePart, WorkbookPart, WorksheetInfo

### Community 126 - "analyze-oct-week.mjs"
Cohesion: 0.29
Nodes (7): downloadR2Buffer(), env, envContent, envPath, r2AccountId, run(), s3

### Community 127 - "security-check.mjs"
Cohesion: 0.15
Nodes (9): ref_path, envConfig, getStagedOrTrackedFiles(), IGNORE_DIRS, IGNORE_FILES, runCheck(), SECRET_PATTERNS, OFFICIAL_ROLES (+1 more)

### Community 129 - "check-vercel-envs.mjs"
Cohesion: 0.29
Nodes (4): envContent, projectId, teamId, token

### Community 131 - "test-admin-capabilities.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabaseAdmin

### Community 132 - "test-generate-link.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabaseAdmin

### Community 133 - ".PatchInventory"
Cohesion: 0.33
Nodes (3): CellData, Dictionary, PatchCounts

### Community 135 - "shalom-boletas/route.ts"
Cohesion: 0.48
Nodes (5): GET(), POST(), sanitizeFileNamePart(), uploadShalomBoletaFile(), uploadShalomBoletaPdf()

### Community 137 - "ProcessorDaemon"
Cohesion: 0.27
Nodes (6): Func, HttpListenerContext, HttpListenerResponse, JsonSerializerOptions, string, ProcessorDaemon

### Community 144 - "extraer-clientes-tib.mjs"
Cohesion: 0.67
Nodes (3): env, fetchStatus(), main()

### Community 146 - "tarifas/route.ts"
Cohesion: 0.43
Nodes (7): BUCKET_NAME, dynamic, GET(), getR2Client(), loadTarifasFromCloud(), POST(), saveTarifasToCloud()

### Community 147 - "analisis-clientes.mjs"
Cohesion: 0.29
Nodes (5): cleanedMap, containAmex, data, duplicates, notContainAmex

### Community 148 - ".CopyXmlNode"
Cohesion: 0.40
Nodes (3): Stream, XmlReader, XmlWriter

### Community 150 - "CachedSourceData"
Cohesion: 0.40
Nodes (4): DateTime, SourceRecord, WorkbookValidation, CachedSourceData

### Community 161 - "supabase/client.ts"
Cohesion: 0.14
Nodes (18): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), ActaCloudService, InvoiceCloudService, formatOperatorName() (+10 more)

### Community 167 - "inspect-usuarios.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabase

### Community 171 - "components/CobrosTab.tsx"
Cohesion: 0.22
Nodes (8): CobrosDailySheetView(), CobrosExcelImporterModal(), CobrosTab(), DirectorioClientesTab(), useCobrosOperaciones(), VoucherViewerModal(), VoucherViewerModalProps, CobrosTabProps

### Community 175 - "Q: ANALIZA ESTOS 2 PROYECTOS QUE TENGO ACTUALMENTE EN GENERAL, HACIENDO UN ANALISIS PROFESIONAL A LA ESTRUCTURA EN GENERAL COMO FUNCIONA CUAL ES SU MODELO DE NEGOCIO QUE VENTAJAS TIENE ETC ANALIZANDO LOS GRAPHIFY ETC"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ANALIZA ESTOS 2 PROYECTOS QUE TENGO ACTUALMENTE EN GENERAL, HACIENDO UN ANALISIS PROFESIONAL A LA ESTRUCTURA EN GENERAL COMO FUNCIONA CUAL ES SU MODELO DE NEGOCIO QUE VENTAJAS TIENE ETC ANALIZANDO LOS GRAPHIFY ETC, Source Nodes

### Community 176 - "Q: analiza todo y dime todos los servicios que se estan utilizando actualmetne por ejemplo vercel supabase sentry hostinger etc, listame todos"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: analiza todo y dime todos los servicios que se estan utilizando actualmetne por ejemplo vercel supabase sentry hostinger etc, listame todos, Source Nodes

### Community 177 - "Q: puedes ayudarme a hacer una migracion profesional de archivos y datos de R2 al nuevo Cloudflare de amexcourier sin perder nada; que necesitas para realizar todo el cambio?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: puedes ayudarme a hacer una migracion profesional de archivos y datos de R2 al nuevo Cloudflare de amexcourier sin perder nada; que necesitas para realizar todo el cambio?, Source Nodes

### Community 178 - "Q: puedes restaurarlos?, y modificar el codigo para que proxima vez o el sistema no tenga relaciones con el inventario de wrs ? ya que el modulo de despachos y rutas es aparte y no debe tener relacion con el inventario modulo 3 aunque tenga wrs del modulo 3 el modulo 16"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: puedes restaurarlos?, y modificar el codigo para que proxima vez o el sistema no tenga relaciones con el inventario de wrs ? ya que el modulo de despachos y rutas es aparte y no debe tener relacion con el inventario modulo 3 aunque tenga wrs del modulo 3 el modulo 16, Source Nodes

### Community 180 - "Q: Conectarse al VPS con las credenciales de .env.local, migrar el worker a la nueva cuenta Cloudflare R2, mejorar y publicar el código en producción"
Cohesion: 0.50
Nodes (3): Answer, Q: Conectarse al VPS con las credenciales de .env.local, migrar el worker a la nueva cuenta Cloudflare R2, mejorar y publicar el código en producción, Source Nodes

### Community 181 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **709 isolated node(s):** `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema`, `ParseRotuloSchema`, `RESTORABLE_MODULES` (+704 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `testCloudflare()` (2× useful, score=1.963204704) _(code changed — re-verify)_
- `tib-mirror-daemon.mjs` (2× useful, score=1.962228135) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `DashboardTabContent.tsx`, `useFormatoEntrega.ts`, `excelExport.ts`, `types/index.ts`, `components/AdminUsersTab.tsx`, `supabase/client.ts`, `InventoryToolbar.tsx`, `components/CobrosTab.tsx`, `batch-sync/route.ts`, `app/page.tsx`, `cobros/types.ts`, `matchesFuzzySearch`, `live-sheets/types.ts`, `scanner.ts`, `ClipboardCopyDropdown.tsx`, `Cliente`, `useInventoryData.ts`, `InventoryHeader.tsx`, `MobileScannerModal.tsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `getSupabaseAdmin()` connect `getSupabaseAdmin` to `constants.ts`, `uploadFileToR2`, `guards.ts`, `benchmark-comparativo-completo.mjs`, `batch-sync/route.ts`, `analyzer.ts`, `inventario-jobs/route.ts`, `cruzar-planilla/route.ts`, `sendEmail`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `alertDialog()` connect `alertDialog` to `confirmDialog`, `components/BoletasShalomTab.tsx`, `dialog.ts`, `excelExport.ts`, `types/index.ts`, `shalom.service.ts`, `invoiceLayoutAndExport.test.ts`, `Paquete`, `supabase/client.ts`, `InventoryToolbar.tsx`, `app/page.tsx`, `cobros/types.ts`, `matchesFuzzySearch`, `live-sheets/types.ts`, `ClipboardCopyDropdown.tsx`, `RegistrarCobroDiarioModal.tsx`, `useInventoryData.ts`, `InventoryHeader.tsx`, `MobileScannerModal.tsx`, `useCobrosOperaciones.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema` to the rest of the system?**
  _709 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05877742946708464 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `DashboardTabContent.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052941176470588235 - nodes in this community are weakly interconnected._