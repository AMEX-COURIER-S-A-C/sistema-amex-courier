# Graph Report - sistema-amex-courier  (2026-10-11)

## Corpus Check
- 414 files · ~338,224 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1874 nodes · 4146 edges · 114 communities (95 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c8046ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- matchesFuzzySearch
- components/DniMatrixTab.tsx
- Program
- components/LiveSheetsTab.tsx
- main.py
- supabase/client.ts
- useFormatoEntrega.ts
- worker.js
- authorizeUser
- components/BoletasShalomTab.tsx
- useCobrosOperaciones.ts
- components/RotulosA4Tab.tsx
- paquetes/route.ts
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
- InventoryFilterBar.tsx
- worker/package.json
- app/page.tsx
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
- server
- Cliente
- cleanup-test-data.mjs
- Logger
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- benchmark-comparativo-completo.mjs
- Find Skills
- CobrosDailySheetView.tsx
- apiContracts.test.ts
- inventario-jobs/route.ts
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
- cobros/types.ts
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- components/InventarioJobsTab.tsx
- eslint-config-next
- Paquete
- openai
- createClient
- validations.test.ts
- components/CobrosTab.tsx
- EstanteriaPosicion
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- r2/client.ts
- RegistrarCobroDiarioModal.tsx
- file-saver
- html5-qrcode
- read-excel-file
- write-excel-file
- components/AuditoriaTab.tsx
- @typescript/native
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- CobroPaymentModal.tsx
- upload/route.ts
- request-context.ts
- inventory/index.ts
- inventario-tib/route.ts
- test-vps-300-filas.mjs
- validate.ts
- LivePackagesStream.tsx

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

## Communities (114 total, 19 thin omitted)

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
Cohesion: 0.06
Nodes (59): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, FormulaBar(), FormulaBarProps, features_live_sheets_components_live_sheets (+51 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "supabase/client.ts"
Cohesion: 0.08
Nodes (39): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab() (+31 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.16
Nodes (20): FormatoEntregaTab, ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps (+12 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (36): ref_node_http, candidateEnvPaths, { createProcessorClient }, crypto, fs, fsp, http, loop() (+28 more)

### Community 8 - "authorizeUser"
Cohesion: 0.11
Nodes (34): GET(), POST(), requireAdmin(), GET(), POST(), requireAdmin(), RESTORABLE_MODULES, FuenteTibOpcion (+26 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.07
Nodes (43): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom (+35 more)

### Community 10 - "useCobrosOperaciones.ts"
Cohesion: 0.13
Nodes (20): CobroDeliveryModal(), CobroDeliveryModalProps, CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES, ExcelCobrosParser, SheetParseResult, WorkbookParseResult, features_cobros_types_clientecobrolote (+12 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.14
Nodes (31): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown(), RotulosSheetDropdownProps (+23 more)

### Community 12 - "paquetes/route.ts"
Cohesion: 0.16
Nodes (14): GET(), mapPaqueteRow(), POST(), AssignShelfSchema, CreatePaqueteInput, CreatePaqueteSchema, EstadoEntregaSchema, EstadoTibSchema (+6 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "components/AdminUsersTab.tsx"
Cohesion: 0.11
Nodes (18): AdminUsersTab(), AVATAR_GRADS, avatarGrad(), avatarInitials(), btnBlue, btnGreen, card, fmtDate() (+10 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.15
Nodes (22): POST(), POST(), POST(), POST(), analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), DEFAULT_OPENAI_MODEL, DNI_JSON_SCHEMA (+14 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.15
Nodes (21): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, InventoryTable(), InventoryTableProps, exportClientesToExcel(), exportCobrosToExcel() (+13 more)

### Community 18 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 19 - "dashboard/types.ts"
Cohesion: 0.17
Nodes (22): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardTab, DashboardHeader(), DashboardHeaderProps, DashboardTab() (+14 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.08
Nodes (30): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP, ButtonProps, SIZE_MAP, VARIANT_MAP (+22 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (27): @aws-sdk/s3-request-presigner, docx, jspdf, jszip, lenis, lucide-react, next, dependencies (+19 more)

### Community 23 - "batch-sync/route.ts"
Cohesion: 0.21
Nodes (13): POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, getAuthenticatedUser(), cache, checkRateLimit() (+5 more)

### Community 25 - "types/index.ts"
Cohesion: 0.12
Nodes (20): BatchStatusModal(), BatchStatusModalProps, BulkStatusByWrModal(), BulkStatusByWrModalProps, EditPackageModal(), EditPackageModalProps, BoletaShalomInput, DestinoRuta (+12 more)

### Community 26 - "useInventoryData.ts"
Cohesion: 0.15
Nodes (18): ConfiguracionTab, UseInventoryDataProps, ShelfPositionModal(), ShelfPositionModalProps, TransferModal(), TransferModalProps, inventoryService, SearchPaquetesServerSideParams (+10 more)

### Community 27 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, devDependencies, eslint, @playwright/test, selfsigned, supabase, tailwindcss, @tailwindcss/postcss (+21 more)

### Community 28 - "components/InfoAmexTab.tsx"
Cohesion: 0.28
Nodes (8): InfoAmexTab, features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 29 - "InventoryFilterBar.tsx"
Cohesion: 0.45
Nodes (8): InventoryFilterBar(), InventoryFilterBarProps, DateFilterState, getDateFilterSummary(), isPackageInDateFilter(), MONTH_NAMES, resolveDateFilterRange(), toLocalDateString()

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "app/page.tsx"
Cohesion: 0.07
Nodes (52): DashboardPage(), NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPackageModal() (+44 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "DashboardTabContent.tsx"
Cohesion: 0.10
Nodes (24): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+16 more)

### Community 34 - "SmoothScrollManager"
Cohesion: 0.07
Nodes (15): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, LENIS_CONFIG, ManagedScroller (+7 more)

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, dev:https, doctor, lint, local, start (+6 more)

### Community 36 - "gen-certs.mjs"
Cohesion: 0.29
Nodes (5): ref_fs, ref_path, certDir, certPath, keyPath

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
Cohesion: 0.17
Nodes (8): ref_node_fs, adminSupabase, envContent, serviceKey, localQueue, resilientDB, resilientQueue, uploadedToDB

### Community 45 - "server"
Cohesion: 0.23
Nodes (14): bootWarmUpTibIndices(), cruzarFilasCobros(), downloadFromR2(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath() (+6 more)

### Community 46 - "Cliente"
Cohesion: 0.07
Nodes (39): NewPackageModalProps, BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, InvoicesTab, ScannerTab, InvoiceControlPanel(), InvoiceControlPanelProps (+31 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "Logger"
Cohesion: 0.24
Nodes (3): LogEntry, Logger, LogLevel

### Community 49 - "Program.cs"
Cohesion: 0.10
Nodes (19): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, Func, HttpListenerContext, HttpListenerResponse, system_diagnostics, system_globalization, system_io_compression (+11 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.15
Nodes (8): ref_node_path, invHeaders, invRows, outDir, envContent, supabase, supabaseKey, supabaseUrl

### Community 53 - "benchmark-comparativo-completo.mjs"
Cohesion: 0.12
Nodes (22): POST(), mapEstadoEntrega(), normalizeKey(), ParsedRow, syncCompletedExcelToDatabase(), SyncDbResult, getFileFromR2(), ref_node_url (+14 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "CobrosDailySheetView.tsx"
Cohesion: 0.19
Nodes (16): CobrosDailySheetViewProps, Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, Clientes360View, DirectorioClientesViewProps, RegistrarCobroDiarioModalProps, DEFAULT_COTIZACION (+8 more)

### Community 56 - "apiContracts.test.ts"
Cohesion: 0.33
Nodes (5): ApiErrorSchema, BatchSyncScannerInput, BatchSyncScannerSchema, ScannedLogItemInput, ScannedLogItemSchema

### Community 57 - "inventario-jobs/route.ts"
Cohesion: 0.10
Nodes (22): GET, handleGet(), handlePost(), isXlsxKey(), POST, SOURCE_KEY_FIELD, VALID_SOURCES, DbInventoryOptions (+14 more)

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

### Community 75 - "cobros/types.ts"
Cohesion: 0.22
Nodes (12): CobrosKpiCardsProps, CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, CobrosService, features_cobros_types_cliente, CobrosMetrics (+4 more)

### Community 76 - "Desarrollo local"
Cohesion: 0.33
Nodes (5): Arranque seguro, Desarrollo local, Estado inicial, Verificación, Worker y procesador C#

### Community 77 - "Contratos y límites de integración"
Cohesion: 0.40
Nodes (4): Contratos y límites de integración, Reglas, Servicios, Versión actual

### Community 78 - "Servicios internos de procesamiento"
Cohesion: 0.40
Nodes (4): Contrato operativo, Responsabilidades, Servicios internos de procesamiento, Verificación

### Community 79 - "components/InventarioJobsTab.tsx"
Cohesion: 0.20
Nodes (9): InventarioJobsTab, formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState (+1 more)

### Community 82 - "Paquete"
Cohesion: 0.09
Nodes (23): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, useSmoothScroll(), ConfiguracionTabProps, InventoryTab(), InventoryTabProps, useInventoryData() (+15 more)

### Community 84 - "createClient"
Cohesion: 0.20
Nodes (11): POST(), GET, handleGet(), GET(), POST(), getSessionUser(), SessionUser, sanitizeFileNamePart() (+3 more)

### Community 85 - "validations.test.ts"
Cohesion: 0.22
Nodes (8): LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, ALLOWED_STORAGE_FOLDERS, StorageFolderSchema, UploadMetadataInput, UploadMetadataSchema

### Community 86 - "components/CobrosTab.tsx"
Cohesion: 0.15
Nodes (11): CobrosDailySheetView(), CobrosExcelImporterModal(), CobrosTab(), DirectorioClientesTab(), DirectorioClientesTabProps, DirectorioClientesView(), useCobrosOperaciones(), VoucherViewerModal() (+3 more)

### Community 87 - "EstanteriaPosicion"
Cohesion: 0.27
Nodes (6): GestorAlmacenView(), GestorAlmacenViewProps, ShelfMatrixGridProps, EditPositionModal(), EditPositionModalProps, EstanteriaPosicion

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "r2/client.ts"
Cohesion: 0.14
Nodes (24): aNumero(), construirIndiceDesdeEnviado(), dynamic, esKeyValida(), FilaCruzarInput, indiceKeyPara(), leerIndice(), limpiar() (+16 more)

### Community 92 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.31
Nodes (6): RegistrarCobroDiarioModal(), RegistrarCobroDiarioModalContent(), WrItemDraft, ParsedExcelCobroResult, ParsedWrRow, parseExcelCobroBlock()

### Community 97 - "components/AuditoriaTab.tsx"
Cohesion: 0.23
Nodes (8): TableSkeleton(), AuditoriaTab(), AuditRecord, AuditoriaTab, KardexView(), KardexViewProps, exportKardexToExcel(), MovimientoKardex

### Community 101 - "Despliegue en VPS (Hostinger / Ubuntu)"
Cohesion: 0.33
Nodes (5): Despliegue en VPS (Hostinger / Ubuntu), Endpoints, Motor Python de Digitalización de Manifiestos TIB Courier, Opción 1: Con Docker (Recomendado), Opción 2: Con Python venv directo

### Community 102 - "extract_table_rows"
Cohesion: 0.50
Nodes (3): extract_table_rows(), ndarray, Detecta la tabla principal en la página utilizando operaciones morfológicas y…

### Community 103 - "CobroPaymentModal.tsx"
Cohesion: 0.32
Nodes (6): CobroPaymentModal(), CobroPaymentModalProps, MetodoPagoCobro, VoucherCobroItem, features_cobros_types_metodopagocobro, features_cobros_types_vouchercobroitem

### Community 105 - "upload/route.ts"
Cohesion: 0.36
Nodes (14): POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), uploadFileToR2(), buildDniPath() (+6 more)

### Community 107 - "request-context.ts"
Cohesion: 0.25
Nodes (14): ApiHandler, withErrorHandler(), apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders(), CONTRACT_VERSION_HEADER, CORRELATION_ID_HEADER (+6 more)

### Community 109 - "inventory/index.ts"
Cohesion: 0.12
Nodes (16): InventoryHeader(), InventoryHeaderProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryStatsCards(), InventoryStatsCardsProps, InventorySubTabsProps, InventoryToolbar() (+8 more)

### Community 110 - "inventario-tib/route.ts"
Cohesion: 0.48
Nodes (6): DELETE(), GET(), getLimaDateString(), POST(), TibTipo, deleteFileFromR2()

### Community 111 - "test-vps-300-filas.mjs"
Cohesion: 0.29
Nodes (6): buf, data, filas, instructivoPath, t0, wb

### Community 112 - "validate.ts"
Cohesion: 0.80
Nodes (4): formatZodError(), validateBody(), validateQuery(), apiError

### Community 113 - "LivePackagesStream.tsx"
Cohesion: 0.67
Nodes (3): LivePackagesStream(), LivePackagesStreamProps, PackageStatusFilter

## Knowledge Gaps
- **471 isolated node(s):** `RESTORABLE_MODULES`, `GET`, `dynamic`, `maxDuration`, `TibItem` (+466 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `DashboardTabContent.tsx`, `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `supabase/client.ts`, `useFormatoEntrega.ts`, `cobros/types.ts`, `paquetes/route.ts`, `inventory/index.ts`, `Cliente`, `LivePackagesStream.tsx`, `excelExport.ts`, `dashboard/types.ts`, `components/CobrosTab.tsx`, `EstanteriaPosicion`, `types/index.ts`, `useInventoryData.ts`, `app/page.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `Cliente` connect `Cliente` to `DashboardTabContent.tsx`, `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `supabase/client.ts`, `useFormatoEntrega.ts`, `cobros/types.ts`, `components/RotulosA4Tab.tsx`, `excelExport.ts`, `Paquete`, `dashboard/types.ts`, `components/CobrosTab.tsx`, `CobrosDailySheetView.tsx`, `types/index.ts`, `useInventoryData.ts`, `RegistrarCobroDiarioModal.tsx`, `app/page.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `authorizeUser()` connect `authorizeUser` to `upload/route.ts`, `paquetes/route.ts`, `inventario-tib/route.ts`, `analyzer.ts`, `createClient`, `benchmark-comparativo-completo.mjs`, `batch-sync/route.ts`, `inventario-jobs/route.ts`, `r2/client.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `RESTORABLE_MODULES`, `GET`, `dynamic` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05616605616605617 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Should `components/LiveSheetsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06455696202531645 - nodes in this community are weakly interconnected._