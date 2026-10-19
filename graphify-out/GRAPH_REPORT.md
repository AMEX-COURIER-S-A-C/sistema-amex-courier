# Graph Report - sistema-amex-courier  (2026-10-19)

## Corpus Check
- 462 files · ~383,631 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2080 nodes · 4722 edges · 147 communities (125 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e2a245d`
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
- getSupabaseAdmin
- components/BoletasShalomTab.tsx
- useInvoice.ts
- components/RotulosA4Tab.tsx
- alertDialog
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
- request-context.ts
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
- SyncTibModal.tsx
- Program.cs
- test-scanner-performance.mjs
- ref_node_path
- isValidWr
- Find Skills
- dashboard/types.ts
- cobros/types.ts
- confirmDialog
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
- authorizeUser
- Desarrollo local
- Contratos y límites de integración
- Servicios internos de procesamiento
- .TryFindHeaders
- supabase/client.ts
- Paquete
- Cliente
- server
- .WarmUpSources
- components/InventarioJobsTab.tsx
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- r2/client.ts
- jspdf
- ExcelExportDropdown.tsx
- DirectorioClienteModal.tsx
- login/route.ts
- write-excel-file
- RegistrarCobroDiarioModal.tsx
- components/AuditoriaTab.tsx
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- upload/route.ts
- paquetes.schema.ts
- inventory/index.ts
- useDashboardNavigation.ts
- apiContracts.test.ts
- batch-sync/route.ts
- Logger
- scanner.ts
- manager.ts
- .PatchInventory
- CobrosDailySheetView.tsx
- ProcessorDaemon
- ref_fs
- useCobrosOperaciones.ts
- useInventoryData.ts
- MockElement
- .CopyXmlNode
- dialog.ts
- RowActionsDropdown.tsx
- analyze-oct-week.mjs
- components/DirectorioClientesTab.tsx
- WorkbookValidation
- check-vercel-envs.mjs
- inspect-usuarios.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- MockElement
- next
- react
- resend
- Badge.tsx
- useDashboardData.ts
- Button.tsx
- xlsx

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
- `NewPackageModalProps` --references--> `Cliente`  [EXTRACTED]
  components/modals/NewPackageModal.tsx → types/index.ts
- `PasteWrListModalProps` --references--> `Paquete`  [EXTRACTED]
  components/modals/PasteWrListModal.tsx → types/index.ts
- `CobrosExcelImporterModalContent()` --calls--> `alertDialog()`  [EXTRACTED]
  features/cobros/components/CobrosExcelImporterModal.tsx → lib/dialog.ts
- `CobrosList()` --calls--> `getR2ViewUrl()`  [EXTRACTED]
  features/cobros/components/CobrosList.tsx → lib/r2/client.ts
- `ConfiguracionTabProps` --references--> `Paquete`  [EXTRACTED]
  features/configuracion/components/ConfiguracionTab.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (147 total, 22 thin omitted)

### Community 0 - "matchesFuzzySearch"
Cohesion: 0.50
Nodes (7): useCobrosData(), useVoucherForm(), cleanAlphanumeric(), extractDigits(), matchesFuzzySearch(), normalizeText(), stripLeadingZeros()

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (62): DniMatrixTab, features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps (+54 more)

### Community 2 - "Program"
Cohesion: 0.12
Nodes (17): int, long, object, CellData, CellKind, JsonSerializerOptions, string, HeaderColumn (+9 more)

### Community 3 - "components/LiveSheetsTab.tsx"
Cohesion: 0.07
Nodes (58): NewSheetModal(), NewSheetModalProps, ParsedItem, PasteWrListModal(), PasteWrListModalProps, FormulaBar(), FormulaBarProps, features_live_sheets_components_live_sheets (+50 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.11
Nodes (32): ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal(), RutaBuilderModalProps, useDespachoRutas(), ViewModeDespacho (+24 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.16
Nodes (19): FormatoEntregaTab, ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps (+11 more)

### Community 7 - "worker.js"
Cohesion: 0.07
Nodes (39): ref_node_http, candidateEnvPaths, { createProcessorClient }, crypto, deleteFromR2(), downloadFromR2(), fs, fsp (+31 more)

### Community 8 - "getSupabaseAdmin"
Cohesion: 0.08
Nodes (46): GET(), POST(), requireAdmin(), GET(), POST(), requireAdmin(), RESTORABLE_MODULES, dynamic (+38 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.12
Nodes (28): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+20 more)

### Community 10 - "useInvoice.ts"
Cohesion: 0.18
Nodes (16): InvoicesTab, InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps (+8 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.14
Nodes (31): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown(), RotulosSheetDropdownProps (+23 more)

### Community 12 - "alertDialog"
Cohesion: 0.13
Nodes (18): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, CobroDeliveryModalContent(), CobroPaymentModalContent(), ConfiguracionTab(), BulkStatusByWrModal(), ManifestDetailRow (+10 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "components/AdminUsersTab.tsx"
Cohesion: 0.06
Nodes (39): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, ToastProvider(), ToastContainer() (+31 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.15
Nodes (22): POST(), POST(), POST(), POST(), analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), DEFAULT_OPENAI_MODEL, DNI_JSON_SCHEMA (+14 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.19
Nodes (17): InventoryTable(), InventoryTableProps, exportClientesToExcel(), exportCobrosToExcel(), exportEntregasToExcel(), exportHojaDeRutaToExcel(), exportLiquidacionesToExcel(), exportPaquetesToExcel() (+9 more)

### Community 18 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 19 - "constants.ts"
Cohesion: 0.19
Nodes (16): POST(), GET, handleGet(), useDashboardSession(), AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired(), isSessionRevoked() (+8 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.24
Nodes (12): Input, InputProps, Select, SelectProps, Table, TableBody, TableCell, TableFooter (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/s3-request-presigner, docx, file-saver, html5-qrcode, jszip, lenis, lucide-react, openai (+21 more)

### Community 23 - "request-context.ts"
Cohesion: 0.27
Nodes (14): ApiHandler, withErrorHandler(), validateQuery(), apiError, apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders() (+6 more)

### Community 25 - "types/index.ts"
Cohesion: 0.09
Nodes (18): InventoryPagination, UseInventoryQueryOptions, parseAndMatchWrs(), parseBulkCodes(), parseLocation(), validateAndSimulateRelocation(), BoletaShalomInput, DestinoRuta (+10 more)

### Community 26 - "inventory.service.ts"
Cohesion: 0.14
Nodes (20): ConfiguracionTabProps, GestorAlmacenView(), GestorAlmacenViewProps, ShelfMatrixGridProps, EditPositionModal(), EditPositionModalProps, ShelfPositionModal(), ShelfPositionModalProps (+12 more)

### Community 27 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, selfsigned, supabase (+23 more)

### Community 28 - "components/InfoAmexTab.tsx"
Cohesion: 0.28
Nodes (8): InfoAmexTab, features_info_amex_components_infoamex, InfoAmexTab(), AMEX_INFO_IMAGES, AmexInfoImage, copyImageToClipboard(), copyTextToClipboard(), downloadImage()

### Community 29 - "resend.ts"
Cohesion: 0.13
Nodes (18): dynamic, POST(), dynamic, getDeviceSummary(), POST(), requestCooldownMap, dynamic, POST() (+10 more)

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "registry.ts"
Cohesion: 0.12
Nodes (24): DashboardPage(), Sidebar(), SidebarProps, OperatorHubTab, OperatorHubTab(), OperatorHubTabProps, COBROS_SUBMODULES, getAvailableModulesForUser() (+16 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "DashboardTabContent.tsx"
Cohesion: 0.11
Nodes (21): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+13 more)

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
Nodes (27): DELETE(), GET(), getLimaDateString(), POST(), TibTipo, mapEstadoEntrega(), normalizeKey(), ParsedRow (+19 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.19
Nodes (13): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPkgFormData, EMPTY_CLIENT_FORM (+5 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "SyncTibModal.tsx"
Cohesion: 0.20
Nodes (10): MAX_WIDTH_MAP, Modal(), ModalProps, formatBytes(), JobProgress, SyncTibModal(), SyncTibModalProps, TIB_CONFIG (+2 more)

### Community 49 - "Program.cs"
Cohesion: 0.15
Nodes (13): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, system_diagnostics, system_globalization, system_io_compression, system_text, system_text_json, system_xml (+5 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "ref_node_path"
Cohesion: 0.13
Nodes (11): ref_node_path, envContent, supabase, supabaseKey, supabaseUrl, buf, data, filas (+3 more)

### Community 53 - "isValidWr"
Cohesion: 0.27
Nodes (14): NewPackageModal(), NewPackageModalProps, UBICACIONES_RAPIDAS, useDashboardActions(), ProcessedSessionBatch, ScannerBulkLocationView(), cleanWr(), getWrValidationError() (+6 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "dashboard/types.ts"
Cohesion: 0.17
Nodes (21): AnalyticsChartsSection(), AnalyticsChartsSectionProps, DailyTasksSection(), DailyTasksSectionProps, DashboardTab, DashboardHeader(), DashboardHeaderProps, DashboardTab() (+13 more)

### Community 56 - "cobros/types.ts"
Cohesion: 0.22
Nodes (12): CobrosKpiCardsProps, CobrosList(), CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, CobrosService, CobrosMetrics (+4 more)

### Community 57 - "confirmDialog"
Cohesion: 0.27
Nodes (9): PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, SheetsHub(), confirmDialog(), notify(), processNext(), promptDialog() (+1 more)

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

### Community 75 - "authorizeUser"
Cohesion: 0.14
Nodes (17): DELETE(), dynamic, GET(), GET(), POST(), DELETE(), GET(), PATCH() (+9 more)

### Community 76 - "Desarrollo local"
Cohesion: 0.33
Nodes (5): Arranque seguro, Desarrollo local, Estado inicial, Verificación, Worker y procesador C#

### Community 77 - "Contratos y límites de integración"
Cohesion: 0.40
Nodes (4): Contratos y límites de integración, Reglas, Servicios, Versión actual

### Community 78 - "Servicios internos de procesamiento"
Cohesion: 0.40
Nodes (4): Contrato operativo, Responsabilidades, Servicios internos de procesamiento, Verificación

### Community 79 - ".TryFindHeaders"
Cohesion: 0.27
Nodes (4): HeaderInfo, IEnumerable, WorksheetPart, XElement

### Community 81 - "supabase/client.ts"
Cohesion: 0.14
Nodes (16): BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, ActaCloudService, InvoiceCloudService, formatOperatorName(), MobileScannerModal, ScannerTab() (+8 more)

### Community 82 - "Paquete"
Cohesion: 0.10
Nodes (26): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, useSmoothScroll(), InventoryTab(), InventoryTabProps, useInventoryData(), UseInventoryDataProps (+18 more)

### Community 83 - "Cliente"
Cohesion: 0.36
Nodes (8): DashboardTabContentProps, DashboardScanExtra, UseDashboardMetricsProps, DashboardTabProps, RotulosA4TabProps, Cliente, CobroVoucher, OrdenEntrega

### Community 84 - "server"
Cohesion: 0.27
Nodes (12): bootWarmUpTibIndices(), cruzarFilasCobros(), extractWrsFromCell(), getOrBuildTibLookup(), getOrSyncCachedTibFile(), getTibCacheFilePath(), getTibCacheMetaPath(), readCgroup() (+4 more)

### Community 85 - ".WarmUpSources"
Cohesion: 0.22
Nodes (4): CachedSourceData, SharedStringTablePart, WorkbookPart, WorksheetInfo

### Community 86 - "components/InventarioJobsTab.tsx"
Cohesion: 0.20
Nodes (9): InventarioJobsTab, formatBytes(), FuenteKey, FUENTES, InventarioJobsTab(), InventarioJobsTabProps, TibFileInfo, TibState (+1 more)

### Community 87 - "ClipboardCopyDropdown.tsx"
Cohesion: 0.26
Nodes (12): ClipboardCopyDropdown(), ClipboardCopyDropdownProps, dropdownButtonStyle, iconBoxStyle(), copyTextToClipboard(), formatClientAndWrHyphen(), formatClientAndWrTabbed(), formatClientWrAndLocation() (+4 more)

### Community 88 - "manifestPdfGenerator.ts"
Cohesion: 0.50
Nodes (4): generateManifestDigitalPdf(), ManifestDataForPdf, ManifestRowForPdf, sanitizeText()

### Community 91 - "r2/client.ts"
Cohesion: 0.14
Nodes (25): aNumero(), construirIndiceDesdeEnviado(), dynamic, esKeyValida(), FilaCruzarInput, indiceKeyPara(), leerIndice(), limpiar() (+17 more)

### Community 93 - "ExcelExportDropdown.tsx"
Cohesion: 0.24
Nodes (10): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, buildClientSummary(), buildEnAlmacenReport(), ClientSummaryItem, EnAlmacenRow (+2 more)

### Community 94 - "DirectorioClienteModal.tsx"
Cohesion: 0.21
Nodes (12): Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, Clientes360View, DirectorioClientesViewProps, RegistrarCobroDiarioModalProps, DEFAULT_COTIZACION, KambistaService (+4 more)

### Community 95 - "login/route.ts"
Cohesion: 0.18
Nodes (12): POST(), cache, checkRateLimit(), lastCleanup, purgeExpired(), rateLimitExceededResponse(), RateLimitOptions, RateLimitRecord (+4 more)

### Community 97 - "RegistrarCobroDiarioModal.tsx"
Cohesion: 0.26
Nodes (11): RegistrarCobroDiarioModal(), RegistrarCobroDiarioModalContent(), WrItemDraft, features_cobros_types_cliente, extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow, parseExcelCobroBlock() (+3 more)

### Community 98 - "components/AuditoriaTab.tsx"
Cohesion: 0.21
Nodes (9): TableSkeleton(), AuditoriaTab(), AuditRecord, AuditoriaTab, KardexView(), KardexViewProps, inventoryService, exportKardexToExcel() (+1 more)

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
Cohesion: 0.34
Nodes (15): POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), formatZodError(), uploadFileToR2() (+7 more)

### Community 107 - "paquetes.schema.ts"
Cohesion: 0.14
Nodes (14): AssignShelfSchema, CreatePaqueteInput, CreatePaqueteSchema, EstadoEntregaSchema, EstadoTibSchema, QueryPaquetesInput, QueryPaquetesSchema, UbicacionSchema (+6 more)

### Community 109 - "inventory/index.ts"
Cohesion: 0.15
Nodes (10): InventoryHeader(), InventoryHeaderProps, InventorySelectionBar(), InventorySelectionBarProps, InventoryStatsCards(), InventoryStatsCardsProps, InventorySubTabsProps, InventoryToolbarProps (+2 more)

### Community 110 - "useDashboardNavigation.ts"
Cohesion: 0.36
Nodes (8): isDashboardTab(), useDashboardNavigation(), VALID_DASHBOARD_TABS, migrateLegacyHash(), PATH_TO_TAB, pathToTab(), TAB_TO_PATH, tabToPath()

### Community 111 - "apiContracts.test.ts"
Cohesion: 0.18
Nodes (10): ApiErrorSchema, CreateInventarioJobInput, CreateInventarioJobSchema, PresignUploadInput, PresignUploadSchema, TibFuenteSchema, BatchSyncScannerInput, BatchSyncScannerSchema (+2 more)

### Community 112 - "batch-sync/route.ts"
Cohesion: 0.29
Nodes (9): GET(), mapPaqueteRow(), POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, validateBody() (+1 more)

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
Cohesion: 0.23
Nodes (7): CellData, DateTime, Dictionary, List, PatchCounts, SourceRecord, CachedSourceData

### Community 117 - "CobrosDailySheetView.tsx"
Cohesion: 0.27
Nodes (7): CobrosDailySheetView(), CobrosDailySheetViewProps, VoucherViewerModal(), VoucherViewerModalProps, FiltrosCobrosLote, CobrosTabProps, CobrosTab

### Community 118 - "ProcessorDaemon"
Cohesion: 0.27
Nodes (6): Func, HttpListenerContext, HttpListenerResponse, JsonSerializerOptions, string, ProcessorDaemon

### Community 119 - "ref_fs"
Cohesion: 0.22
Nodes (5): ref_fs, envContent, matchKey, envContent, matchKey

### Community 120 - "useCobrosOperaciones.ts"
Cohesion: 0.11
Nodes (30): CobroDeliveryModal(), CobroDeliveryModalProps, CobroPaymentModal(), CobroPaymentModalProps, CobrosExcelImporterModal(), CobrosExcelImporterModalContent(), CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES (+22 more)

### Community 121 - "useInventoryData.ts"
Cohesion: 0.32
Nodes (10): InventoryFilterBar(), InventoryFilterBarProps, DateFilterState, getDateFilterSummary(), initialDateFilter, isPackageInDateFilter(), MONTH_NAMES, resolveDateFilterRange() (+2 more)

### Community 123 - ".CopyXmlNode"
Cohesion: 0.40
Nodes (4): Action, Stream, XmlReader, XmlWriter

### Community 124 - "dialog.ts"
Cohesion: 0.18
Nodes (14): DialogProvider(), GlobalDialogModal(), GlobalDialogModalProps, VARIANT_COLORS, VARIANT_ICONS, AlertDialogOptions, ConfirmDialogOptions, DialogItem (+6 more)

### Community 125 - "RowActionsDropdown.tsx"
Cohesion: 0.39
Nodes (6): InventoryToolbar(), RowActionsDropdown(), RowActionsDropdownProps, copyPackagesTableAsImage(), downloadBlob(), renderPackagesTableCanvas()

### Community 126 - "analyze-oct-week.mjs"
Cohesion: 0.29
Nodes (7): downloadR2Buffer(), env, envContent, envPath, r2AccountId, run(), s3

### Community 127 - "components/DirectorioClientesTab.tsx"
Cohesion: 0.29
Nodes (6): CobrosTab(), DirectorioClientesTab(), DirectorioClientesTabProps, DirectorioClientesView(), useCobrosOperaciones(), DirectorioClientesTab

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

### Community 137 - "Badge.tsx"
Cohesion: 0.40
Nodes (5): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP

### Community 144 - "useDashboardData.ts"
Cohesion: 0.22
Nodes (12): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), mapPaqueteDbRow(), LEVEL_LESS_LOCATIONS, LevelLessLocation (+4 more)

### Community 145 - "Button.tsx"
Cohesion: 0.40
Nodes (3): ButtonProps, SIZE_MAP, VARIANT_MAP

## Knowledge Gaps
- **536 isolated node(s):** `dynamic`, `RESTORABLE_MODULES`, `dynamic`, `GET`, `dynamic` (+531 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `useDashboardData.ts`, `excelExport.ts`, `types/index.ts`, `inventory.service.ts`, `registry.ts`, `DashboardTabContent.tsx`, `app/page.tsx`, `isValidWr`, `dashboard/types.ts`, `cobros/types.ts`, `supabase/client.ts`, `Cliente`, `ClipboardCopyDropdown.tsx`, `ExcelExportDropdown.tsx`, `inventory/index.ts`, `batch-sync/route.ts`, `scanner.ts`, `CobrosDailySheetView.tsx`, `useInventoryData.ts`, `RowActionsDropdown.tsx`, `components/DirectorioClientesTab.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `authorizeUser()` connect `authorizeUser` to `getSupabaseAdmin`, `upload/route.ts`, `benchmark-comparativo-completo.mjs`, `analyzer.ts`, `batch-sync/route.ts`, `r2/client.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Cliente` connect `Cliente` to `components/DniMatrixTab.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `useInvoice.ts`, `components/RotulosA4Tab.tsx`, `useDashboardData.ts`, `excelExport.ts`, `types/index.ts`, `inventory.service.ts`, `DashboardTabContent.tsx`, `app/page.tsx`, `isValidWr`, `dashboard/types.ts`, `cobros/types.ts`, `supabase/client.ts`, `Paquete`, `DirectorioClienteModal.tsx`, `RegistrarCobroDiarioModal.tsx`, `scanner.ts`, `CobrosDailySheetView.tsx`, `components/DirectorioClientesTab.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `dynamic`, `RESTORABLE_MODULES`, `dynamic` to the rest of the system?**
  _536 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05518394648829431 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `components/LiveSheetsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06523855890944498 - nodes in this community are weakly interconnected._