'use client';

import type { Dispatch, SetStateAction } from 'react';
import type {
  Cliente,
  CobroVoucher,
  OrdenEntrega,
  Paquete,
  ScannedLog
} from '@/types';
import type { DashboardTabId } from '@/features/dashboard/hooks/useDashboardNavigation';
import type { DashboardScanExtra } from '@/features/dashboard/hooks/useDashboardActions';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  AdminUsersTab,
  AuditoriaTab,
  BoletasShalomTab,
  CobrosTab,
  ConfiguracionTab,
  DespachoRutasTab,
  DirectorioClientesTab,
  DniMatrixTab,
  DashboardTab,
  FormatoEntregaTab,
  InfoAmexTab,
  InventarioJobsTab,
  InvoicesTab,
  InventoryTab,
  LiveSheetsTab,
  ManifiestosTibTab,
  OperatorHubTab,
  RotulosA4Tab,
  ScannerTab
} from './dashboard-tab-registry';

interface DashboardTabContentProps {
  activeTab: DashboardTabId;
  isLoadingInitialData: boolean;
  isGlobalRefreshing: boolean;
  paquetes: Paquete[];
  clientes: Cliente[];
  entregas: OrdenEntrega[];
  cobros: CobroVoucher[];
  scannedLogs: ScannedLog[];
  currentUser: { nombre: string; email: string; rol: string; id?: string; permisos?: Record<string, unknown>; isAdmin?: boolean } | null;
  targetCliente360?: string;
  targetClienteCobros?: string;
  onNavigateTab: (tabId: string) => void;
  onNewPackage: () => void;
  onPrintLabel: (pkg: Paquete) => void;
  onViewPdf: (url: string) => void;
  onRefreshData: () => Promise<void>;
  onUpdatePackage: (pkg: Paquete) => void;
  onDeletePackage: (id: string) => void;
  onNavigateToClientes360: (clienteNombre?: string) => void;
  onNavigateToCobros: (clienteNombre?: string) => void;
  onOpenNewClientModal: () => void;
  onConfirmScan: (code: string, format: string, extra?: DashboardScanExtra) => void;
  onSlotPackage: (code: string, location: string) => void;
  onUpdateLogs: Dispatch<SetStateAction<ScannedLog[]>>;
}

export default function DashboardTabContent({
  activeTab,
  isLoadingInitialData,
  isGlobalRefreshing,
  paquetes,
  clientes,
  entregas,
  cobros,
  scannedLogs,
  currentUser,
  targetCliente360,
  targetClienteCobros,
  onNavigateTab,
  onNewPackage,
  onPrintLabel,
  onViewPdf,
  onRefreshData,
  onUpdatePackage,
  onDeletePackage,
  onNavigateToClientes360,
  onNavigateToCobros,
  onOpenNewClientModal,
  onConfirmScan,
  onSlotPackage,
  onUpdateLogs
}: DashboardTabContentProps) {
  if (isLoadingInitialData) {
    return <PageSkeleton activeTab={activeTab} />;
  }

  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    ['admin', 'administrador'].includes(String(currentUser?.rol || '').trim().toLowerCase())
  );

  return (
    <>
      {activeTab === 'dashboard' && (
        isAdmin ? (
          <DashboardTab
            paquetes={paquetes}
            clientes={clientes}
            entregas={entregas}
            cobros={cobros}
            onNavigateTab={onNavigateTab}
            onNewPackage={onNewPackage}
            onPrintLabel={onPrintLabel}
            onViewPdf={onViewPdf}
            onRefreshData={onRefreshData}
          />
        ) : (
          <OperatorHubTab
            currentUser={currentUser}
            paquetes={paquetes}
            scannedLogs={scannedLogs}
            onNavigateTab={onNavigateTab}
            onRefreshData={onRefreshData}
          />
        )
      )}

      {activeTab === 'live-sheets' && (
        <LiveSheetsTab
          paquetes={paquetes}
          clientes={clientes}
          currentUser={currentUser}
        />
      )}

      {(activeTab === 'mm-lince' || activeTab === 'mm-inventory') && (
        <InventoryTab
          paquetes={paquetes}
          clientes={clientes}
          onNewPackage={onNewPackage}
          onViewPdf={onViewPdf}
          onUpdatePackage={onUpdatePackage}
          onDeletePackage={onDeletePackage}
          onRefreshData={onRefreshData}
        />
      )}

      {(activeTab === 'fico-cobros' || activeTab === 'cobros-diario' || activeTab === 'cobros-armar-planilla') && (
        <CobrosTab
          paquetes={paquetes}
          clientes={clientes}
          onUpdatePackage={onUpdatePackage}
          onNavigateToClientes360={onNavigateToClientes360}
          filterClienteInicial={targetClienteCobros}
          activeSubTab={activeTab === 'cobros-armar-planilla' ? 'armar-planilla' : 'diario'}
          onChangeSubTab={(sub) => {
            onNavigateTab(sub === 'armar-planilla' ? 'cobros-armar-planilla' : 'cobros-diario');
          }}
        />
      )}

      {(activeTab === 'directorio-clientes' || activeTab === 'clientes-360') && (
        <DirectorioClientesTab
          paquetes={paquetes}
          clientes={clientes}
          initialClientName={targetCliente360}
          onNavigateToCobros={onNavigateToCobros}
          onOpenNewClientModal={onOpenNewClientModal}
        />
      )}

      {(activeTab === 'mobile-scanner' ||
        activeTab === 'scanner-slotting' ||
        activeTab === 'scanner-lookup' ||
        activeTab === 'scanner-delivery' ||
        activeTab === 'scanner-relocate' ||
        activeTab === 'scanner-masivo') && (
        <ScannerTab
          activeSubmodule={
            activeTab === 'scanner-lookup'
              ? 'lookup'
              : activeTab === 'scanner-delivery'
                ? 'delivery'
                : activeTab === 'scanner-relocate'
                  ? 'relocate'
                  : activeTab === 'scanner-masivo'
                    ? 'masivo'
                    : 'slotting'
          }
          onChangeSubmodule={(sub: 'slotting' | 'lookup' | 'delivery' | 'relocate' | 'masivo') => {
            onNavigateTab(`scanner-${sub}`);
          }}
          scannedLogs={scannedLogs}
          paquetes={paquetes}
          clientes={clientes}
          currentUser={currentUser}
          onConfirm={onConfirmScan}
          onSlotPackage={onSlotPackage}
          onUpdateLogs={onUpdateLogs}
          onRefreshData={onRefreshData}
        />
      )}

      {activeTab === 'dni-matrix' && (
        <DniMatrixTab
          paquetes={paquetes}
          clientes={clientes}
          currentUser={currentUser}
          onGlobalRefresh={onRefreshData}
          isRefreshing={isGlobalRefreshing}
        />
      )}

      {activeTab === 'rotulos-a4' && <RotulosA4Tab clientes={clientes} currentUser={currentUser} />}
      {activeTab === 'boletas-shalom' && <BoletasShalomTab />}

      {activeTab === 'formato-entrega' && (
        <FormatoEntregaTab clientes={clientes} paquetes={paquetes} currentUser={currentUser} />
      )}

      {(activeTab === 'invoices-usa' || activeTab === 'invoices') && (
        <InvoicesTab clientes={clientes} currentUser={currentUser} />
      )}

      {activeTab === 'info-amex' && <InfoAmexTab />}
      {activeTab === 'completar-inventario' && <InventarioJobsTab onNavigateTab={onNavigateTab} />}
      {activeTab === 'auditoria' && <AuditoriaTab />}
      {activeTab === 'admin-usuarios' && <AdminUsersTab />}
      {activeTab === 'despacho-rutas' && <DespachoRutasTab />}
      {activeTab === 'manifiestos-tib' && <ManifiestosTibTab onRefreshData={onRefreshData} />}
      {activeTab === 'configuracion' && (
        <ConfiguracionTab
          paquetes={paquetes}
          currentUser={currentUser}
          onNavigateTab={onNavigateTab}
        />
      )}
    </>
  );
}
