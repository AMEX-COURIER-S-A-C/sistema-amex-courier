'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Paquete
} from '@/types';
import dynamic from 'next/dynamic';
import HeaderBar from '@/components/HeaderBar';
import Sidebar from '@/components/Sidebar';
import { NewClientFormData } from '@/components/modals/NewClientModal';
import { NewPkgFormData } from '@/components/modals/NewPackageModal';
import { useDashboardNavigation, DashboardTabId } from '@/features/dashboard/hooks/useDashboardNavigation';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useDashboardActions } from '@/features/dashboard/hooks/useDashboardActions';
import { useDashboardSession } from '@/features/dashboard/hooks/useDashboardSession';
import DashboardTabContent from '@/features/dashboard/components/DashboardTabContent';
import { EMPTY_CLIENT_FORM, EMPTY_PKG_FORM } from '@/features/dashboard/data/default-forms';
import { hasModuleAccess, getFirstAvailableTab } from '@/lib/navigation/registry';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';
import { getLoginThemeTokens } from '@/lib/themes/seasonalConfig';
import { HalloweenBackdrop } from '@/components/themes/HalloweenBackdrop';

const NewClientModal = dynamic(() => import('@/components/modals/NewClientModal'), { ssr: false });
const NewPackageModal = dynamic(() => import('@/components/modals/NewPackageModal'), { ssr: false });
const ThermalLabelModal = dynamic(() => import('@/components/modals/ThermalLabelModal'), { ssr: false });
const PdfViewerModal = dynamic(() => import('@/components/modals/PdfViewerModal'), { ssr: false });

export default function DashboardPage() {
  const loginTheme = getLoginThemeTokens();
  const {
    activeTab,
    isSidebarCollapsed,
    setActiveTab,
    setIsSidebarCollapsed
  } = useDashboardNavigation();

  const [targetCliente360, setTargetCliente360] = useState<string | undefined>(undefined);
  const [targetClienteCobros, setTargetClienteCobros] = useState<string | undefined>(undefined);

  const handleNavigateToClientes360 = useCallback((clienteNombre?: string) => {
    setTargetCliente360(clienteNombre);
    setActiveTab('directorio-clientes');
  }, [setActiveTab]);

  const handleNavigateToCobros = useCallback((clienteNombre?: string) => {
    setTargetClienteCobros(clienteNombre);
    setActiveTab('fico-cobros');
  }, [setActiveTab]);

  const { currentUser, isLoadingSession, isLoggingOut, logout: handleLogout } = useDashboardSession();

  // Redirección reactiva: Si el usuario entra a una pestaña no permitida, llevarlo al primer módulo autorizado
  useEffect(() => {
    if (!currentUser || isLoadingSession || isLoggingOut) return;
    if (!hasModuleAccess(currentUser, activeTab)) {
      const fallbackTab = getFirstAvailableTab(currentUser);
      if (fallbackTab && fallbackTab !== activeTab) {
        setActiveTab(fallbackTab as DashboardTabId);
      }
    }
  }, [currentUser, isLoadingSession, isLoggingOut, activeTab, setActiveTab]);

  const smoothScroll = useSmoothScroll();

  // Reset de scroll y recalcular dimensiones de Lenis al cambiar de pestaña
  useEffect(() => {
    const mainLenis = smoothScroll.getMain();
    if (mainLenis) {
      mainLenis.scrollTo(0, { immediate: true });
      mainLenis.resize();

      // Segundo pase para asegurar dimensiones exactas tras el montaje asíncrono de cada módulo
      const timer = setTimeout(() => {
        mainLenis.resize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, smoothScroll]);

  const {
    clientes,
    paquetes,
    entregas,
    cobros,
    scannedLogs,
    setClientes,
    setPaquetes,
    setScannedLogs,
    fetchSupabaseData,
    isLoadingInitialData,
    isGlobalRefreshing
  } = useDashboardData(currentUser);

  // Sincronizar dimensiones de Lenis al finalizar la carga de datos iniciales o cambios de paquetes
  useEffect(() => {
    const mainLenis = smoothScroll.getMain();
    if (mainLenis) {
      mainLenis.resize();
    }
  }, [paquetes.length, isLoadingInitialData, smoothScroll]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedThermalPkg, setSelectedThermalPkg] = useState<Paquete | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewPkgModalOpen, setIsNewPkgModalOpen] = useState(false);

  const [newClientForm, setNewClientForm] = useState<NewClientFormData>(EMPTY_CLIENT_FORM);
  const [newPkgForm, setNewPkgForm] = useState<NewPkgFormData>(EMPTY_PKG_FORM);

  const dashboardActions = useDashboardActions({
    newClientForm,
    newPkgForm,
    currentUser,
    setClientes,
    setPaquetes,
    setScannedLogs,
    setNewClientForm,
    setNewPkgForm,
    setIsNewClientModalOpen,
    setIsNewPkgModalOpen,
    emptyClientForm: EMPTY_CLIENT_FORM,
    emptyPkgForm: EMPTY_PKG_FORM
  });

  const {
    handleUpdatePackage,
    handleDeletePackage,
    handleAssignPackageLocation,
    handleSaveClient,
    handleSavePackage,
    openNewClientModal,
    openNewPkgModal,
    handleScanCode
  } = dashboardActions;

  const isTabAllowed = currentUser ? hasModuleAccess(currentUser, activeTab) : false;
  const fallbackAllowedTab = currentUser ? getFirstAvailableTab(currentUser) : null;
  const isRedirectingInitialTab = Boolean(
    currentUser && !isTabAllowed && fallbackAllowedTab && fallbackAllowedTab !== activeTab
  );

  if (isLoadingSession || isRedirectingInitialTab || (!currentUser && !isLoggingOut)) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: loginTheme.pageBackground,
          color: '#f8fafc',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loginTheme.isHalloween && <HalloweenBackdrop />}
        <style>{`
          @keyframes amexProgressSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
          @keyframes amexCardPulse {
            0%, 100% { box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.18); }
            50% { box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.25); }
          }
        `}</style>
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '28px 36px',
            borderRadius: 20,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: loginTheme.shellBorder,
            boxShadow: loginTheme.shellShadow,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 380,
            width: '100%',
            textAlign: 'center',
            animation: 'amexCardPulse 2.4s ease-in-out infinite',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              background: 'rgba(9, 13, 22, 0.88)',
              border: loginTheme.logoBoxBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <img
              src="/images/logo-amex-clean.png"
              alt="AMEX Courier"
              style={{ height: 40, width: 'auto', objectFit: 'contain', filter: loginTheme.logoDropShadow }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ color: loginTheme.spinnerColor, fontSize: 15 }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.2px', color: '#f8fafc' }}>
              Preparando estación de trabajo
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.45 }}>
            Sincronizando credenciales y módulos operativos...
          </p>

          <div
            style={{
              width: '100%',
              height: 4,
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.07)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '45%',
                height: '100%',
                borderRadius: 999,
                background: loginTheme.progressGradient,
                animation: 'amexProgressSlide 1.15s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout-shell" style={{ animation: 'amexShellFadeIn 0.26s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <style>{`
        @keyframes amexShellFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes amexLogoutOverlayIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(14px); }
        }
        @keyframes amexLogoutCardIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes amexProgressSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      {isLoggingOut && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: loginTheme.isHalloween ? 'rgba(7, 4, 14, 0.88)' : 'rgba(7, 11, 20, 0.84)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: '#f8fafc',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: 24,
            animation: 'amexLogoutOverlayIn 0.2s ease-out forwards',
            overflow: 'hidden',
          }}
        >
          {loginTheme.isHalloween && <HalloweenBackdrop />}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '28px 36px',
              borderRadius: 20,
              background: 'rgba(15, 23, 42, 0.92)',
              border: loginTheme.shellBorder,
              boxShadow: loginTheme.shellShadow,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
              animation: 'amexLogoutCardIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                padding: '12px 20px',
                borderRadius: 14,
                background: 'rgba(9, 13, 22, 0.9)',
                border: loginTheme.logoBoxBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <img
                src="/images/logo-amex-clean.png"
                alt="AMEX Courier"
                style={{ height: 38, width: 'auto', objectFit: 'contain', filter: loginTheme.logoDropShadow }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: loginTheme.logoutShieldColor, fontSize: 15 }} />
              <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.2px', color: '#f8fafc' }}>
                Cerrando sesión de forma segura
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.45 }}>
              Finalizando sesión encriptada y liberando estación de trabajo...
            </p>

            <div
              style={{
                width: '100%',
                height: 4,
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '45%',
                  height: '100%',
                  borderRadius: 999,
                  background: loginTheme.progressGradient,
                  animation: 'amexProgressSlide 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <HeaderBar
        currentUser={currentUser}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onLogout={handleLogout}
      />

      <div className="app-container">
        <Sidebar
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onSelectTab={setActiveTab}
          onCloseSidebar={() => setIsSidebarCollapsed(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main
          data-lenis-scroll={activeTab !== 'live-sheets' ? '' : undefined}
          data-lenis-prevent={activeTab === 'live-sheets' ? '' : undefined}
          className={`main-content tab-${activeTab} ${['dni-matrix', 'rotulos-a4', 'boletas-shalom', 'invoices-usa', 'invoices'].includes(activeTab) ? 'dark-tab-mode' : ''} ${activeTab === 'live-sheets' ? 'live-sheets-mode' : ''} ${activeTab === 'dni-matrix' ? 'dni-matrix-mode' : ''} ${activeTab === 'rotulos-a4' ? 'rotulos-mode' : ''} ${activeTab === 'boletas-shalom' ? 'boletas-shalom-mode' : ''} ${activeTab === 'fico-cobros' || activeTab.startsWith('cobros-') ? 'cobros-mode' : ''}`}>
          {!isTabAllowed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '32px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <i className="fa-solid fa-lock" style={{ fontSize: 28, color: '#f87171' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginBottom: 8 }}>Acceso Restringido</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, marginBottom: 24, lineHeight: 1.5 }}>
                Tu usuario actual (<strong>{currentUser?.nombre}</strong> — Rol: <strong>{currentUser?.rol || 'Sin Rol'}</strong>) no cuenta con permisos asignados para visualizar este módulo.
              </p>
              <button
                onClick={() => setActiveTab(getFirstAvailableTab(currentUser) as DashboardTabId)}
                style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              >
                <i className="fa-solid fa-arrow-left" /> Ir a mi módulo principal
              </button>
            </div>
          ) : (
            <DashboardTabContent
              activeTab={activeTab}
              isLoadingInitialData={isLoadingInitialData}
              isGlobalRefreshing={isGlobalRefreshing}
              paquetes={paquetes}
              clientes={clientes}
              entregas={entregas}
              cobros={cobros}
              scannedLogs={scannedLogs}
              currentUser={currentUser}
              targetCliente360={targetCliente360}
              targetClienteCobros={targetClienteCobros}
              onNavigateTab={setActiveTab}
              onNewPackage={openNewPkgModal}
              onPrintLabel={setSelectedThermalPkg}
              onViewPdf={setSelectedPdfUrl}
              onRefreshData={fetchSupabaseData}
              onUpdatePackage={handleUpdatePackage}
              onDeletePackage={handleDeletePackage}
              onNavigateToClientes360={handleNavigateToClientes360}
              onNavigateToCobros={handleNavigateToCobros}
              onOpenNewClientModal={openNewClientModal}
              onConfirmScan={handleScanCode}
              onSlotPackage={handleAssignPackageLocation}
              onUpdateLogs={setScannedLogs}
            />
          )}
        </main>
      </div>



      {/* Backdrop para cerrar el menú lateral en móviles */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {isNewClientModalOpen && (
        <NewClientModal
          form={newClientForm}
          onChange={setNewClientForm}
          onSave={handleSaveClient}
          onClose={() => setIsNewClientModalOpen(false)}
        />
      )}

      {isNewPkgModalOpen && (
        <NewPackageModal
          form={newPkgForm}
          clientes={clientes}
          onChange={setNewPkgForm}
          onSave={handleSavePackage}
          onClose={() => setIsNewPkgModalOpen(false)}
          isWarehouseMode={activeTab === 'mm-lince' || activeTab === 'mm-inventory'}
        />
      )}

      {selectedThermalPkg && (
        <ThermalLabelModal pkg={selectedThermalPkg} onClose={() => setSelectedThermalPkg(null)} />
      )}

      {selectedPdfUrl && (
        <PdfViewerModal url={selectedPdfUrl} onClose={() => setSelectedPdfUrl(null)} />
      )}
    </div>
  );
}
