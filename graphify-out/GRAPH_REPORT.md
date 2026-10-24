# Graph Report - sistema-amex-courier  (2026-10-24)

## Corpus Check
- 513 files · ~562,005 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2308 nodes · 5247 edges · 153 communities (128 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8ccab519`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- constants.ts
- components/DniMatrixTab.tsx
- Program
- components/LiveSheetsTab.tsx
- main.py
- phoneUtils.ts
- useFormatoEntrega.ts
- worker.js
- getSupabaseAdmin
- components/BoletasShalomTab.tsx
- useInvoice.ts
- components/RotulosA4Tab.tsx
- alertDialog
- ArmarPlanillaTab.tsx
- test-real-flow.mjs
- SmoothScrollManager
- analyzer.ts
- excelExport.ts
- package.json
- paquetes.schema.ts
- compilerOptions
- ui/index.ts
- dependencies
- HalloweenBackdrop.tsx
- SoundSynthesizer
- types/index.ts
- supabase/client.ts
- devDependencies
- useDashboardData.ts
- components/InventoryTab.tsx
- worker/package.json
- registry.ts
- What You Must Do When Invoked
- dashboard/types.ts
- dialog.ts
- scripts
- gen-certs.mjs
- whatsappGenerator.ts
- AmexInventoryProcessor.csproj
- next-env.d.ts
- vercel.json
- postcss.config.mjs
- ref_node_fs
- r2/client.ts
- app/page.tsx
- cleanup-test-data.mjs
- request-context.ts
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- parseWarehouseLocation
- Find Skills
- sync-inventario/route.ts
- cobros/types.ts
- components/ScannerTab.tsx
- graphify reference: extra exports and benchmark
- eslint.config.mjs
- FUENTE_VACIA_10bb5c65.md
- inventoryJobsWorkflow.test.ts
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
- components/AdminUsersTab.tsx
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- DashboardTabContent.tsx
- CobrosDailySheetView.tsx
- inventory/index.ts
- withApi.ts
- server
- cruzar-planilla/route.ts
- test-credentials.js
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- inventario-jobs/route.ts
- getR2ViewUrl
- components/InfoAmexTab.tsx
- Cliente
- batch-sync/route.ts
- components/InventarioJobsTab.tsx
- RegistrarCobroDiarioModal.tsx
- Paquete
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- uploadFileToR2
- useDashboardNavigation.ts
- useInventoryData.ts
- ExcelExportDropdown.tsx
- scannerRelocationAndSecurity.test.ts
- test-scanner-interruption.mjs
- Logger
- scanner.ts
- next_types_root_params_d
- next_types_routes_d
- ref_fs
- useCobrosOperaciones.ts
- read-excel-file
- .ReadRowValues
- getPortalAdmin
- .WarmUpSources
- analyze-oct-week.mjs
- check-vercel-envs.mjs
- inspect-usuarios.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- .PatchInventory
- resend
- ProcessorDaemon
- tarifas/route.ts
- analisis-clientes.mjs
- .CopyXmlNode
- register
- CachedSourceData
- listado-amex/route.ts
- file-saver
- lucide-react
- @sentry/nextjs
- @supabase/ssr
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `Paquete` - 107 edges
2. `getSupabaseAdmin()` - 81 edges
3. `authorizeUser()` - 77 edges
4. `alertDialog()` - 61 edges
5. `Cliente` - 57 edges
6. `Program` - 50 edges
7. `confirmDialog()` - 37 edges
8. `supabase` - 29 edges
9. `SmoothScrollManager` - 25 edges
10. `DniSlotData` - 21 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `authorizeUser()`  [EXTRACTED]
  app/api/shalom-boletas/route.ts → lib/auth/guards.ts
- `NewPackageModalProps` --references--> `Cliente`  [EXTRACTED]
  components/modals/NewPackageModal.tsx → types/index.ts
- `PasteWrListModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/PasteWrListModal.tsx → types/index.ts
- `ThermalLabelModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/ThermalLabelModal.tsx → types/index.ts
- `ShalomPdfViewerPanelProps` --references--> `BoletaShalom`  [EXTRACTED]
  features/boletas-shalom/components/ShalomPdfViewerPanel.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (153 total, 25 thin omitted)

### Community 0 - "constants.ts"
Cohesion: 0.22
Nodes (15): POST(), GET, handleGet(), DashboardUser, AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired(), isSessionRevoked() (+7 more)

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (58): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+50 more)

### Community 2 - "Program"
Cohesion: 0.12
Nodes (17): int, long, object, CellData, CellKind, JsonSerializerOptions, string, HeaderColumn (+9 more)

### Community 3 - "components/LiveSheetsTab.tsx"
Cohesion: 0.06
Nodes (61): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, FormulaBar(), FormulaBarProps, features_live_sheets_components_live_sheets (+53 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.08
Nodes (40): DespachoRutasTab, ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal(), RutaBuilderModalProps, UsuarioChofer (+32 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.16
Nodes (20): FormatoEntregaTab, ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps (+12 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (39): ref_node_http, candidateEnvPaths, { createProcessorClient }, crypto, deleteFromR2(), downloadFromR2(), fs, fsp (+31 more)

### Community 8 - "getSupabaseAdmin"
Cohesion: 0.08
Nodes (43): GET(), POST(), requireAdmin(), GET(), POST(), requireAdmin(), RESTORABLE_MODULES, dynamic (+35 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.13
Nodes (26): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+18 more)

### Community 10 - "useInvoice.ts"
Cohesion: 0.17
Nodes (17): InvoicesTab, InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps (+9 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.13
Nodes (32): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosA4TabProps, RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown() (+24 more)

### Community 12 - "alertDialog"
Cohesion: 0.17
Nodes (14): CobroDeliveryModalContent(), CobroPaymentModalContent(), ConfiguracionTab(), ManifiestosTibTab, HeaderData, ManifestRow, ManifiestosTibTab(), ReconciliationData (+6 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "SmoothScrollManager"
Cohesion: 0.05
Nodes (31): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, ToastProvider(), ToastContainer() (+23 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.06
Nodes (53): dynamic, POST(), POST, AnalyzeShalomSchema, POST, ExtractDniSchema, POST, ParseRotuloSchema (+45 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.13
Nodes (21): TableSkeleton(), AuditoriaTab(), AuditRecord, AuditoriaTab, KardexView(), KardexViewProps, exportClientesToExcel(), exportCobrosToExcel() (+13 more)

### Community 18 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 19 - "paquetes.schema.ts"
Cohesion: 0.08
Nodes (23): LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, CreateInventarioJobInput, CreateInventarioJobSchema, PresignUploadInput, PresignUploadSchema (+15 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.12
Nodes (20): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP, ButtonProps, SIZE_MAP, VARIANT_MAP (+12 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/s3-request-presigner, docx, html5-qrcode, jspdf, jszip, lenis, next, openai (+21 more)

### Community 23 - "HalloweenBackdrop.tsx"
Cohesion: 0.08
Nodes (26): ClienteLoginPage(), ClientePortalItem, ESTADOS_DISPONIBLES, PaqueteTIB, TIPOS_EMPAQUE, LoginPage(), createBatSprite(), createGhostSprite() (+18 more)

### Community 25 - "types/index.ts"
Cohesion: 0.09
Nodes (22): InventoryPagination, UseInventoryQueryOptions, BatchStatusModal(), BatchStatusModalProps, BulkStatusByWrModal(), BulkStatusByWrModalProps, EditPackageModal(), EditPackageModalProps (+14 more)

### Community 26 - "supabase/client.ts"
Cohesion: 0.14
Nodes (20): ConfiguracionTabProps, ShelfPositionModal(), ShelfPositionModalProps, TransferModal(), TransferModalProps, BatchStatusChangeResult, inventoryService, SearchPaquetesServerSideParams (+12 more)

### Community 27 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, selfsigned, supabase, tailwindcss (+23 more)

### Community 28 - "useDashboardData.ts"
Cohesion: 0.38
Nodes (7): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), ScannerQueueCloudService, TipoMetodoEntrega

### Community 29 - "components/InventoryTab.tsx"
Cohesion: 0.09
Nodes (23): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, useSmoothScroll(), MAX_WIDTH_MAP, Modal(), ModalProps, InventoryTab() (+15 more)

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "registry.ts"
Cohesion: 0.12
Nodes (23): DashboardPage(), Sidebar(), SidebarProps, OperatorHubTab(), OperatorHubTabProps, COBROS_SUBMODULES, getAvailableModulesForUser(), getCobrosSubmoduleById() (+15 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "dashboard/types.ts"
Cohesion: 0.15
Nodes (24): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardHeader(), DashboardHeaderProps, DashboardTab(), ExecutiveKpiGrid() (+16 more)

### Community 34 - "dialog.ts"
Cohesion: 0.16
Nodes (16): DialogProvider(), GlobalDialogModal(), GlobalDialogModalProps, VARIANT_COLORS, VARIANT_ICONS, AlertDialogOptions, ConfirmDialogOptions, DialogItem (+8 more)

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, dev:https, doctor, lint, local, start (+6 more)

### Community 36 - "gen-certs.mjs"
Cohesion: 0.20
Nodes (6): ref_path, certDir, certPath, keyPath, OFFICIAL_ROLES, supabase

### Community 37 - "whatsappGenerator.ts"
Cohesion: 0.50
Nodes (3): generateDriverWhatsAppUrl(), sanitizePeruvianPhoneNumber(), WhatsAppMessageParams

### Community 38 - "AmexInventoryProcessor.csproj"
Cohesion: 0.50
Nodes (3): net8.0, DocumentFormat.OpenXml (3.3.0), Microsoft.NET.Sdk

### Community 40 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, outputDirectory, version

### Community 44 - "ref_node_fs"
Cohesion: 0.12
Nodes (11): ref_node_fs, invHeaders, invRows, outDir, checks, commandAvailable(), localCommandAvailable(), root (+3 more)

### Community 45 - "r2/client.ts"
Cohesion: 0.08
Nodes (40): dynamic, GET(), POST(), POST(), SLOTS, DELETE(), GET(), getLimaDateString() (+32 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.16
Nodes (16): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPkgFormData, DashboardTabContent() (+8 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.20
Nodes (8): ref_node_url, __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "request-context.ts"
Cohesion: 0.25
Nodes (14): ApiHandler, withErrorHandler(), ApiErrorSchema, apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders(), CONTRACT_VERSION_HEADER (+6 more)

### Community 49 - "Program.cs"
Cohesion: 0.15
Nodes (13): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, system_diagnostics, system_globalization, system_io_compression, system_text, system_text_json, system_xml (+5 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.13
Nodes (11): ref_node_path, envContent, supabase, supabaseKey, supabaseUrl, buf, data, filas (+3 more)

### Community 53 - "parseWarehouseLocation"
Cohesion: 0.15
Nodes (25): dynamic, GET(), POST(), NewPackageModal(), NewPackageModalProps, UBICACIONES_RAPIDAS, useDashboardActions(), mapPaqueteDbRow() (+17 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "sync-inventario/route.ts"
Cohesion: 0.10
Nodes (32): dynamic, maxDuration, POST(), dynamic, GET(), getLimaDateString(), maxDuration, POST() (+24 more)

### Community 56 - "cobros/types.ts"
Cohesion: 0.21
Nodes (13): CobrosKpiCardsProps, CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, VoucherViewerModalProps, CobrosService, features_cobros_types_cliente (+5 more)

### Community 57 - "components/ScannerTab.tsx"
Cohesion: 0.24
Nodes (11): useCobrosData(), useVoucherForm(), ScannerTab, formatOperatorName(), ScannerTab(), exportScannerLogsToExcel(), cleanAlphanumeric(), extractDigits() (+3 more)

### Community 58 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 61 - "inventoryJobsWorkflow.test.ts"
Cohesion: 0.22
Nodes (5): ref_node_child_process, ref_node_os, tmpDir, createProcessorClient(), { spawn }

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

### Community 75 - "components/AdminUsersTab.tsx"
Cohesion: 0.12
Nodes (16): AdminUsersTab(), AdminUsersTabProps, AVATAR_GRADIENTS, CATEGORY_LABELS, countActiveModules(), formatRelativeDate(), getAvatarGrad(), getAvatarInitials() (+8 more)

### Community 76 - "Desarrollo local"
Cohesion: 0.33
Nodes (5): Arranque seguro, Desarrollo local, Estado inicial, Verificación, Worker y procesador C#

### Community 77 - "Contratos y límites de integración"
Cohesion: 0.40
Nodes (4): Contratos y límites de integración, Reglas, Servicios, Versión actual

### Community 78 - "Servicios internos de procesamiento"
Cohesion: 0.40
Nodes (4): Contrato operativo, Responsabilidades, Servicios internos de procesamiento, Verificación

### Community 79 - "DashboardTabContent.tsx"
Cohesion: 0.11
Nodes (22): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+14 more)

### Community 81 - "CobrosDailySheetView.tsx"
Cohesion: 0.20
Nodes (10): CobroDeliveryModal(), CobroDeliveryModalProps, CobrosDailySheetView(), CobrosTab(), DirectorioClientesTab(), useCobrosOperaciones(), VoucherViewerModal(), TipoRetirante (+2 more)

### Community 82 - "inventory/index.ts"
Cohesion: 0.11
Nodes (16): GestorAlmacenView(), GestorAlmacenViewProps, InventoryHeader(), InventoryHeaderProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryStatsCards(), InventoryStatsCardsProps (+8 more)

### Community 83 - "withApi.ts"
Cohesion: 0.25
Nodes (13): GET(), mapPaqueteRow(), POST(), formatZodError(), validateBody(), validateQuery(), ApiHandler, ApiHandlerContext (+5 more)

### Community 84 - "server"
Cohesion: 0.27
Nodes (12): bootWarmUpTibIndices(), cruzarFilasCobros(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath(), readCgroup() (+4 more)

### Community 85 - "cruzar-planilla/route.ts"
Cohesion: 0.21
Nodes (17): aNumero(), construirIndiceMultiestado(), CruzarPlanillaSchema, dynamic, enriquecerConSupabasePaquetes(), enriquecerConTibApiEnVivo(), esKeyValida(), FilaCruzarInput (+9 more)

### Community 86 - "test-credentials.js"
Cohesion: 0.20
Nodes (20): env, fs, http, https, main(), net, path, recordResult() (+12 more)

### Community 87 - "ClipboardCopyDropdown.tsx"
Cohesion: 0.26
Nodes (12): ClipboardCopyDropdown(), ClipboardCopyDropdownProps, dropdownButtonStyle, iconBoxStyle(), copyTextToClipboard(), formatClientAndWrHyphen(), formatClientAndWrTabbed(), formatClientWrAndLocation() (+4 more)

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "inventario-jobs/route.ts"
Cohesion: 0.14
Nodes (18): GET, handleGet(), handlePost(), isXlsxKey(), POST, purgeCompletedAndStaleJobs(), SOURCE_KEY_FIELD, VALID_SOURCES (+10 more)

### Community 92 - "getR2ViewUrl"
Cohesion: 0.16
Nodes (13): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, ShalomPdfViewerPanel(), ShalomPdfViewerPanelProps (+5 more)

### Community 93 - "components/InfoAmexTab.tsx"
Cohesion: 0.32
Nodes (7): features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 94 - "Cliente"
Cohesion: 0.16
Nodes (14): CobrosDailySheetViewProps, Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, DirectorioClientesTabProps, Clientes360View, DirectorioClientesView(), DirectorioClientesViewProps (+6 more)

### Community 95 - "batch-sync/route.ts"
Cohesion: 0.16
Nodes (15): POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, cache, checkRateLimit(), lastCleanup (+7 more)

### Community 96 - "components/InventarioJobsTab.tsx"
Cohesion: 0.20
Nodes (9): InventarioJobsTab, formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState (+1 more)

### Community 97 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.25
Nodes (12): RegistrarCobroDiarioModal(), RegistrarCobroDiarioModalContent(), RegistrarCobroDiarioModalProps, WrItemDraft, CotizacionKambista, extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow (+4 more)

### Community 98 - "Paquete"
Cohesion: 0.12
Nodes (22): BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, InventoryTable(), InventoryTableProps, InventoryToolbar(), RowActionsDropdown(), RowActionsDropdownProps (+14 more)

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
Cohesion: 0.33
Nodes (15): POST(), POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), uploadFileToR2() (+7 more)

### Community 107 - "useDashboardNavigation.ts"
Cohesion: 0.36
Nodes (8): isDashboardTab(), useDashboardNavigation(), VALID_DASHBOARD_TABS, migrateLegacyHash(), PATH_TO_TAB, pathToTab(), TAB_TO_PATH, tabToPath()

### Community 109 - "useInventoryData.ts"
Cohesion: 0.40
Nodes (9): InventoryFilterBar(), InventoryFilterBarProps, DateFilterState, getDateFilterSummary(), initialDateFilter, isPackageInDateFilter(), MONTH_NAMES, resolveDateFilterRange() (+1 more)

### Community 110 - "ExcelExportDropdown.tsx"
Cohesion: 0.24
Nodes (10): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, buildClientSummary(), buildEnAlmacenReport(), ClientSummaryItem, EnAlmacenRow (+2 more)

### Community 112 - "test-scanner-interruption.mjs"
Cohesion: 0.40
Nodes (4): localQueue, resilientDB, resilientQueue, uploadedToDB

### Community 113 - "Logger"
Cohesion: 0.20
Nodes (4): GET(), LogEntry, Logger, LogLevel

### Community 114 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 119 - "ref_fs"
Cohesion: 0.12
Nodes (10): ref_fs, env, fetchStatus(), main(), env, supabase, envContent, matchKey (+2 more)

### Community 120 - "useCobrosOperaciones.ts"
Cohesion: 0.10
Nodes (32): CobroPaymentModal(), CobroPaymentModalProps, CobrosExcelImporterModal(), CobrosExcelImporterModalContent(), CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES, ExcelCobrosParser, SheetParseResult (+24 more)

### Community 123 - ".ReadRowValues"
Cohesion: 0.26
Nodes (5): HeaderInfo, IEnumerable, List, WorksheetPart, XElement

### Community 124 - "getPortalAdmin"
Cohesion: 0.13
Nodes (22): GET(), PUT(), POST(), POST(), dynamic, GET(), POST(), POST() (+14 more)

### Community 125 - ".WarmUpSources"
Cohesion: 0.22
Nodes (4): CachedSourceData, SharedStringTablePart, WorkbookPart, WorksheetInfo

### Community 126 - "analyze-oct-week.mjs"
Cohesion: 0.29
Nodes (7): downloadR2Buffer(), env, envContent, envPath, r2AccountId, run(), s3

### Community 129 - "check-vercel-envs.mjs"
Cohesion: 0.29
Nodes (4): envContent, projectId, teamId, token

### Community 130 - "inspect-usuarios.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabase

### Community 131 - "test-admin-capabilities.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabaseAdmin

### Community 132 - "test-generate-link.mjs"
Cohesion: 0.33
Nodes (3): envContent, serviceKey, supabaseAdmin

### Community 133 - ".PatchInventory"
Cohesion: 0.33
Nodes (3): CellData, Dictionary, PatchCounts

### Community 137 - "ProcessorDaemon"
Cohesion: 0.27
Nodes (6): Func, HttpListenerContext, HttpListenerResponse, JsonSerializerOptions, string, ProcessorDaemon

### Community 146 - "tarifas/route.ts"
Cohesion: 0.21
Nodes (12): BUCKET_NAME, dynamic, GET(), getR2Client(), loadTarifasFromCloud(), POST(), saveTarifasToCloud(), GET() (+4 more)

### Community 147 - "analisis-clientes.mjs"
Cohesion: 0.29
Nodes (5): cleanedMap, containAmex, data, duplicates, notContainAmex

### Community 148 - ".CopyXmlNode"
Cohesion: 0.40
Nodes (4): Action, Stream, XmlReader, XmlWriter

### Community 150 - "CachedSourceData"
Cohesion: 0.40
Nodes (4): DateTime, SourceRecord, WorkbookValidation, CachedSourceData

## Knowledge Gaps
- **600 isolated node(s):** `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema`, `ParseRotuloSchema`, `RESTORABLE_MODULES` (+595 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `excelExport.ts`, `types/index.ts`, `supabase/client.ts`, `useDashboardData.ts`, `components/InventoryTab.tsx`, `registry.ts`, `dashboard/types.ts`, `app/page.tsx`, `parseWarehouseLocation`, `cobros/types.ts`, `components/ScannerTab.tsx`, `DashboardTabContent.tsx`, `inventory/index.ts`, `withApi.ts`, `ClipboardCopyDropdown.tsx`, `Cliente`, `useInventoryData.ts`, `ExcelExportDropdown.tsx`, `scannerRelocationAndSecurity.test.ts`, `scanner.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `getSupabaseAdmin()` connect `getSupabaseAdmin` to `constants.ts`, `uploadFileToR2`, `r2/client.ts`, `analyzer.ts`, `withApi.ts`, `cruzar-planilla/route.ts`, `parseWarehouseLocation`, `sync-inventario/route.ts`, `inventario-jobs/route.ts`, `batch-sync/route.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `authorizeUser()` connect `getSupabaseAdmin` to `uploadFileToR2`, `r2/client.ts`, `tarifas/route.ts`, `withApi.ts`, `parseWarehouseLocation`, `sync-inventario/route.ts`, `inventario-jobs/route.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema` to the rest of the system?**
  _600 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05877742946708464 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `components/LiveSheetsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06233062330623306 - nodes in this community are weakly interconnected._