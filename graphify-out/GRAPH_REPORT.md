# Graph Report - sistema-amex-courier  (2026-10-27)

## Corpus Check
- 509 files · ~550,534 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2317 nodes · 5229 edges · 174 communities (146 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0a69527`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- supabase/client.ts
- components/DniMatrixTab.tsx
- Program
- DashboardTabContent.tsx
- main.py
- phoneUtils.ts
- useFormatoEntrega.ts
- worker.js
- getSupabaseAdmin
- components/BoletasShalomTab.tsx
- cost-tracker.ts
- components/RotulosA4Tab.tsx
- dialog.ts
- ArmarPlanillaTab.tsx
- test-real-flow.mjs
- components/AdminUsersTab.tsx
- analyzer.ts
- excelExport.ts
- SmoothScrollManager
- paquetes/route.ts
- compilerOptions
- ui/index.ts
- dependencies
- HalloweenBackdrop.tsx
- SoundSynthesizer
- types/index.ts
- useInventoryData.ts
- devDependencies
- useInvoice.ts
- Paquete
- worker/package.json
- registry.ts
- What You Must Do When Invoked
- syncTibToPortal.ts
- securityAlerts.ts
- scripts
- gen-certs.mjs
- whatsappGenerator.ts
- AmexInventoryProcessor.csproj
- next-env.d.ts
- vercel.json
- postcss.config.mjs
- test-api-scanner-batch.mjs
- r2/client.ts
- app/page.tsx
- cleanup-test-data.mjs
- request-context.ts
- Program.cs
- test-scanner-performance.mjs
- test-vps-300-filas.mjs
- wr.ts
- Find Skills
- sync-inventario/route.ts
- cobros/types.ts
- matchesFuzzySearch
- graphify reference: extra exports and benchmark
- eslint.config.mjs
- FUENTE_VACIA_10bb5c65.md
- ref_node_fs
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
- components/InventarioJobsTab.tsx
- confirmDialog
- tib-mirror-daemon.mjs
- cruzar-planilla/route.ts
- SyncTibModal.tsx
- components/InventoryTab.tsx
- test-credentials.js
- ClipboardCopyDropdown.tsx
- manifestPdfGenerator.ts
- features_cobros_data_initial_lotes
- inventario-jobs/route.ts
- manager.ts
- alertDialog
- Cliente
- batch-sync/route.ts
- apiContracts.test.ts
- excelCobroParser.ts
- useDashboardData.ts
- Despliegue en VPS (Hostinger / Ubuntu)
- extract_table_rows
- sync-vercel-envs.mjs
- uploadFileToR2
- useDashboardNavigation.ts
- InventoryFilterBar.tsx
- ExcelExportDropdown.tsx
- MockElement
- Badge.tsx
- Logger
- components/ScannerTab.tsx
- next_types_root_params_d
- next_types_routes_d
- recuperar-password/route.ts
- ref_fs
- useCobrosOperaciones.ts
- read-excel-file
- .ReadRowValues
- sendEmail
- .WarmUpSources
- analyze-oct-week.mjs
- security-check.mjs
- Button.tsx
- check-vercel-envs.mjs
- inspect-usuarios.mjs
- test-admin-capabilities.mjs
- test-generate-link.mjs
- .PatchInventory
- components/LiveSheetsTab.tsx
- shalom-boletas/route.ts
- resend
- ProcessorDaemon
- extraer-clientes-tib.mjs
- security-secrets.md
- tarifas/route.ts
- analisis-clientes.mjs
- .CopyXmlNode
- register
- CachedSourceData
- InventoryToolbar.tsx
- write-excel-file
- file-saver
- lucide-react
- MockElement
- xlsx
- useLiveSheetsData.ts
- portal-client.ts
- zod
- InventoryTable.tsx
- supabase.ts
- users/route.ts
- LiveSheetsBottomBar.tsx
- scanner.ts
- ref_node_path
- CobroDeliveryModal.tsx
- test-daily-tib-flow.mjs
- test-scanner-interruption.mjs

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
- `ConfiguracionTabProps` --references--> `Paquete`  [EXTRACTED]
  features/configuracion/components/ConfiguracionTab.tsx → types/index.ts
- `ClipboardCopyDropdownProps` --references--> `Paquete`  [EXTRACTED]
  features/inventory/components/ClipboardCopyDropdown.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (174 total, 28 thin omitted)

### Community 0 - "supabase/client.ts"
Cohesion: 0.16
Nodes (18): POST(), GET, handleGet(), AuditLogEntry, registrarAuditoria(), AUTH_COOKIE_OPTIONS, getRemainingSessionMs(), isSessionExpired() (+10 more)

### Community 1 - "components/DniMatrixTab.tsx"
Cohesion: 0.06
Nodes (58): features_dni_matrix_components_dni_matrix, DniDropzonePanel(), DniDropzonePanelProps, toDisplayAngle(), DniMatrixTab(), DniSlotEditor(), DniSlotEditorProps, DniSlotsGrid() (+50 more)

### Community 2 - "Program"
Cohesion: 0.12
Nodes (17): int, long, object, CellData, CellKind, JsonSerializerOptions, string, HeaderColumn (+9 more)

### Community 3 - "DashboardTabContent.tsx"
Cohesion: 0.05
Nodes (55): BoletasShalomSkeleton(), CobrosSkeleton(), DashboardSkeleton(), DniMatrixSkeleton(), FormatoEntregaSkeleton(), InventorySkeleton(), InvoicesSkeleton(), LiveSheetsSkeleton() (+47 more)

### Community 4 - "main.py"
Cohesion: 0.09
Nodes (31): get, health_check(), process_manifest(), Procesa un PDF multipágina o imagen de manifiesto físico de TIB Courier: 1.…, request_context(), detect_modalidad_omr(), ndarray, Detecta cuál casilla de verificación está marcada en el encabezado (DOMICILIO,… (+23 more)

### Community 5 - "phoneUtils.ts"
Cohesion: 0.08
Nodes (42): EvidenciaPhotoModal(), EvidenciaPhotoModalProps, DespachoRutasTab, ChoferCardParada(), ChoferCardParadaProps, DespachoRutasTab(), formatFechaCreacion(), RutaBuilderModal() (+34 more)

### Community 6 - "useFormatoEntrega.ts"
Cohesion: 0.16
Nodes (20): FormatoEntregaTab, ActaControlPanel(), ActaControlPanelProps, ActaDocumentPreview(), ActaDocumentPreviewProps, features_formato_entrega_components_formato_entrega, FormatoEntregaTab(), FormatoEntregaTabProps (+12 more)

### Community 7 - "worker.js"
Cohesion: 0.06
Nodes (53): ref_node_http, createProcessorClient(), { spawn }, bootWarmUpTibIndices(), candidateEnvPaths, { createProcessorClient }, cruzarFilasCobros(), crypto (+45 more)

### Community 8 - "getSupabaseAdmin"
Cohesion: 0.09
Nodes (42): GET(), POST(), requireAdmin(), RESTORABLE_MODULES, dynamic, POST(), dynamic, GET() (+34 more)

### Community 9 - "components/BoletasShalomTab.tsx"
Cohesion: 0.12
Nodes (28): ShalomTableSkeleton(), features_boletas_shalom_components_boletas_shalom, BoletasShalomTab(), ShalomFilterBar(), ShalomFilterBarProps, ShalomHeader(), ShalomHeaderProps, ShalomKpiGrid() (+20 more)

### Community 10 - "cost-tracker.ts"
Cohesion: 0.17
Nodes (13): AnalyzeShalomSchema, POST, ExtractDniSchema, POST, ParseRotuloSchema, POST, AiUsageRecord, checkDailyThreshold() (+5 more)

### Community 11 - "components/RotulosA4Tab.tsx"
Cohesion: 0.13
Nodes (32): AmexitoAiRotulosPanel(), AmexitoAiRotulosPanelProps, features_rotulos_components_rotulos_a4, RotulosA4Tab(), RotulosA4TabProps, RotulosHistoryModal(), RotulosHistoryModalProps, RotulosSheetDropdown() (+24 more)

### Community 12 - "dialog.ts"
Cohesion: 0.15
Nodes (18): DialogProvider(), GlobalDialogModal(), GlobalDialogModalProps, VARIANT_COLORS, VARIANT_ICONS, AlertDialogOptions, ConfirmDialogOptions, DialogItem (+10 more)

### Community 13 - "ArmarPlanillaTab.tsx"
Cohesion: 0.16
Nodes (17): FilaResultadoCobro, ArmarPlanillaTab(), ArmarPlanillaTabProps, Fase, FiltroEstado, FuenteTibOpcion, aNumero(), aTexto() (+9 more)

### Community 14 - "test-real-flow.mjs"
Cohesion: 0.11
Nodes (17): batchId, envContent, filesToUpload, keys, r2AccessKey, r2AccountId, r2Root, r2SecretKey (+9 more)

### Community 15 - "components/AdminUsersTab.tsx"
Cohesion: 0.06
Nodes (42): app_globals, metadata, viewport, SmoothScrollContext, SmoothScrollProvider(), SmoothScrollProviderProps, useSmoothScroll(), ToastProvider() (+34 more)

### Community 16 - "analyzer.ts"
Cohesion: 0.17
Nodes (22): POST, analyzeInvoiceDocument(), analyzeShalomBoletaPdf(), callOpenAiResponsesUltrafast(), DEFAULT_OPENAI_MODEL, DNI_AI_MODEL, DNI_JSON_SCHEMA, extractDniNameFromImage() (+14 more)

### Community 17 - "excelExport.ts"
Cohesion: 0.15
Nodes (19): AuditoriaTab(), AuditRecord, AuditoriaTab, useInventoryData(), exportClientesToExcel(), exportCobrosToExcel(), exportEntregasToExcel(), exportHojaDeRutaToExcel() (+11 more)

### Community 19 - "paquetes/route.ts"
Cohesion: 0.10
Nodes (22): GET(), mapPaqueteRow(), POST(), LoginInput, LoginSchema, UserUpdateInput, UserUpdateSchema, AssignShelfSchema (+14 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 21 - "ui/index.ts"
Cohesion: 0.24
Nodes (12): Input, InputProps, Select, SelectProps, Table, TableBody, TableCell, TableFooter (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/s3-request-presigner, docx, html5-qrcode, jspdf, jszip, lenis, next, openai (+21 more)

### Community 23 - "HalloweenBackdrop.tsx"
Cohesion: 0.13
Nodes (20): LoginPage(), createBatSprite(), createGhostSprite(), createHarvestMoonSprite(), createHorizonSprite(), createNightCloudSprite(), createPumpkinSprite(), createSkullSprite() (+12 more)

### Community 25 - "types/index.ts"
Cohesion: 0.08
Nodes (21): TableSkeleton(), KardexView(), KardexViewProps, InventoryPagination, UseInventoryQueryOptions, parseAndMatchWrs(), parseBulkCodes(), parseLocation() (+13 more)

### Community 26 - "useInventoryData.ts"
Cohesion: 0.18
Nodes (19): ConfiguracionTabProps, GestorAlmacenView(), GestorAlmacenViewProps, EditPositionModal(), EditPositionModalProps, ShelfPositionModal(), ShelfPositionModalProps, TransferModalProps (+11 more)

### Community 27 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, selfsigned, supabase (+23 more)

### Community 28 - "useInvoice.ts"
Cohesion: 0.17
Nodes (17): InvoicesTab, InvoiceControlPanel(), InvoiceControlPanelProps, InvoiceDocumentPreview(), InvoiceDocumentPreviewProps, features_invoices_components_invoices, InvoicesTab(), InvoicesTabProps (+9 more)

### Community 29 - "Paquete"
Cohesion: 0.10
Nodes (18): ThermalLabelModal, ThermalLabelModal(), ThermalLabelModalProps, InventoryHeaderProps, InventoryStatsCards(), InventoryStatsCardsProps, ShelfMatrixGridProps, TibOperationsDropdown() (+10 more)

### Community 30 - "worker/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @aws-sdk/client-s3, xlsx, description, engines, node, @aws-sdk/client-s3, xlsx (+5 more)

### Community 31 - "registry.ts"
Cohesion: 0.12
Nodes (24): DashboardPage(), Sidebar(), SidebarProps, OperatorHubTab, OperatorHubTab(), OperatorHubTabProps, COBROS_SUBMODULES, getAvailableModulesForUser() (+16 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "syncTibToPortal.ts"
Cohesion: 0.22
Nodes (12): GET(), getEstadoVisiblePortal(), PaqueteSyncData, syncPackagesToClientPortal(), ADMIN_MASTER_EMAIL, cleanExactString(), fetchTibStatus(), getEstadoVisiblePortal() (+4 more)

### Community 34 - "securityAlerts.ts"
Cohesion: 0.33
Nodes (6): dynamic, POST(), SECURITY_ALERT_RECIPIENTS, SecurityAlertPayload, SecurityAlertType, sendSecurityAlert()

### Community 35 - "scripts"
Cohesion: 0.10
Nodes (19): name, private, scripts, build, dev, dev:https, doctor, lint (+11 more)

### Community 36 - "gen-certs.mjs"
Cohesion: 0.40
Nodes (3): certDir, certPath, keyPath

### Community 37 - "whatsappGenerator.ts"
Cohesion: 0.50
Nodes (3): generateDriverWhatsAppUrl(), sanitizePeruvianPhoneNumber(), WhatsAppMessageParams

### Community 38 - "AmexInventoryProcessor.csproj"
Cohesion: 0.50
Nodes (3): net8.0, DocumentFormat.OpenXml (3.3.0), Microsoft.NET.Sdk

### Community 40 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, outputDirectory, version

### Community 44 - "test-api-scanner-batch.mjs"
Cohesion: 0.33
Nodes (3): adminSupabase, envContent, serviceKey

### Community 45 - "r2/client.ts"
Cohesion: 0.08
Nodes (42): dynamic, GET(), POST(), POST(), SLOTS, DELETE(), GET(), getLimaDateString() (+34 more)

### Community 46 - "app/page.tsx"
Cohesion: 0.19
Nodes (13): NewClientModal, NewPackageModal, HeaderBar(), HeaderBarProps, NewClientFormData, NewClientModalProps, NewPkgFormData, DashboardTabContent() (+5 more)

### Community 47 - "cleanup-test-data.mjs"
Cohesion: 0.22
Nodes (7): __dirname, envPath, envVars, __filename, isProdSupabase, s3, supabase

### Community 48 - "request-context.ts"
Cohesion: 0.28
Nodes (12): ApiHandler, withErrorHandler(), apiSuccess, API_CONTRACT_VERSION, applyContractHeaders(), applyRequestContextHeaders(), CONTRACT_VERSION_HEADER, CORRELATION_ID_HEADER (+4 more)

### Community 49 - "Program.cs"
Cohesion: 0.15
Nodes (13): documentformat_openxml_packaging, documentformat_openxml_spreadsheet, system_diagnostics, system_globalization, system_io_compression, system_text, system_text_json, system_xml (+5 more)

### Community 51 - "test-scanner-performance.mjs"
Cohesion: 0.32
Nodes (6): envContent, run(), supabase, testBatch, testCurrentSequentialMethod(), testOptimizedBatchMethod()

### Community 52 - "test-vps-300-filas.mjs"
Cohesion: 0.29
Nodes (6): buf, data, filas, instructivoPath, t0, wb

### Community 53 - "wr.ts"
Cohesion: 0.24
Nodes (16): NewPackageModal(), NewPackageModalProps, UBICACIONES_RAPIDAS, useDashboardActions(), ProcessedSessionBatch, ScannerBulkLocationView(), ScannerBulkLocationViewProps, cleanWr() (+8 more)

### Community 54 - "Find Skills"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 55 - "sync-inventario/route.ts"
Cohesion: 0.11
Nodes (32): enriquecerConTibApiEnVivo(), dynamic, maxDuration, POST(), dynamic, getLimaDateString(), maxDuration, POST() (+24 more)

### Community 56 - "cobros/types.ts"
Cohesion: 0.17
Nodes (16): CobrosDailySheetView(), CobrosExcelImporterModal(), CobrosKpiCardsProps, CobrosListProps, CobrosToolbarProps, NewVoucherFormProps, UseVoucherFormProps, VoucherViewerModal() (+8 more)

### Community 57 - "matchesFuzzySearch"
Cohesion: 0.50
Nodes (7): useCobrosData(), useVoucherForm(), cleanAlphanumeric(), extractDigits(), matchesFuzzySearch(), normalizeText(), stripLeadingZeros()

### Community 58 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 61 - "ref_node_fs"
Cohesion: 0.22
Nodes (8): ref_node_child_process, ref_node_fs, ref_node_os, checks, commandAvailable(), localCommandAvailable(), root, tmpDir

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
Cohesion: 0.21
Nodes (18): FormulaBar(), FormulaBarProps, SpreadsheetGrid(), SpreadsheetGridProps, UseLiveSheetsKeyboardProps, UseLiveSheetsPresenceProps, ActiveCell, ANIMAL_ALIASES (+10 more)

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

### Community 81 - "confirmDialog"
Cohesion: 0.18
Nodes (11): PdfViewerModal, PdfViewerModal(), PdfViewerModalProps, PhotoItem, PhotoViewerModal(), PhotoViewerModalProps, ConfiguracionTab(), ManifestDetailRow (+3 more)

### Community 82 - "tib-mirror-daemon.mjs"
Cohesion: 0.16
Nodes (14): cleanExactString(), daemonWrStatusCache, __dirname, __filename, getEstadoVisiblePortal(), intervalId, normalizeTibWr(), notifyClientDeliveredPackage() (+6 more)

### Community 83 - "cruzar-planilla/route.ts"
Cohesion: 0.22
Nodes (15): aNumero(), construirIndiceMultiestado(), CruzarPlanillaSchema, dynamic, enriquecerConSupabasePaquetes(), esKeyValida(), FilaCruzarInput, indiceKeyPara() (+7 more)

### Community 84 - "SyncTibModal.tsx"
Cohesion: 0.18
Nodes (9): MAX_WIDTH_MAP, Modal(), ModalProps, JobProgress, SyncTibModal(), SyncTibModalProps, TIB_CONFIG, TibFileInfo (+1 more)

### Community 85 - "components/InventoryTab.tsx"
Cohesion: 0.13
Nodes (14): InventorySubTabsProps, InventoryTabProps, BatchStatusModal(), BatchStatusModalProps, BulkStatusByWrModal(), BulkStatusByWrModalProps, EditPackageModal(), EditPackageModalProps (+6 more)

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
Cohesion: 0.15
Nodes (17): GET, handleGet(), handlePost(), isXlsxKey(), POST, purgeCompletedAndStaleJobs(), SOURCE_KEY_FIELD, VALID_SOURCES (+9 more)

### Community 92 - "manager.ts"
Cohesion: 0.29
Nodes (6): LENIS_CONFIG, ManagedScroller, MODAL_BACKDROP_SELECTOR, PREVENT_ATTRIBUTE, SCROLL_ATTRIBUTE, SCROLL_SELECTOR

### Community 93 - "alertDialog"
Cohesion: 0.21
Nodes (11): CobroPaymentModalContent(), CobrosExcelImporterModalContent(), ManifiestosTibTab, HeaderData, ManifestRow, ManifiestosTibTab(), ReconciliationData, TibMiamiRadarView() (+3 more)

### Community 94 - "Cliente"
Cohesion: 0.13
Nodes (22): CobrosDailySheetViewProps, CobrosTab(), Client360Modal, DirectorioClienteModal(), DirectorioClienteModalProps, DirectorioClientesTab(), DirectorioClientesTabProps, Clientes360View (+14 more)

### Community 95 - "batch-sync/route.ts"
Cohesion: 0.17
Nodes (22): POST(), handleBatchSync(), isValidUuid(), POST, scannerLogger, formatZodError(), validateBody(), validateQuery() (+14 more)

### Community 96 - "apiContracts.test.ts"
Cohesion: 0.18
Nodes (10): ApiErrorSchema, CreateInventarioJobInput, CreateInventarioJobSchema, PresignUploadInput, PresignUploadSchema, TibFuenteSchema, BatchSyncScannerInput, BatchSyncScannerSchema (+2 more)

### Community 97 - "excelCobroParser.ts"
Cohesion: 0.38
Nodes (8): RegistrarCobroDiarioModalContent(), extractWeightsList(), ParsedExcelCobroResult, ParsedWrRow, parseExcelCobroBlock(), parseNumericValue(), parsePesoTotal(), splitTsvRows()

### Community 98 - "useDashboardData.ts"
Cohesion: 0.18
Nodes (13): mapCliente(), mapPaquete(), mapRealtimeCliente(), mapRealtimePaquete(), useDashboardData(), mapPaqueteDbRow(), ScannerQueueCloudService, LEVEL_LESS_LOCATIONS (+5 more)

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
Cohesion: 0.30
Nodes (17): POST(), POST(), POST(), detectAndDeskew(), maxDuration, POST(), POST(), CobrosList() (+9 more)

### Community 107 - "useDashboardNavigation.ts"
Cohesion: 0.36
Nodes (8): isDashboardTab(), useDashboardNavigation(), VALID_DASHBOARD_TABS, migrateLegacyHash(), PATH_TO_TAB, pathToTab(), TAB_TO_PATH, tabToPath()

### Community 109 - "InventoryFilterBar.tsx"
Cohesion: 0.39
Nodes (9): InventoryFilterBar(), InventoryFilterBarProps, DateFilterState, getDateFilterSummary(), initialDateFilter, isPackageInDateFilter(), MONTH_NAMES, resolveDateFilterRange() (+1 more)

### Community 110 - "ExcelExportDropdown.tsx"
Cohesion: 0.24
Nodes (10): badgeStyle(), dropdownItemStyle, ExcelExportDropdown(), ExcelExportDropdownProps, buildClientSummary(), buildEnAlmacenReport(), ClientSummaryItem, EnAlmacenRow (+2 more)

### Community 112 - "Badge.tsx"
Cohesion: 0.40
Nodes (5): Badge(), BadgeProps, DOT_MAP, getVariantFromStatus(), VARIANT_MAP

### Community 113 - "Logger"
Cohesion: 0.20
Nodes (4): GET(), LogEntry, Logger, LogLevel

### Community 114 - "components/ScannerTab.tsx"
Cohesion: 0.21
Nodes (9): BarcodeBoundingBox, CameraDeviceOption, MobileScannerModalProps, ScannerTab, formatOperatorName(), MobileScannerModal, ScannerTab(), ScannerTabProps (+1 more)

### Community 117 - "recuperar-password/route.ts"
Cohesion: 0.50
Nodes (4): dynamic, getDeviceSummary(), POST(), requestCooldownMap

### Community 119 - "ref_fs"
Cohesion: 0.15
Nodes (7): ref_fs, env, supabase, envContent, matchKey, envContent, matchKey

### Community 120 - "useCobrosOperaciones.ts"
Cohesion: 0.11
Nodes (29): CobroPaymentModal(), CobroPaymentModalProps, CobrosExcelImporterModalProps, INITIAL_COBROS_LOTES, ExcelCobrosParser, SheetParseResult, WorkbookParseResult, DEFAULT_COTIZACION (+21 more)

### Community 123 - ".ReadRowValues"
Cohesion: 0.26
Nodes (5): HeaderInfo, IEnumerable, List, WorksheetPart, XElement

### Community 124 - "sendEmail"
Cohesion: 0.15
Nodes (14): dynamic, POST(), sendPackageDeliveredEmail(), SendPackageDeliveredEmailOptions, sendPackageFlightEmail(), SendPackageFlightEmailOptions, sendPackageReceptionEmail(), SendPackageReceptionEmailOptions (+6 more)

### Community 125 - ".WarmUpSources"
Cohesion: 0.22
Nodes (4): CachedSourceData, SharedStringTablePart, WorkbookPart, WorksheetInfo

### Community 126 - "analyze-oct-week.mjs"
Cohesion: 0.29
Nodes (7): downloadR2Buffer(), env, envContent, envPath, r2AccountId, run(), s3

### Community 127 - "security-check.mjs"
Cohesion: 0.15
Nodes (9): ref_path, envConfig, getStagedOrTrackedFiles(), IGNORE_DIRS, IGNORE_FILES, runCheck(), SECRET_PATTERNS, OFFICIAL_ROLES (+1 more)

### Community 128 - "Button.tsx"
Cohesion: 0.40
Nodes (3): ButtonProps, SIZE_MAP, VARIANT_MAP

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

### Community 134 - "components/LiveSheetsTab.tsx"
Cohesion: 0.18
Nodes (12): ParsedItem, PasteWrListModal(), PasteWrListModalProps, features_live_sheets_components_live_sheets, LiveSheetsTab(), LiveSheetsToolbar(), LiveSheetsToolbarProps, useLiveSheetsKeyboard() (+4 more)

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
Nodes (4): Action, Stream, XmlReader, XmlWriter

### Community 150 - "CachedSourceData"
Cohesion: 0.40
Nodes (4): DateTime, SourceRecord, WorkbookValidation, CachedSourceData

### Community 151 - "InventoryToolbar.tsx"
Cohesion: 0.22
Nodes (10): InventoryHeader(), InventorySelectionBar(), InventorySelectionBarProps, InventoryToolbar(), InventoryToolbarProps, RowActionsDropdown(), RowActionsDropdownProps, copyPackagesTableAsImage() (+2 more)

### Community 161 - "useLiveSheetsData.ts"
Cohesion: 0.24
Nodes (11): NewSheetModal(), NewSheetModalProps, features_live_sheets_components_sheets_hub, SheetsHub(), SheetsHubProps, useLiveSheetsData(), sheetsService, extractLast6Digits() (+3 more)

### Community 165 - "InventoryTable.tsx"
Cohesion: 0.32
Nodes (6): InventoryTable(), InventoryTableProps, ConfirmDeliveryModal(), ConfirmDeliveryModalProps, formatFechaModificadoParts(), TipoModalidadEntrega

### Community 166 - "supabase.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 167 - "users/route.ts"
Cohesion: 0.48
Nodes (5): GET(), POST(), requireAdmin(), sendUserWelcomeEmail(), SendWelcomeEmailOptions

### Community 168 - "LiveSheetsBottomBar.tsx"
Cohesion: 0.31
Nodes (8): formatStatNumber(), LiveSheetsBottomBar(), LiveSheetsBottomBarProps, LiveSheetsHeader(), LiveSheetsHeaderProps, Collaborator, SelectionStats, SheetStats

### Community 169 - "scanner.ts"
Cohesion: 0.36
Nodes (8): BaseScanExtra, DeliveryScanExtra, GeneralScanExtra, LookupScanExtra, OnScanConfirmHandler, RelocateScanExtra, ScanWorkflowMode, SlottingScanExtra

### Community 170 - "ref_node_path"
Cohesion: 0.29
Nodes (4): ref_node_path, invHeaders, invRows, outDir

### Community 171 - "CobroDeliveryModal.tsx"
Cohesion: 0.40
Nodes (5): CobroDeliveryModal(), CobroDeliveryModalContent(), CobroDeliveryModalProps, TipoRetirante, features_cobros_types_tiporetirante

### Community 172 - "test-daily-tib-flow.mjs"
Cohesion: 0.33
Nodes (4): envContent, supabase, supabaseKey, supabaseUrl

### Community 173 - "test-scanner-interruption.mjs"
Cohesion: 0.40
Nodes (4): localQueue, resilientDB, resilientQueue, uploadedToDB

## Knowledge Gaps
- **613 isolated node(s):** `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema`, `ParseRotuloSchema`, `RESTORABLE_MODULES` (+608 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Paquete` connect `Paquete` to `components/DniMatrixTab.tsx`, `DashboardTabContent.tsx`, `components/LiveSheetsTab.tsx`, `useFormatoEntrega.ts`, `excelExport.ts`, `paquetes/route.ts`, `InventoryToolbar.tsx`, `types/index.ts`, `useInventoryData.ts`, `registry.ts`, `useLiveSheetsData.ts`, `InventoryTable.tsx`, `scanner.ts`, `app/page.tsx`, `wr.ts`, `cobros/types.ts`, `live-sheets/types.ts`, `components/InventoryTab.tsx`, `ClipboardCopyDropdown.tsx`, `Cliente`, `useDashboardData.ts`, `ExcelExportDropdown.tsx`, `components/ScannerTab.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `getSupabaseAdmin()` connect `getSupabaseAdmin` to `supabase/client.ts`, `users/route.ts`, `uploadFileToR2`, `cost-tracker.ts`, `r2/client.ts`, `cruzar-planilla/route.ts`, `paquetes/route.ts`, `recuperar-password/route.ts`, `sync-inventario/route.ts`, `inventario-jobs/route.ts`, `batch-sync/route.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `alertDialog()` connect `alertDialog` to `phoneUtils.ts`, `components/BoletasShalomTab.tsx`, `dialog.ts`, `excelExport.ts`, `InventoryToolbar.tsx`, `SoundSynthesizer`, `useInventoryData.ts`, `useInvoice.ts`, `Paquete`, `useLiveSheetsData.ts`, `LiveSheetsBottomBar.tsx`, `CobroDeliveryModal.tsx`, `wr.ts`, `cobros/types.ts`, `matchesFuzzySearch`, `confirmDialog`, `components/InventoryTab.tsx`, `ClipboardCopyDropdown.tsx`, `Cliente`, `excelCobroParser.ts`, `ExcelExportDropdown.tsx`, `components/ScannerTab.tsx`, `useCobrosOperaciones.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `dynamic`, `AnalyzeShalomSchema`, `ExtractDniSchema` to the rest of the system?**
  _613 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/DniMatrixTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05877742946708464 - nodes in this community are weakly interconnected._
- **Should `Program` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `DashboardTabContent.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05485232067510549 - nodes in this community are weakly interconnected._