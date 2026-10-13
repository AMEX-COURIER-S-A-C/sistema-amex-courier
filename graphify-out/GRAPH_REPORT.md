# Graph Report - sistema-amex-courier  (2026-10-13)

## Corpus Check
- 418 files · ~349,067 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1893 nodes · 4223 edges · 126 communities (101 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f4cbf846`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- matchesFuzzySearch
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
- proxy.ts
- ArmarPlanillaTab.tsx
- test-real-flow.mjs
- components/AdminUsersTab.tsx
- analyzer.ts
- excelExport.ts
- package.json
- dashboard/types.ts
- compilerOptions
- ui/index.ts
- dependencies
- batch-sync/route.ts
- SoundSynthesizer
- types/index.ts
- useInventoryData.ts
- devDependencies
- components/InfoAmexTab.tsx
- EstanteriaPosicion
- worker/package.json
- registry.ts
- What You Must Do When Invoked
- DashboardTabContent.tsx
- SmoothScrollManager
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
- getR2ViewUrl
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- NewPackageModal.tsx
- Find Skills
- components/CobrosTab.tsx
- Cliente
- inventario-jobs/route.ts
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
- shalom-boletas/route.ts
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- Logger
- paquetes/route.ts
- Paquete
- openai
- constants.ts
- SyncTibModal.tsx
- components/InventarioJobsTab.tsx
- eslint-config-next
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- r2/client.ts
- manager.ts
- file-saver
- html5-qrcode
- read-excel-file
- write-excel-file
- auditoria/route.ts
- @typescript/native
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- SmoothScrollProvider.tsx
- upload/route.ts
- paquetes.schema.ts
- inventory/index.ts
- useDashboardNavigation.ts
- useInventoryQuery.ts
- MockElement
- Badge.tsx
- scanner.ts
- Button.tsx
- test-scanner-interruption.mjs
- MockElement
- cobros/types.ts
- next_types_root_params_d
- useCobrosOperaciones.ts
- InventoryFilterBar.tsx
- CobrosDailySheetView.tsx
- components/AuditoriaTab.tsx
- next_types_routes_d
- RegistrarCobroDiarioModal.tsx

## God Nodes (most connected - your core abstractions)
1. `Paquete` - 92 edges
2. `authorizeUser()` - 67 edges
3. `getSupabaseAdmin()` - 58 edges
4. `Cliente` - 53 edges
5. `Program` - 50 edges
6. `supabase` - 28 edges
7. `SmoothScrollManager` - 24 edges
8. `DniSlotData` - 20 edges
9. `getR2ViewUrl()` - 17 edges
10. `uploadFileToR2()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `authorizeUser()`  [EXTRACTED]
  app/api/shalom-boletas/route.ts → lib/auth/guards.ts
- `PasteWrListModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/PasteWrListModal.tsx → types/index.ts
- `ExcelExportDropdownProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/ExcelExportDropdown.tsx → types/index.ts
- `InventoryHeaderProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/InventoryHeader.tsx → types/index.ts
- `InventoryStatsCardsProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/InventoryStatsCards.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (126 total, 25 thin omitted)

### Community 0 - "matchesFuzzySearch"
Cohesion: 0.50
Nodes (7): useCobrosData(), useVoucherForm(), cleanAlphanumeric(), extractDigits(), matchesFuzzySearch(), normalizeText(), stripLeadingZeros()

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (61): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+53 more)

### Community 2 - "Program"
Cohesion: 0.07
Nodes (37): Action, CachedSourceData, CellData, DateTime, Dictionary, HeaderInfo, IEnumerable, int (+29 more)

### Community 3 - "components/LiveSheetsTab.tsx"
Cohesion: 0.05
Nodes (71): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, BarcodeBoundingBox, CameraDeviceOption, MobileScannerModal() (+63 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.12
Nodes (27): ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal(), RutaBuilderModalProps, useDespachoRutas(), ViewModeDespacho (+19 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.17
Nodes (19): ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps, getTodayFormatted() (+11 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (50): ref_node_http, bootWarmUpTibIndices(), candidateEnvPaths, { createProcessorClient }, cruzarFilasCobros(), crypto, downloadFromR2(), extractWrsFromCell() (+42 more)

### Community 8 - "authorizeUser"
Cohesion: 0.13
Nodes (29): FuenteTibOpcion, GET(), DELETE(), GET(), POST(), handleGet(), dynamic, GET() (+21 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.12
Nodes (28): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+20 more)

### Community 10 - "useInvoice.ts"
Cohesion: 0.18
Nodes (16): InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps, useInvoice() (+8 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.14
Nodes (31): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown(), RotulosSheetDropdownProps (+23 more)

### Community 12 - "proxy.ts"
Cohesion: 0.25
Nodes (15): ApiHandler, withErrorHandler(), apiError, ApiErrorSchema, apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders() (+7 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "components/AdminUsersTab.tsx"
Cohesion: 0.11
Nodes (17): AdminUsersTab(), AdminUsersTabProps, AVATAR_GRADIENTS, CATEGORY_LABELS, countActiveModules(), formatRelativeDate(), getAvatarGrad(), getAvatarInitials() (+9 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.15
Nodes (22): POST(), POST(), POST(), POST(), analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), DEFAULT_OPENAI_MODEL, DNI_JSON_SCHEMA (+14 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.15
Nodes (20): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, InventoryTable(), InventoryTableProps, exportClientesToExcel(), exportCobrosToExcel() (+12 more)

### Community 18 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 19 - "dashboard/types.ts"
Cohesion: 0.17
Nodes (21): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardTab, DashboardHeader(), DashboardHeaderProps, DashboardTab() (+13 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.24
Nodes (12): Input, InputProps, Select, SelectProps, Table, TableBody, TableCell, TableFooter (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (27): @aws-sdk/s3-request-presigner, docx, jspdf, jszip, lenis, lucide-react, next, dependencies (+19 more)

### Community 23 - "batch-sync/route.ts"
Cohesion: 0.15
Nodes (17): POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, getAuthenticatedUser(), cache, checkRateLimit() (+9 more)

### Community 25 - "types/index.ts"
Cohesion: 0.11
Nodes (25): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), BatchStatusModal(), BatchStatusModalProps, BulkStatusByWrModal() (+17 more)

### Community 26 - "useInventoryData.ts"
Cohesion: 0.20
Nodes (12): ShelfPositionModal(), ShelfPositionModalProps, inventoryService, SearchPaquetesServerSideParams, BatchShelfData, DateFilterType, InventoryStats, SinglePositionData (+4 more)

### Community 27 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, devDependencies, eslint, @playwright/test, selfsigned, supabase, tailwindcss, @tailwindcss/postcss (+21 more)

### Community 28 - "components/InfoAmexTab.tsx"
Cohesion: 0.32
Nodes (7): features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 29 - "EstanteriaPosicion"
Cohesion: 0.27
Nodes (6): GestorAlmacenView(), GestorAlmacenViewProps, ShelfMatrixGridProps, EditPositionModal(), EditPositionModalProps, EstanteriaPosicion

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "registry.ts"
Cohesion: 0.15
Nodes (22): DashboardPage(), Sidebar(), SidebarProps, OperatorHubTab(), OperatorHubTabProps, useDashboardSession(), COBROS_SUBMODULES, getAvailableModulesForUser() (+14 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "DashboardTabContent.tsx"
Cohesion: 0.09
Nodes (30): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+22 more)

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, dev:https, doctor, lint, local, start (+6 more)

### Community 36 - "gen-certs.mjs"
Cohesion: 0.20
Nodes (7): ref_fs, ref_path, certDir, certPath, keyPath, OFFICIAL_ROLES, supabase

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

### Community 45 - "benchmark-comparativo-completo.mjs"
Cohesion: 0.11
Nodes (26): DELETE(), GET(), getLimaDateString(), POST(), TibTipo, mapEstadoEntrega(), normalizeKey(), ParsedRow (+18 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.19
Nodes (13): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPkgFormData, DashboardTabContent() (+5 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.20
Nodes (8): ref_node_url, __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "getR2ViewUrl"
Cohesion: 0.14
Nodes (14): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, CobrosList(), ManifestDetailRow (+6 more)

### Community 49 - "Program.cs"
Cohesion: 0.10
Nodes (19): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, Func, HttpListenerContext, HttpListenerResponse, system_diagnostics, system_globalization, system_io_compression (+11 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.13
Nodes (11): ref_node_path, envContent, supabase, supabaseKey, supabaseUrl, buf, data, filas (+3 more)

### Community 53 - "NewPackageModal.tsx"
Cohesion: 0.33
Nodes (11): NewPackageModal(), UBICACIONES_RAPIDAS, useDashboardActions(), cleanWr(), getWrValidationError(), isValidWr(), smartFormatWr(), WR_LENGTH (+3 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "components/CobrosTab.tsx"
Cohesion: 0.22
Nodes (8): CobrosDailySheetView(), CobrosExcelImporterModal(), CobrosTab(), DirectorioClientesTab(), useCobrosOperaciones(), VoucherViewerModal(), VoucherViewerModalProps, CobrosTabProps

### Community 56 - "Cliente"
Cohesion: 0.22
Nodes (13): NewPackageModalProps, MobileScannerModalProps, DashboardTabContentProps, DashboardScanExtra, UseDashboardMetricsProps, DashboardTabProps, RotulosA4TabProps, ScannerTabProps (+5 more)

### Community 57 - "inventario-jobs/route.ts"
Cohesion: 0.14
Nodes (15): GET, handlePost(), isXlsxKey(), POST, SOURCE_KEY_FIELD, VALID_SOURCES, DbInventoryOptions, GeneratedInventory (+7 more)

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

### Community 79 - "Logger"
Cohesion: 0.24
Nodes (3): LogEntry, Logger, LogLevel

### Community 81 - "paquetes/route.ts"
Cohesion: 0.54
Nodes (6): GET(), mapPaqueteRow(), POST(), formatZodError(), validateBody(), validateQuery()

### Community 82 - "Paquete"
Cohesion: 0.10
Nodes (23): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, ConfiguracionTabProps, InventoryTabProps, UseInventoryDataProps, EditPackageModal(), EditPackageModalProps (+15 more)

### Community 84 - "constants.ts"
Cohesion: 0.21
Nodes (14): POST(), GET, handleGet(), AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired(), isSessionRevoked(), SESSION_MAX_AGE_MS (+6 more)

### Community 85 - "SyncTibModal.tsx"
Cohesion: 0.20
Nodes (10): MAX_WIDTH_MAP, Modal(), ModalProps, formatBytes(), JobProgress, SyncTibModal(), SyncTibModalProps, TIB_CONFIG (+2 more)

### Community 86 - "components/InventarioJobsTab.tsx"
Cohesion: 0.22
Nodes (8): formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState, uploadWithProgress()

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "r2/client.ts"
Cohesion: 0.14
Nodes (24): aNumero(), construirIndiceDesdeEnviado(), dynamic, esKeyValida(), FilaCruzarInput, indiceKeyPara(), leerIndice(), limpiar() (+16 more)

### Community 92 - "manager.ts"
Cohesion: 0.29
Nodes (6): LENIS_CONFIG, ManagedScroller, MODAL_BACKDROP_SELECTOR, PREVENT_ATTRIBUTE, SCROLL_ATTRIBUTE, SCROLL_SELECTOR

### Community 97 - "auditoria/route.ts"
Cohesion: 0.33
Nodes (8): GET(), POST(), requireAdmin(), GET(), POST(), requireAdmin(), RESTORABLE_MODULES, authorizeAdmin()

### Community 101 - "Despliegue en VPS (Hostinger / Ubuntu)"
Cohesion: 0.33
Nodes (5): Despliegue en VPS (Hostinger / Ubuntu), Endpoints, Motor Python de Digitalización de Manifiestos TIB Courier, Opción 1: Con Docker (Recomendado), Opción 2: Con Python venv directo

### Community 102 - "extract_table_rows"
Cohesion: 0.50
Nodes (3): extract_table_rows(), ndarray, Detecta la tabla principal en la página utilizando operaciones morfológicas y…

### Community 103 - "SmoothScrollProvider.tsx"
Cohesion: 0.22
Nodes (7): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, useSmoothScroll()

### Community 105 - "upload/route.ts"
Cohesion: 0.36
Nodes (14): POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), uploadFileToR2(), buildDniPath() (+6 more)

### Community 107 - "paquetes.schema.ts"
Cohesion: 0.08
Nodes (23): LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, CreateInventarioJobInput, CreateInventarioJobSchema, PresignUploadInput, PresignUploadSchema (+15 more)

### Community 109 - "inventory/index.ts"
Cohesion: 0.12
Nodes (16): InventoryHeader(), InventoryHeaderProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryStatsCards(), InventoryStatsCardsProps, InventorySubTabsProps, InventoryToolbar() (+8 more)

### Community 110 - "useDashboardNavigation.ts"
Cohesion: 0.36
Nodes (8): isDashboardTab(), useDashboardNavigation(), VALID_DASHBOARD_TABS, migrateLegacyHash(), PATH_TO_TAB, pathToTab(), TAB_TO_PATH, tabToPath()

### Community 111 - "useInventoryQuery.ts"
Cohesion: 0.20
Nodes (6): InventoryPagination, UseInventoryQueryOptions, parseAndMatchWrs(), parseBulkCodes(), parseLocation(), validateAndSimulateRelocation()

### Community 113 - "Badge.tsx"
Cohesion: 0.40
Nodes (5): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP

### Community 114 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 115 - "Button.tsx"
Cohesion: 0.40
Nodes (3): ButtonProps, SIZE_MAP, VARIANT_MAP

### Community 116 - "test-scanner-interruption.mjs"
Cohesion: 0.40
Nodes (4): localQueue, resilientDB, resilientQueue, uploadedToDB

### Community 118 - "cobros/types.ts"
Cohesion: 0.24
Nodes (11): CobrosKpiCardsProps, CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, CobrosService, CobrosMetrics, CobrosSubtab (+3 more)

### Community 120 - "useCobrosOperaciones.ts"
Cohesion: 0.10
Nodes (28): CobroDeliveryModal(), CobroDeliveryModalProps, CobroPaymentModal(), CobroPaymentModalProps, CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES, ExcelCobrosParser, SheetParseResult (+20 more)

### Community 121 - "InventoryFilterBar.tsx"
Cohesion: 0.39
Nodes (9): InventoryFilterBar(), InventoryFilterBarProps, DateFilterState, getDateFilterSummary(), initialDateFilter, isPackageInDateFilter(), MONTH_NAMES, resolveDateFilterRange() (+1 more)

### Community 122 - "CobrosDailySheetView.tsx"
Cohesion: 0.15
Nodes (17): CobrosDailySheetViewProps, Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, DirectorioClientesTabProps, Clientes360View, DirectorioClientesView(), DirectorioClientesViewProps (+9 more)

### Community 123 - "components/AuditoriaTab.tsx"
Cohesion: 0.21
Nodes (9): TableSkeleton(), AuditoriaTab(), AuditRecord, InventoryTab(), KardexView(), KardexViewProps, useInventoryData(), exportKardexToExcel() (+1 more)

### Community 125 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.29
Nodes (10): RegistrarCobroDiarioModalContent(), RegistrarCobroDiarioModalProps, WrItemDraft, extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow, parseExcelCobroBlock(), parseNumericValue() (+2 more)

## Knowledge Gaps
- **472 isolated node(s):** `RESTORABLE_MODULES`, `GET`, `dynamic`, `maxDuration`, `TibItem` (+467 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `excelExport.ts`, `dashboard/types.ts`, `types/index.ts`, `useInventoryData.ts`, `EstanteriaPosicion`, `registry.ts`, `DashboardTabContent.tsx`, `app/page.tsx`, `components/CobrosTab.tsx`, `Cliente`, `paquetes/route.ts`, `inventory/index.ts`, `useInventoryQuery.ts`, `scanner.ts`, `cobros/types.ts`, `CobrosDailySheetView.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `Cliente` connect `Cliente` to `DashboardTabContent.tsx`, `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useInventoryData.ts`, `useFormatoEntrega.ts`, `useInvoice.ts`, `components/RotulosA4Tab.tsx`, `app/page.tsx`, `excelExport.ts`, `Paquete`, `dashboard/types.ts`, `scanner.ts`, `NewPackageModal.tsx`, `cobros/types.ts`, `components/CobrosTab.tsx`, `types/index.ts`, `CobrosDailySheetView.tsx`, `RegistrarCobroDiarioModal.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `authorizeUser()` connect `authorizeUser` to `auditoria/route.ts`, `upload/route.ts`, `shalom-boletas/route.ts`, `benchmark-comparativo-completo.mjs`, `analyzer.ts`, `paquetes/route.ts`, `batch-sync/route.ts`, `inventario-jobs/route.ts`, `r2/client.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `RESTORABLE_MODULES`, `GET`, `dynamic` to the rest of the system?**
  _472 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05616605616605617 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Should `components/LiveSheetsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050505050505050504 - nodes in this community are weakly interconnected._