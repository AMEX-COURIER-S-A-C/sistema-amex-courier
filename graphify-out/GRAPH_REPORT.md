# Graph Report - sistema-amex-courier  (2026-10-19)

## Corpus Check
- 464 files · ~388,616 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2101 nodes · 4760 edges · 137 communities (116 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56bc34ec`
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
- authorizeUser
- components/BoletasShalomTab.tsx
- useInvoice.ts
- components/RotulosA4Tab.tsx
- alertDialog
- ArmarPlanillaTab.tsx
- test-real-flow.mjs
- toast.ts
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
- inventory.service.ts
- devDependencies
- components/InfoAmexTab.tsx
- resend.ts
- worker/package.json
- components/AdminUsersTab.tsx
- What You Must Do When Invoked
- DashboardTabContent.tsx
- useInventoryData.ts
- scripts
- gen-certs.mjs
- whatsappGenerator.ts
- AmexInventoryProcessor.csproj
- next-env.d.ts
- vercel.json
- postcss.config.mjs
- ref_node_fs
- benchmark-comparativo-completo.mjs
- app/page.tsx
- cleanup-test-data.mjs
- proxy.ts
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- parseWarehouseLocation
- Find Skills
- dashboard/types.ts
- cobros/types.ts
- SmoothScrollManager
- graphify reference: extra exports and benchmark
- eslint.config.mjs
- FUENTE_VACIA_10bb5c65.md
- local-doctor.mjs
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
- shalom-boletas/route.ts
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- selfsigned
- useCobrosOperaciones.ts
- Paquete
- Cliente
- server
- SyncTibModal.tsx
- processJob
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- r2/client.ts
- jspdf
- ExcelExportDropdown.tsx
- CobrosDailySheetView.tsx
- batch-sync/route.ts
- components/InventarioJobsTab.tsx
- RegistrarCobroDiarioModal.tsx
- manager.ts
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- upload/route.ts
- getR2ViewUrl
- inventory/index.ts
- matchesFuzzySearch
- MockElement
- inventario-jobs/route.ts
- Logger
- scanner.ts
- Badge.tsx
- Button.tsx
- CobroDeliveryModal.tsx
- MockElement
- ref_fs
- excel-cobros-parser.ts
- write-excel-file
- read-excel-file
- analyze-oct-week.mjs
- check-vercel-envs.mjs
- inspect-usuarios.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- react
- resend
- useDashboardData.ts

## God Nodes (most connected - your core abstractions)
1. `Paquete` - 103 edges
2. `authorizeUser()` - 69 edges
3. `getSupabaseAdmin()` - 62 edges
4. `alertDialog()` - 59 edges
5. `Cliente` - 53 edges
6. `Program` - 50 edges
7. `confirmDialog()` - 37 edges
8. `supabase` - 28 edges
9. `SmoothScrollManager` - 25 edges
10. `parseWarehouseLocation()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `authorizeUser()`  [EXTRACTED]
  app/api/shalom-boletas/route.ts → lib/auth/guards.ts
- `PasteWrListModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/PasteWrListModal.tsx → types/index.ts
- `CobroPaymentModalContent()` --calls--> `alertDialog()`  [EXTRACTED]
  features/cobros/components/CobroPaymentModal.tsx → lib/dialog.ts
- `CobrosExcelImporterModalContent()` --calls--> `alertDialog()`  [EXTRACTED]
  features/cobros/components/CobrosExcelImporterModal.tsx → lib/dialog.ts
- `ConfiguracionTabProps` --references--> `Paquete`  [EXTRACTED]
  features/configuracion/components/ConfiguracionTab.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (137 total, 21 thin omitted)

### Community 0 - "constants.ts"
Cohesion: 0.24
Nodes (14): POST(), POST(), GET, handleGet(), AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired(), isSessionRevoked() (+6 more)

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (61): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+53 more)

### Community 2 - "Program"
Cohesion: 0.07
Nodes (37): Action, CachedSourceData, CellData, DateTime, Dictionary, HeaderInfo, IEnumerable, int (+29 more)

### Community 3 - "components/LiveSheetsTab.tsx"
Cohesion: 0.06
Nodes (60): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, FormulaBar(), FormulaBarProps, features_live_sheets_components_live_sheets (+52 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.11
Nodes (32): ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal(), RutaBuilderModalProps, useDespachoRutas(), ViewModeDespacho (+24 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.15
Nodes (20): ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps, getTodayFormatted() (+12 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (27): ref_node_http, candidateEnvPaths, { createProcessorClient }, crypto, fs, fsp, http, os (+19 more)

### Community 8 - "authorizeUser"
Cohesion: 0.10
Nodes (39): GET(), POST(), requireAdmin(), RESTORABLE_MODULES, dynamic, POST(), FuenteTibOpcion, GET() (+31 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.12
Nodes (28): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+20 more)

### Community 10 - "useInvoice.ts"
Cohesion: 0.18
Nodes (16): InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps, useInvoice() (+8 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.14
Nodes (31): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown(), RotulosSheetDropdownProps (+23 more)

### Community 12 - "alertDialog"
Cohesion: 0.07
Nodes (39): PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, DialogProvider(), BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, GlobalDialogModal() (+31 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "toast.ts"
Cohesion: 0.12
Nodes (22): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, ToastProvider(), ToastContainer() (+14 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.15
Nodes (22): POST(), POST(), POST(), POST(), analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), DEFAULT_OPENAI_MODEL, DNI_JSON_SCHEMA (+14 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.24
Nodes (14): exportClientesToExcel(), exportCobrosToExcel(), exportEntregasToExcel(), exportHojaDeRutaToExcel(), exportLiquidacionesToExcel(), exportPaquetesToExcel(), exportPickingOrderToExcel(), exportScannerLogsToExcel() (+6 more)

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
Cohesion: 0.24
Nodes (12): Input, InputProps, Select, SelectProps, Table, TableBody, TableCell, TableFooter (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/s3-request-presigner, docx, file-saver, html5-qrcode, jszip, lenis, lucide-react, next (+21 more)

### Community 23 - "HalloweenBackdrop.tsx"
Cohesion: 0.21
Nodes (14): createBatSprite(), createGhostSprite(), createHarvestMoonSprite(), createHorizonSprite(), createNightCloudSprite(), createPumpkinSprite(), createSkullSprite(), createWitchSprite() (+6 more)

### Community 25 - "types/index.ts"
Cohesion: 0.07
Nodes (25): TableSkeleton(), AuditoriaTab(), AuditRecord, KardexView(), KardexViewProps, InventoryPagination, UseInventoryQueryOptions, exportKardexToExcel() (+17 more)

### Community 26 - "inventory.service.ts"
Cohesion: 0.12
Nodes (23): ConfiguracionTabProps, GestorAlmacenView(), GestorAlmacenViewProps, ShelfMatrixGridProps, EditPositionModal(), EditPositionModalProps, ShelfPositionModal(), ShelfPositionModalProps (+15 more)

### Community 27 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, supabase, tailwindcss (+23 more)

### Community 28 - "components/InfoAmexTab.tsx"
Cohesion: 0.32
Nodes (7): features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 29 - "resend.ts"
Cohesion: 0.12
Nodes (21): dynamic, POST(), GET(), POST(), requireAdmin(), dynamic, getDeviceSummary(), POST() (+13 more)

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "components/AdminUsersTab.tsx"
Cohesion: 0.05
Nodes (50): useSmoothScroll(), Sidebar(), SidebarProps, AdminUsersTab(), AdminUsersTabProps, AVATAR_GRADIENTS, CATEGORY_LABELS, countActiveModules() (+42 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "DashboardTabContent.tsx"
Cohesion: 0.09
Nodes (31): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+23 more)

### Community 34 - "useInventoryData.ts"
Cohesion: 0.19
Nodes (16): InventoryFilterBar(), InventoryFilterBarProps, InventoryHeader(), InventorySelectionBar(), InventorySelectionBarProps, InventoryToolbarProps, useInventoryData(), UseInventoryDataProps (+8 more)

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

### Community 39 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 40 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, outputDirectory, version

### Community 44 - "ref_node_fs"
Cohesion: 0.12
Nodes (11): ref_node_fs, invHeaders, invRows, outDir, adminSupabase, envContent, serviceKey, localQueue (+3 more)

### Community 45 - "benchmark-comparativo-completo.mjs"
Cohesion: 0.10
Nodes (28): DELETE(), GET(), getLimaDateString(), POST(), TibTipo, mapEstadoEntrega(), normalizeKey(), ParsedRow (+20 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.10
Nodes (25): LoginPage(), DashboardPage(), NewClientModal, NewPackageModal, PdfViewerModal, HeaderBar(), HeaderBarProps, NewClientFormData (+17 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "proxy.ts"
Cohesion: 0.21
Nodes (19): ApiHandler, withErrorHandler(), formatZodError(), validateBody(), validateQuery(), apiError, ApiErrorSchema, apiSuccess (+11 more)

### Community 49 - "Program.cs"
Cohesion: 0.10
Nodes (19): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, Func, HttpListenerContext, HttpListenerResponse, system_diagnostics, system_globalization, system_io_compression (+11 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.13
Nodes (11): ref_node_path, envContent, supabase, supabaseKey, supabaseUrl, buf, data, filas (+3 more)

### Community 53 - "parseWarehouseLocation"
Cohesion: 0.16
Nodes (22): dynamic, POST(), NewPackageModal(), UBICACIONES_RAPIDAS, useDashboardActions(), ProcessedSessionBatch, ScannerBulkLocationView(), ScannerBulkLocationViewProps (+14 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "dashboard/types.ts"
Cohesion: 0.17
Nodes (20): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardHeader(), DashboardHeaderProps, DashboardTab(), ExecutiveKpiGrid() (+12 more)

### Community 56 - "cobros/types.ts"
Cohesion: 0.17
Nodes (16): CobrosDailySheetView(), CobrosExcelImporterModal(), CobrosKpiCardsProps, CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, VoucherViewerModal() (+8 more)

### Community 58 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 61 - "local-doctor.mjs"
Cohesion: 0.15
Nodes (9): ref_node_child_process, ref_node_os, checks, commandAvailable(), localCommandAvailable(), root, tmpDir, createProcessorClient() (+1 more)

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

### Community 75 - "shalom-boletas/route.ts"
Cohesion: 0.48
Nodes (5): GET(), POST(), sanitizeFileNamePart(), uploadShalomBoletaFile(), uploadShalomBoletaPdf()

### Community 76 - "Desarrollo local"
Cohesion: 0.33
Nodes (5): Arranque seguro, Desarrollo local, Estado inicial, Verificación, Worker y procesador C#

### Community 77 - "Contratos y límites de integración"
Cohesion: 0.40
Nodes (4): Contratos y límites de integración, Reglas, Servicios, Versión actual

### Community 78 - "Servicios internos de procesamiento"
Cohesion: 0.40
Nodes (4): Contrato operativo, Responsabilidades, Servicios internos de procesamiento, Verificación

### Community 81 - "useCobrosOperaciones.ts"
Cohesion: 0.15
Nodes (15): CobroPaymentModal(), CobroPaymentModalContent(), CobroPaymentModalProps, CobrosTab(), DirectorioClientesTab(), DirectorioClientesTabProps, INITIAL_COBROS_LOTES, useCobrosOperaciones() (+7 more)

### Community 82 - "Paquete"
Cohesion: 0.10
Nodes (29): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, InventoryTabProps, InventoryTable(), InventoryTableProps, InventoryToolbar(), RowActionsDropdown() (+21 more)

### Community 83 - "Cliente"
Cohesion: 0.36
Nodes (9): NewPackageModalProps, DashboardTabContentProps, DashboardScanExtra, UseDashboardMetricsProps, DashboardTabProps, RotulosA4TabProps, Cliente, CobroVoucher (+1 more)

### Community 84 - "server"
Cohesion: 0.27
Nodes (12): bootWarmUpTibIndices(), cruzarFilasCobros(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath(), readCgroup() (+4 more)

### Community 85 - "SyncTibModal.tsx"
Cohesion: 0.20
Nodes (10): MAX_WIDTH_MAP, Modal(), ModalProps, formatBytes(), JobProgress, SyncTibModal(), SyncTibModalProps, TIB_CONFIG (+2 more)

### Community 86 - "processJob"
Cohesion: 0.24
Nodes (12): deleteFromR2(), downloadFromR2(), loop(), processJob(), sbFetch(), sbHeaders(), takeNextJob(), updateJob() (+4 more)

### Community 87 - "ClipboardCopyDropdown.tsx"
Cohesion: 0.26
Nodes (12): ClipboardCopyDropdown(), ClipboardCopyDropdownProps, dropdownButtonStyle, iconBoxStyle(), copyTextToClipboard(), formatClientAndWrHyphen(), formatClientAndWrTabbed(), formatClientWrAndLocation() (+4 more)

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "r2/client.ts"
Cohesion: 0.14
Nodes (24): aNumero(), construirIndiceDesdeEnviado(), dynamic, esKeyValida(), FilaCruzarInput, indiceKeyPara(), leerIndice(), limpiar() (+16 more)

### Community 93 - "ExcelExportDropdown.tsx"
Cohesion: 0.24
Nodes (10): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, buildClientSummary(), buildEnAlmacenReport(), ClientSummaryItem, EnAlmacenRow (+2 more)

### Community 94 - "CobrosDailySheetView.tsx"
Cohesion: 0.19
Nodes (16): CobrosDailySheetViewProps, Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, Clientes360View, DirectorioClientesView(), DirectorioClientesViewProps, RegistrarCobroDiarioModalProps (+8 more)

### Community 95 - "batch-sync/route.ts"
Cohesion: 0.15
Nodes (15): handleBatchSync(), isValidUuid(), POST, scannerLogger, getAuthenticatedUser(), cache, checkRateLimit(), lastCleanup (+7 more)

### Community 96 - "components/InventarioJobsTab.tsx"
Cohesion: 0.22
Nodes (8): formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState, uploadWithProgress()

### Community 97 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.26
Nodes (11): RegistrarCobroDiarioModal(), RegistrarCobroDiarioModalContent(), WrItemDraft, features_cobros_types_cliente, extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow, parseExcelCobroBlock() (+3 more)

### Community 98 - "manager.ts"
Cohesion: 0.29
Nodes (6): LENIS_CONFIG, ManagedScroller, MODAL_BACKDROP_SELECTOR, PREVENT_ATTRIBUTE, SCROLL_ATTRIBUTE, SCROLL_SELECTOR

### Community 101 - "Despliegue en VPS (Hostinger / Ubuntu)"
Cohesion: 0.33
Nodes (5): Despliegue en VPS (Hostinger / Ubuntu), Endpoints, Motor Python de Digitalización de Manifiestos TIB Courier, Opción 1: Con Docker (Recomendado), Opción 2: Con Python venv directo

### Community 102 - "extract_table_rows"
Cohesion: 0.50
Nodes (3): extract_table_rows(), ndarray, Detecta la tabla principal en la página utilizando operaciones morfológicas y…

### Community 103 - "sync-vercel-envs.mjs"
Cohesion: 0.20
Nodes (7): envsToSync, lines, localEnv, projectId, teamId, token, vercelEnvContent

### Community 105 - "upload/route.ts"
Cohesion: 0.36
Nodes (14): POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), uploadFileToR2(), buildDniPath() (+6 more)

### Community 107 - "getR2ViewUrl"
Cohesion: 0.33
Nodes (7): PdfViewerModal(), PdfViewerModalProps, CobrosList(), ManifestDetailRow, ManifiestosTibHistorial(), SavedManifest, getR2ViewUrl()

### Community 109 - "inventory/index.ts"
Cohesion: 0.21
Nodes (6): InventoryHeaderProps, InventoryStatsCards(), InventoryStatsCardsProps, InventorySubTabsProps, TibOperationsDropdown(), TibOperationsDropdownProps

### Community 110 - "matchesFuzzySearch"
Cohesion: 0.50
Nodes (7): useCobrosData(), useVoucherForm(), cleanAlphanumeric(), extractDigits(), matchesFuzzySearch(), normalizeText(), stripLeadingZeros()

### Community 112 - "inventario-jobs/route.ts"
Cohesion: 0.15
Nodes (17): GET, handleGet(), handlePost(), isXlsxKey(), POST, purgeCompletedAndStaleJobs(), SOURCE_KEY_FIELD, VALID_SOURCES (+9 more)

### Community 113 - "Logger"
Cohesion: 0.24
Nodes (3): LogEntry, Logger, LogLevel

### Community 114 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 115 - "Badge.tsx"
Cohesion: 0.40
Nodes (5): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP

### Community 116 - "Button.tsx"
Cohesion: 0.40
Nodes (3): ButtonProps, SIZE_MAP, VARIANT_MAP

### Community 117 - "CobroDeliveryModal.tsx"
Cohesion: 0.40
Nodes (5): CobroDeliveryModal(), CobroDeliveryModalContent(), CobroDeliveryModalProps, TipoRetirante, features_cobros_types_tiporetirante

### Community 119 - "ref_fs"
Cohesion: 0.22
Nodes (5): ref_fs, envContent, matchKey, envContent, matchKey

### Community 120 - "excel-cobros-parser.ts"
Cohesion: 0.18
Nodes (14): CobrosExcelImporterModalContent(), CobrosExcelImporterModalProps, ExcelCobrosParser, SheetParseResult, WorkbookParseResult, KambistaService, ClienteCobroLote, EstadoEntregaWR (+6 more)

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

### Community 144 - "useDashboardData.ts"
Cohesion: 0.57
Nodes (6): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), TipoMetodoEntrega

## Knowledge Gaps
- **544 isolated node(s):** `dynamic`, `RESTORABLE_MODULES`, `dynamic`, `GET`, `dynamic` (+539 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `authorizeUser`, `alertDialog`, `useDashboardData.ts`, `excelExport.ts`, `types/index.ts`, `inventory.service.ts`, `components/AdminUsersTab.tsx`, `DashboardTabContent.tsx`, `useInventoryData.ts`, `app/page.tsx`, `parseWarehouseLocation`, `dashboard/types.ts`, `cobros/types.ts`, `useCobrosOperaciones.ts`, `Cliente`, `ClipboardCopyDropdown.tsx`, `ExcelExportDropdown.tsx`, `inventory/index.ts`, `scanner.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `alertDialog()` connect `alertDialog` to `components/LiveSheetsTab.tsx`, `phoneUtils.ts`, `components/BoletasShalomTab.tsx`, `useInvoice.ts`, `excelExport.ts`, `SoundSynthesizer`, `types/index.ts`, `inventory.service.ts`, `useInventoryData.ts`, `parseWarehouseLocation`, `cobros/types.ts`, `useCobrosOperaciones.ts`, `Paquete`, `ClipboardCopyDropdown.tsx`, `ExcelExportDropdown.tsx`, `RegistrarCobroDiarioModal.tsx`, `getR2ViewUrl`, `inventory/index.ts`, `matchesFuzzySearch`, `CobroDeliveryModal.tsx`, `excel-cobros-parser.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Cliente` connect `Cliente` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `useInvoice.ts`, `components/RotulosA4Tab.tsx`, `alertDialog`, `useDashboardData.ts`, `excelExport.ts`, `types/index.ts`, `inventory.service.ts`, `DashboardTabContent.tsx`, `app/page.tsx`, `parseWarehouseLocation`, `dashboard/types.ts`, `cobros/types.ts`, `useCobrosOperaciones.ts`, `Paquete`, `CobrosDailySheetView.tsx`, `RegistrarCobroDiarioModal.tsx`, `scanner.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `dynamic`, `RESTORABLE_MODULES`, `dynamic` to the rest of the system?**
  _544 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05616605616605617 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Should `components/LiveSheetsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06327160493827161 - nodes in this community are weakly interconnected._