# Graph Report - sistema-amex-courier  (2026-10-19)

## Corpus Check
- 462 files · ~381,968 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2080 nodes · 4721 edges · 144 communities (120 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `07d16461`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- components/ScannerTab.tsx
- components/DniMatrixTab.tsx
- Program
- live-sheets/types.ts
- main.py
- phoneUtils.ts
- useFormatoEntrega.ts
- worker.js
- authorizeUser
- components/BoletasShalomTab.tsx
- useInvoice.ts
- components/RotulosA4Tab.tsx
- dialog.ts
- ArmarPlanillaTab.tsx
- test-real-flow.mjs
- components/AdminUsersTab.tsx
- analyzer.ts
- excelExport.ts
- package.json
- constants.ts
- compilerOptions
- ui/index.ts
- dependencies
- batch-sync/route.ts
- SoundSynthesizer
- types/index.ts
- inventory.service.ts
- devDependencies
- components/InfoAmexTab.tsx
- resend.ts
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
- alertDialog
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- isValidWr
- Find Skills
- dashboard/types.ts
- Paquete
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
- shalom-boletas/route.ts
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- .ReadRowValues
- supabase/client.ts
- components/InventoryTab.tsx
- components/LiveSheetsTab.tsx
- server
- .WarmUpSources
- components/InventarioJobsTab.tsx
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- r2/client.ts
- jspdf
- ExcelExportDropdown.tsx
- useLiveSheetsData.ts
- next_types_root_params_d
- write-excel-file
- supabase.ts
- components/AuditoriaTab.tsx
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- upload/route.ts
- paquetes.schema.ts
- InventoryHeader.tsx
- useDashboardNavigation.ts
- next_types_routes_d
- SyncTibModal.tsx
- Logger
- scanner.ts
- manager.ts
- .PatchInventory
- Cliente
- ProcessorDaemon
- ref_fs
- cobros/types.ts
- useInventoryData.ts
- MockElement
- .CopyXmlNode
- Badge.tsx
- test-daily-tib-flow.mjs
- analyze-oct-week.mjs
- Button.tsx
- CachedSourceData
- check-vercel-envs.mjs
- inspect-usuarios.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- MockElement
- next
- react
- resend
- selfsigned

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
- `CobrosExcelImporterModalContent()` --calls--> `alertDialog()`  [EXTRACTED]
  features/cobros/components/CobrosExcelImporterModal.tsx → lib/dialog.ts
- `ClipboardCopyDropdownProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/ClipboardCopyDropdown.tsx → types/index.ts
- `ExcelExportDropdownProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/ExcelExportDropdown.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (144 total, 24 thin omitted)

### Community 0 - "components/ScannerTab.tsx"
Cohesion: 0.19
Nodes (14): BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, formatOperatorName(), MobileScannerModal, ScannerTab(), ScannerTabProps, exportScannerLogsToExcel() (+6 more)

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (61): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+53 more)

### Community 2 - "Program"
Cohesion: 0.12
Nodes (17): int, long, object, CellData, CellKind, JsonSerializerOptions, string, HeaderColumn (+9 more)

### Community 3 - "live-sheets/types.ts"
Cohesion: 0.15
Nodes (22): FormulaBar(), FormulaBarProps, LiveSheetsHeaderProps, SpreadsheetGrid(), SpreadsheetGridProps, UseLiveSheetsKeyboardProps, UseLiveSheetsPresenceProps, sheetsService (+14 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.11
Nodes (32): ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal(), RutaBuilderModalProps, useDespachoRutas(), ViewModeDespacho (+24 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.17
Nodes (19): ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps, getTodayFormatted() (+11 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (39): ref_node_http, candidateEnvPaths, { createProcessorClient }, crypto, deleteFromR2(), downloadFromR2(), fs, fsp (+31 more)

### Community 8 - "authorizeUser"
Cohesion: 0.09
Nodes (42): POST(), GET(), POST(), requireAdmin(), RESTORABLE_MODULES, dynamic, POST(), FuenteTibOpcion (+34 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.12
Nodes (28): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+20 more)

### Community 10 - "useInvoice.ts"
Cohesion: 0.19
Nodes (15): InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps, useInvoice() (+7 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.14
Nodes (31): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown(), RotulosSheetDropdownProps (+23 more)

### Community 12 - "dialog.ts"
Cohesion: 0.13
Nodes (21): PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, DialogProvider(), GlobalDialogModal(), GlobalDialogModalProps, VARIANT_COLORS, VARIANT_ICONS (+13 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "components/AdminUsersTab.tsx"
Cohesion: 0.06
Nodes (40): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, useSmoothScroll(), ToastProvider() (+32 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.16
Nodes (21): POST(), POST(), POST(), analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), DEFAULT_OPENAI_MODEL, DNI_JSON_SCHEMA, extractDniNameFromImage() (+13 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.20
Nodes (16): InventoryTable(), InventoryTableProps, exportClientesToExcel(), exportCobrosToExcel(), exportEntregasToExcel(), exportHojaDeRutaToExcel(), exportLiquidacionesToExcel(), exportPaquetesToExcel() (+8 more)

### Community 18 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 19 - "constants.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET, handleGet(), useDashboardSession(), AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired() (+15 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.24
Nodes (12): Input, InputProps, Select, SelectProps, Table, TableBody, TableCell, TableFooter (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/s3-request-presigner, docx, file-saver, html5-qrcode, jszip, lenis, lucide-react, openai (+21 more)

### Community 23 - "batch-sync/route.ts"
Cohesion: 0.10
Nodes (35): GET(), mapPaqueteRow(), POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, ApiHandler (+27 more)

### Community 25 - "types/index.ts"
Cohesion: 0.13
Nodes (18): BatchStatusModal(), BatchStatusModalProps, BulkStatusByWrModal(), BulkStatusByWrModalProps, BoletaShalomInput, DestinoRuta, EmbarqueMaster, EstadoDestinoRuta (+10 more)

### Community 26 - "inventory.service.ts"
Cohesion: 0.16
Nodes (17): ConfiguracionTab(), ShelfPositionModal(), ShelfPositionModalProps, TransferModal(), TransferModalProps, BatchStatusChangeResult, mapPaqueteDbRow(), SearchPaquetesServerSideParams (+9 more)

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

### Community 31 - "registry.ts"
Cohesion: 0.12
Nodes (24): DashboardPage(), Sidebar(), SidebarProps, OperatorHubTab(), OperatorHubTabProps, COBROS_SUBMODULES, getAvailableModulesForUser(), getCobrosSubmoduleById() (+16 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "DashboardTabContent.tsx"
Cohesion: 0.09
Nodes (31): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+23 more)

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
Cohesion: 0.17
Nodes (8): ref_node_fs, adminSupabase, envContent, serviceKey, localQueue, resilientDB, resilientQueue, uploadedToDB

### Community 45 - "benchmark-comparativo-completo.mjs"
Cohesion: 0.12
Nodes (23): mapEstadoEntrega(), normalizeKey(), ParsedRow, syncCompletedExcelToDatabase(), SyncDbResult, deleteFileFromR2(), getFileFromR2(), ref_node_crypto (+15 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.19
Nodes (13): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPkgFormData, DashboardTabContent() (+5 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "alertDialog"
Cohesion: 0.12
Nodes (19): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, CobroDeliveryModalContent(), CobroPaymentModalContent(), useCobrosData(), useVoucherForm(), LiveSheetsHeader() (+11 more)

### Community 49 - "Program.cs"
Cohesion: 0.15
Nodes (13): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, system_diagnostics, system_globalization, system_io_compression, system_text, system_text_json, system_xml (+5 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.14
Nodes (10): ref_node_path, invHeaders, invRows, outDir, buf, data, filas, instructivoPath (+2 more)

### Community 53 - "isValidWr"
Cohesion: 0.29
Nodes (13): NewPackageModal(), UBICACIONES_RAPIDAS, useDashboardActions(), ProcessedSessionBatch, ScannerBulkLocationView(), cleanWr(), getWrValidationError(), isValidWr() (+5 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "dashboard/types.ts"
Cohesion: 0.17
Nodes (20): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardHeader(), DashboardHeaderProps, DashboardTab(), ExecutiveKpiGrid() (+12 more)

### Community 56 - "Paquete"
Cohesion: 0.10
Nodes (16): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, ConfiguracionTabProps, GestorAlmacenView(), GestorAlmacenViewProps, ShelfMatrixGridProps, InventoryPagination (+8 more)

### Community 57 - "inventario-jobs/route.ts"
Cohesion: 0.14
Nodes (18): GET, handleGet(), handlePost(), isXlsxKey(), POST, purgeCompletedAndStaleJobs(), SOURCE_KEY_FIELD, VALID_SOURCES (+10 more)

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

### Community 79 - ".ReadRowValues"
Cohesion: 0.26
Nodes (5): HeaderInfo, IEnumerable, List, WorksheetPart, XElement

### Community 81 - "supabase/client.ts"
Cohesion: 0.22
Nodes (12): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), InvoiceCloudService, ScannerQueueCloudService, AuditLogEntry (+4 more)

### Community 82 - "components/InventoryTab.tsx"
Cohesion: 0.13
Nodes (13): InventorySubTabsProps, InventoryTabProps, EditPackageModal(), EditPackageModalProps, EditPositionModal(), EditPositionModalProps, ItemToProcess, LogEntry (+5 more)

### Community 83 - "components/LiveSheetsTab.tsx"
Cohesion: 0.16
Nodes (15): ParsedItem, PasteWrListModal(), PasteWrListModalProps, features_live_sheets_components_live_sheets, formatStatNumber(), LiveSheetsBottomBar(), LiveSheetsBottomBarProps, LiveSheetsTab() (+7 more)

### Community 84 - "server"
Cohesion: 0.27
Nodes (12): bootWarmUpTibIndices(), cruzarFilasCobros(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath(), readCgroup() (+4 more)

### Community 85 - ".WarmUpSources"
Cohesion: 0.22
Nodes (4): CachedSourceData, SharedStringTablePart, WorkbookPart, WorksheetInfo

### Community 86 - "components/InventarioJobsTab.tsx"
Cohesion: 0.22
Nodes (8): formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState, uploadWithProgress()

### Community 87 - "ClipboardCopyDropdown.tsx"
Cohesion: 0.16
Nodes (18): ClipboardCopyDropdown(), ClipboardCopyDropdownProps, dropdownButtonStyle, iconBoxStyle(), InventoryToolbar(), RowActionsDropdown(), RowActionsDropdownProps, copyTextToClipboard() (+10 more)

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "r2/client.ts"
Cohesion: 0.14
Nodes (24): aNumero(), construirIndiceDesdeEnviado(), dynamic, esKeyValida(), FilaCruzarInput, indiceKeyPara(), leerIndice(), limpiar() (+16 more)

### Community 93 - "ExcelExportDropdown.tsx"
Cohesion: 0.24
Nodes (10): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, buildClientSummary(), buildEnAlmacenReport(), ClientSummaryItem, EnAlmacenRow (+2 more)

### Community 94 - "useLiveSheetsData.ts"
Cohesion: 0.24
Nodes (11): NewSheetModal(), NewSheetModalProps, features_live_sheets_components_sheets_hub, SheetsHub(), SheetsHubProps, useLiveSheetsData(), extractLast6Digits(), getSheetLongCode() (+3 more)

### Community 97 - "supabase.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 98 - "components/AuditoriaTab.tsx"
Cohesion: 0.23
Nodes (8): TableSkeleton(), AuditoriaTab(), AuditRecord, KardexView(), KardexViewProps, inventoryService, exportKardexToExcel(), MovimientoKardex

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

### Community 107 - "paquetes.schema.ts"
Cohesion: 0.08
Nodes (23): LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, CreateInventarioJobInput, CreateInventarioJobSchema, PresignUploadInput, PresignUploadSchema (+15 more)

### Community 109 - "InventoryHeader.tsx"
Cohesion: 0.24
Nodes (6): InventoryHeader(), InventoryHeaderProps, InventoryStatsCards(), InventoryStatsCardsProps, TibOperationsDropdown(), TibOperationsDropdownProps

### Community 110 - "useDashboardNavigation.ts"
Cohesion: 0.36
Nodes (8): isDashboardTab(), useDashboardNavigation(), VALID_DASHBOARD_TABS, migrateLegacyHash(), PATH_TO_TAB, pathToTab(), TAB_TO_PATH, tabToPath()

### Community 112 - "SyncTibModal.tsx"
Cohesion: 0.20
Nodes (10): MAX_WIDTH_MAP, Modal(), ModalProps, formatBytes(), JobProgress, SyncTibModal(), SyncTibModalProps, TIB_CONFIG (+2 more)

### Community 113 - "Logger"
Cohesion: 0.24
Nodes (3): LogEntry, Logger, LogLevel

### Community 114 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 115 - "manager.ts"
Cohesion: 0.29
Nodes (6): LENIS_CONFIG, ManagedScroller, MODAL_BACKDROP_SELECTOR, PREVENT_ATTRIBUTE, SCROLL_ATTRIBUTE, SCROLL_SELECTOR

### Community 116 - ".PatchInventory"
Cohesion: 0.33
Nodes (3): CellData, Dictionary, PatchCounts

### Community 117 - "Cliente"
Cohesion: 0.31
Nodes (10): NewPackageModalProps, DashboardTabContentProps, DashboardScanExtra, UseDashboardMetricsProps, DashboardTabProps, LiveSheetsTabProps, RotulosA4TabProps, Cliente (+2 more)

### Community 118 - "ProcessorDaemon"
Cohesion: 0.27
Nodes (6): Func, HttpListenerContext, HttpListenerResponse, JsonSerializerOptions, string, ProcessorDaemon

### Community 119 - "ref_fs"
Cohesion: 0.22
Nodes (5): ref_fs, envContent, matchKey, envContent, matchKey

### Community 120 - "cobros/types.ts"
Cohesion: 0.05
Nodes (77): CobroDeliveryModal(), CobroDeliveryModalProps, CobroPaymentModal(), CobroPaymentModalProps, CobrosDailySheetView(), CobrosDailySheetViewProps, CobrosExcelImporterModal(), CobrosExcelImporterModalContent() (+69 more)

### Community 121 - "useInventoryData.ts"
Cohesion: 0.21
Nodes (16): InventoryFilterBar(), InventoryFilterBarProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryToolbarProps, useInventoryData(), UseInventoryDataProps, DateFilterState (+8 more)

### Community 123 - ".CopyXmlNode"
Cohesion: 0.40
Nodes (4): Action, Stream, XmlReader, XmlWriter

### Community 124 - "Badge.tsx"
Cohesion: 0.40
Nodes (5): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP

### Community 125 - "test-daily-tib-flow.mjs"
Cohesion: 0.33
Nodes (4): envContent, supabase, supabaseKey, supabaseUrl

### Community 126 - "analyze-oct-week.mjs"
Cohesion: 0.29
Nodes (7): downloadR2Buffer(), env, envContent, envPath, r2AccountId, run(), s3

### Community 127 - "Button.tsx"
Cohesion: 0.40
Nodes (3): ButtonProps, SIZE_MAP, VARIANT_MAP

### Community 128 - "CachedSourceData"
Cohesion: 0.40
Nodes (4): DateTime, SourceRecord, WorkbookValidation, CachedSourceData

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

## Knowledge Gaps
- **536 isolated node(s):** `dynamic`, `RESTORABLE_MODULES`, `dynamic`, `GET`, `dynamic` (+531 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/ScannerTab.tsx`, `components/DniMatrixTab.tsx`, `live-sheets/types.ts`, `useFormatoEntrega.ts`, `excelExport.ts`, `batch-sync/route.ts`, `types/index.ts`, `inventory.service.ts`, `registry.ts`, `DashboardTabContent.tsx`, `app/page.tsx`, `isValidWr`, `dashboard/types.ts`, `supabase/client.ts`, `components/InventoryTab.tsx`, `components/LiveSheetsTab.tsx`, `ClipboardCopyDropdown.tsx`, `ExcelExportDropdown.tsx`, `useLiveSheetsData.ts`, `InventoryHeader.tsx`, `scanner.ts`, `Cliente`, `cobros/types.ts`, `useInventoryData.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `authorizeUser()` connect `authorizeUser` to `upload/route.ts`, `shalom-boletas/route.ts`, `analyzer.ts`, `batch-sync/route.ts`, `inventario-jobs/route.ts`, `r2/client.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Cliente` connect `Cliente` to `components/ScannerTab.tsx`, `DashboardTabContent.tsx`, `components/DniMatrixTab.tsx`, `live-sheets/types.ts`, `useFormatoEntrega.ts`, `useInvoice.ts`, `components/RotulosA4Tab.tsx`, `app/page.tsx`, `supabase/client.ts`, `components/InventoryTab.tsx`, `excelExport.ts`, `scanner.ts`, `isValidWr`, `dashboard/types.ts`, `cobros/types.ts`, `types/index.ts`, `inventory.service.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `dynamic`, `RESTORABLE_MODULES`, `dynamic` to the rest of the system?**
  _536 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05616605616605617 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `live-sheets/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._