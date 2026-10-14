'use client';

import React, { useState } from 'react';
import { Warehouse, Plus, RefreshCw, Check, PackagePlus } from 'lucide-react';
import { Paquete } from '@/types';
import ExcelExportDropdown from './ExcelExportDropdown';
import TibOperationsDropdown from './TibOperationsDropdown';
import ClipboardCopyDropdown from './ClipboardCopyDropdown';
import InventoryStatsCards from './InventoryStatsCards';
import { alertDialog } from '@/lib/dialog';
import { soundEffects } from '@/lib/audio/soundEffects';

export interface InventoryHeaderProps {
  paquetes: Paquete[];
  filteredPaquetes: Paquete[];
  selectedIds: string[];
  missingTibImagesCount?: number;
  onOpenSyncTibModal?: () => void;
  onOpenBulkWrModal?: () => void;
  onOpenSyncTibImagesModal?: () => void;
  onExportExcel: () => void;
  onRefreshData?: () => Promise<void> | void;
  onNewPackage: () => void;
  statusAmexFilter?: string;
  setStatusAmexFilter?: (status: string) => void;
  serverExistenciasActivas?: number;
  serverPesoTotalKg?: number;
  children?: React.ReactNode;
}

export default function InventoryHeader({
  paquetes,
  filteredPaquetes,
  selectedIds,
  missingTibImagesCount = 0,
  onOpenSyncTibModal,
  onOpenBulkWrModal,
  onOpenSyncTibImagesModal,
  onRefreshData,
  onNewPackage,
  statusAmexFilter,
  setStatusAmexFilter,
  serverExistenciasActivas,
  serverPesoTotalKg,
  children
}: InventoryHeaderProps) {
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!onRefreshData || refreshState === 'loading') return;
    setRefreshState('loading');
    const startTime = Date.now();
    try {
      await onRefreshData();
      // Garantizar que la animación se aprecie fluidamente (mínimo 650ms)
      const elapsed = Date.now() - startTime;
      if (elapsed < 650) {
        await new Promise(resolve => setTimeout(resolve, 650 - elapsed));
      }
      setRefreshState('success');
      const now = new Date();
      setLastRefreshedAt(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      soundEffects.playSuccess();
      setTimeout(() => {
        setRefreshState('idle');
      }, 2200);
    } catch (err) {
      console.error('Error al sincronizar datos de inventario:', err);
      soundEffects.playNotFound();
      setRefreshState('idle');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        flexWrap: 'wrap',
        gap: '12px 20px'
      }}
    >
      {/* Columna Izquierda: Título en la parte superior y Acciones uniformes en la parte inferior */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
          flex: '1 1 auto',
          minWidth: '320px'
        }}
      >
        {/* Título y Subtítulo */}
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            <Warehouse className="w-5 h-5 text-blue-600" />
            3. Inventario
          </h1>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.3 }}>
            Existencias activas, slotting WMS, custodia física y entregas
          </p>
        </div>

        {/* Fila de Herramientas y Acciones Operativas Uniformes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Dropdown de Operaciones TIB */}
          <TibOperationsDropdown
            onOpenSyncTibModal={onOpenSyncTibModal}
            onOpenBulkWrModal={onOpenBulkWrModal}
            onOpenSyncTibImagesModal={onOpenSyncTibImagesModal}
            missingTibImagesCount={missingTibImagesCount}
          />

          {/* Dropdown de Exportación Excel */}
          <ExcelExportDropdown
            paquetes={paquetes}
            filteredPaquetes={filteredPaquetes}
            selectedIds={selectedIds}
          />

          {/* Dropdown de Opciones de Copiado al Portapapeles (Imagen, Texto, 2 Columnas, etc.) */}
          <ClipboardCopyDropdown
            paquetes={paquetes}
            filteredPaquetes={filteredPaquetes}
            selectedIds={selectedIds}
          />

          {/* Botón Actualizar Profesional y Animado */}
          {onRefreshData && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshState === 'loading'}
              className={`inv-refresh-btn ${
                refreshState === 'loading'
                  ? 'is-loading'
                  : refreshState === 'success'
                  ? 'is-success'
                  : ''
              }`}
              title={
                lastRefreshedAt
                  ? `Última sincronización exitosa a las ${lastRefreshedAt}. Clic para actualizar nuevamente.`
                  : 'Sincronizar inventario en tiempo real con Supabase'
              }
            >
              {refreshState === 'loading' ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 inv-refresh-icon-spin" />
              ) : refreshState === 'success' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 inv-refresh-pop" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 inv-refresh-icon-spin" />
              )}
              <span>
                {refreshState === 'loading'
                  ? 'Sincronizando...'
                  : refreshState === 'success'
                  ? '¡Actualizado!'
                  : 'Actualizar'}
              </span>
              {lastRefreshedAt && refreshState === 'idle' && (
                <span className="inv-refresh-timestamp">
                  {lastRefreshedAt.slice(0, 5)}
                </span>
              )}
            </button>
          )}

          {/* Botón Principal: Ingresar Paquete */}
          <button
            type="button"
            onClick={onNewPackage}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              border: 'none',
              color: '#ffffff',
              height: '33px',
              padding: '0 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 5px rgba(37,99,235,0.28)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <PackagePlus className="w-4 h-4" />
            <span>Ingresar Paquete</span>
          </button>
        </div>

        {/* Fila de Sub-Pestañas de Navegación */}
        {children && (
          <div style={{ marginTop: '2px' }}>
            {children}
          </div>
        )}
      </div>

      {/* Columna Derecha: Tarjetas KPI de Existencias y Custodia Apiladas ocupando la altura total */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <InventoryStatsCards
          paquetes={paquetes}
          statusAmexFilter={statusAmexFilter}
          setStatusAmexFilter={setStatusAmexFilter}
          serverExistenciasActivas={serverExistenciasActivas}
          serverPesoTotalKg={serverPesoTotalKg}
        />
      </div>
    </div>
  );
}
