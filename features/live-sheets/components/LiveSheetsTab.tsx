'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { soundEffects } from '@/lib/audio/soundEffects';
import PasteWrListModal from '@/components/modals/PasteWrListModal';
import NewSheetModal from '@/components/modals/NewSheetModal';
import MobileScannerModal from '@/components/scanner/MobileScannerModal';
import SheetsHub from './SheetsHub';
import './live-sheets.css';

import type { LiveSheetsTabProps } from '../types';
import { useLiveSheetsData } from '../hooks/useLiveSheetsData';
import { useLiveSheetsPresence } from '../hooks/useLiveSheetsPresence';
import { useLiveSheetsKeyboard } from '../hooks/useLiveSheetsKeyboard';
import { sheetsService } from '../services/sheets.service';
import { LiveSheetsHeader } from './LiveSheetsHeader';
import { LiveSheetsBottomBar } from './LiveSheetsBottomBar';

const UniverAmexSheet = dynamic(() => import('./UniverAmexSheet'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#475569',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 600
      }}
    >
      <div className="gsheet-spinner" />
      <span>Cargando motor de hoja de cálculo Univer...</span>
    </div>
  )
});

// Re-export types and constants for backwards compatibility
export * from '@/features/live-sheets/types';

export default function LiveSheetsTab({
  paquetes = [],
  clientes = [],
  currentUser
}: LiveSheetsTabProps) {
  const operatorName = currentUser?.nombre || 'Operador Lince';

  // 1. Hook para datos, cálculos de filas 1:1 y estadísticas
  const data = useLiveSheetsData({
    paquetes,
    operatorName
  });

  // 2. Hook para presencia en tiempo real y cursores remotos
  const presence = useLiveSheetsPresence({
    activeHojaId: data.activeHojaId,
    currentUser,
    activeCell: { col: 'D', row: 2, val: '' },
    setItems: data.setItems,
    setHojas: data.setHojas,
    setDocTitle: data.setDocTitle
  });

  // 3. Hook para lógica de escaneo por pistola láser, voz TTS y sincronización de celdas
  const keyboard = useLiveSheetsKeyboard({
    activeHojaId: data.activeHojaId,
    templateMode: data.activeTemplateMode,
    hojas: data.hojas,
    setHojas: data.setHojas,
    items: data.items,
    setItems: data.setItems,
    visibleRows: data.visibleRows,
    paquetes,
    operatorName: presence.operatorName,
    checkCodeInManifest: data.checkCodeInManifest,
    handleClearScanAtRow: data.handleClearScanAtRow,
    broadcastActiveCell: presence.broadcastActiveCell,
    fetchItems: data.fetchItems
  });

  // Si no hay hoja o libro abierto, mostrar el Hub de Hojas de Cálculo
  if (!data.activeHojaId && !data.activeLibroId) {
    return (
      <SheetsHub
        hojas={data.libros}
        isLoading={data.isLoadingSheets}
        currentUser={currentUser}
        onOpenSheet={sheetId => {
          data.openWorkbook(sheetId);
        }}
        onCreateSheet={data.handleCreateSheetFromHub}
        onRenameSheet={data.handleRenameSheetFromHub}
        onDeleteSheet={data.handleDeleteSheetFromHub}
        onDuplicateSheet={data.handleDuplicateSheetFromHub}
      />
    );
  }

  return (
    <div className="gsheet-container">
      {/* Barra superior minimalista de control AMEX WR */}
      <LiveSheetsHeader
        activeHojaId={data.activeLibroId || data.activeHojaId || ''}
        templateMode={data.activeTemplateMode}
        docTitle={data.docTitle}
        setDocTitle={data.setDocTitle}
        onTitleBlur={data.handleTitleBlur}
        isStarred={data.isStarred}
        setIsStarred={data.setIsStarred}
        realtimeStatus={presence.realtimeStatus}
        collaborators={presence.collaborators}
        stats={data.stats}
        onBackToHub={data.closeWorkbook}
        onExportExcel={data.handleExportExcel}
        onOpenPasteModal={() => keyboard.setIsPasteModalOpen(true)}
        onFocusBarcodeInput={keyboard.focusBarcodeInput}
        onLoadFromDatabase={data.handleLoadFromDatabase}
        onResetScans={data.handleResetScans}
        barcodeInput={keyboard.barcodeInput}
        setBarcodeInput={keyboard.setBarcodeInput}
        barcodeInputRef={keyboard.barcodeInputRef}
        onManualScanSubmit={keyboard.handleManualScanSubmit}
        onOpenCameraScanner={() => keyboard.setIsCameraScannerOpen(true)}
        isMuted={keyboard.isMuted}
        setIsMuted={keyboard.setIsMuted}
        isVoiceEnabled={keyboard.isVoiceEnabled}
        setIsVoiceEnabled={keyboard.setIsVoiceEnabled}
        onSyncToMainPackages={data.handleSyncToMainPackages}
      />

      {/* Motor de hoja de cálculo Univer (Canvas de alto rendimiento, barra de herramientas y fx nativos) */}
      <UniverAmexSheet
        activeHojaId={data.activeHojaId || ''}
        templateMode={data.activeTemplateMode}
        docTitle={data.docTitle}
        isLoadingItems={data.isLoadingItems}
        items={data.items}
        setItems={data.setItems}
        sheetRows={data.sheetRows}
        paquetes={paquetes}
        operatorName={presence.operatorName}
        extraCells={keyboard.extraCells}
        setExtraCells={keyboard.setExtraCells}
        persistExtraCells={keyboard.persistExtraCells}
        resolveScannedCodeMatch={keyboard.resolveScannedCodeMatch}
        playScanFeedback={keyboard.playScanFeedback}
        activeCell={keyboard.activeCell}
        setActiveCell={keyboard.setActiveCell}
        setSelectionRange={keyboard.setSelectionRange}
        broadcastActiveCell={presence.broadcastActiveCell}
      />

      {/* Barra inferior de pestañas de hojas + estadísticas rápidas */}
      <LiveSheetsBottomBar
        hojas={data.activeBookSheets}
        activeHojaId={data.activeHojaId || ''}
        setActiveHojaId={data.setActiveHojaId}
        onAddSheet={() => data.handleAddSubSheet()}
        onRenameSheet={data.handleRenameTab}
        onDuplicateSheet={data.handleDuplicateTab}
        onDeleteSheet={data.handleDeleteTab}
        totalRows={data.items.length}
        stats={data.stats}
        selectionStats={keyboard.selectionStats}
      />

      {/* Modales */}
      <PasteWrListModal
        isOpen={keyboard.isPasteModalOpen}
        onClose={() => keyboard.setIsPasteModalOpen(false)}
        paquetes={paquetes}
        onImport={async importedItems => {
          if (!data.activeHojaId || importedItems.length === 0) return;

          const rowsToInsert = importedItems.map((it, idx) => ({
            hoja_id: data.activeHojaId!,
            codigo_wr: it.codigoWr,
            casillero: it.casillero || it.codigoWr.replace(/^[A-Za-z]+0*/, ''),
            tracking: '',
            consignatario: it.consignatario || '',
            peso_kg: it.pesoKg || 0,
            posicion_estante: it.posicionEstante || 'REC',
            notas: '',
            estado: 'PENDIENTE',
            veces_escaneado: 0,
            orden: data.items.length + idx + 1
          }));

          try {
            await sheetsService.insertItems(rowsToInsert);
            soundEffects.playBulkLoaded();
            data.fetchItems(data.activeHojaId);
            keyboard.setIsPasteModalOpen(false);
          } catch (error) {
            console.error('[LiveSheetsTab] Error importando filas:', error);
          }
        }}
      />

      <NewSheetModal
        isOpen={keyboard.isNewSheetModalOpen}
        onClose={() => keyboard.setIsNewSheetModalOpen(false)}
        operatorName={presence.operatorName}
        onCreated={newSheet => {
          data.fetchHojas();
          data.setActiveHojaId(newSheet.id);
          data.setDocTitle(newSheet.titulo || 'AMEX WR');
          keyboard.setIsNewSheetModalOpen(false);
        }}
      />

      <MobileScannerModal
        isOpen={keyboard.isCameraScannerOpen}
        onClose={() => keyboard.setIsCameraScannerOpen(false)}
        onConfirm={code => {
          keyboard.processBarcodeScan(code);
        }}
        paquetes={paquetes}
        clientes={clientes}
      />
    </div>
  );
}
