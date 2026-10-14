'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Square,
  Layers,
  Database,
  ArrowRight,
  X,
  FileText,
  Clock,
  Sparkles,
  Info,
  Scale,
  Tag,
  User,
  Box,
  Activity,
  Check
} from 'lucide-react';
import { Paquete } from '@/types';

export interface SyncTibImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  paquetesActuales: Paquete[];
  onRefreshData?: () => Promise<void> | void;
  onPackageUpdated?: (
    wr: string,
    imageUrl: string,
    ticketUrl?: string,
    updatedData?: {
      tracking?: string;
      nombreConsignatario?: string;
      pesoKg?: number;
      tipoEmpaque?: string;
      estadoTib?: string;
    }
  ) => void;
}

interface ItemToProcess {
  id: string;
  numeroReciboBodega: string;
  tracking?: string;
  nombreConsignatario?: string;
  pesoKg?: number;
  tipoEmpaque?: string;
  estadoTib?: string;
  tibImagenUrl?: string;
  missingFields: string[];
}

interface LogEntry {
  id: string;
  wr: string;
  status: 'ok' | 'not_found' | 'error' | 'cancelled';
  message: string;
  time: string;
}

export default function SyncTibImagesModal({
  isOpen,
  onClose,
  paquetesActuales,
  onRefreshData,
  onPackageUpdated,
}: SyncTibImagesModalProps) {
  // Pasos: 'audit' (revisión y confirmación), 'running' (en ejecución), 'done' (resumen)
  const [step, setStep] = useState<'audit' | 'running' | 'done'>('audit');

  // Alcance seleccionado
  const [scope, setScope] = useState<'current' | 'database'>('current');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [limitSelection, setLimitSelection] = useState<number | 'all'>('all');

  // Opciones de sincronización (Campos a enriquecer)
  const [syncOptions, setSyncOptions] = useState({
    images: true,
    tracking: true,
    peso: true,
    cliente: true,
    empaque: true,
    estadoTib: true,
  });

  // Estadísticas globales de BD
  const [dbStats, setDbStats] = useState<{
    totalPackages: number;
    withImage: number;
    totalMissing: number;
    stats: {
      missingImage: number;
      missingTracking: number;
      missingPeso: number;
      missingCliente: number;
      missingEmpaque: number;
      missingEstadoTib: number;
    };
    missingList: ItemToProcess[];
  } | null>(null);
  const [loadingDbStats, setLoadingDbStats] = useState(false);

  // Estadísticas del inventario cargado en memoria
  const currentIncomplete = useMemo(() => {
    let missingImage = 0;
    let missingTracking = 0;
    let missingPeso = 0;
    let missingCliente = 0;
    let missingEmpaque = 0;
    let missingEstadoTib = 0;

    const list: ItemToProcess[] = [];

    paquetesActuales.forEach((p) => {
      if (!p.numeroReciboBodega || p.numeroReciboBodega.trim() === '') return;

      const isMissingImage = !p.tibImagenUrl;
      const isMissingTracking = !p.tracking || p.tracking === '-' || p.tracking.trim() === '';
      const isMissingPeso = !p.pesoKg || Number(p.pesoKg) <= 0;
      const isMissingCliente =
        !p.nombreConsignatario ||
        p.nombreConsignatario.trim() === '' ||
        p.nombreConsignatario.toUpperCase().includes('CLIENTE AMEX');
      const isMissingEmpaque = !p.tipoEmpaque || p.tipoEmpaque.trim() === '';
      const isMissingEstadoTib = !p.estadoTib || p.estadoTib.trim() === '';

      if (isMissingImage) missingImage++;
      if (isMissingTracking) missingTracking++;
      if (isMissingPeso) missingPeso++;
      if (isMissingCliente) missingCliente++;
      if (isMissingEmpaque) missingEmpaque++;
      if (isMissingEstadoTib) missingEstadoTib++;

      const hasAnyMissing =
        isMissingImage ||
        isMissingTracking ||
        isMissingPeso ||
        isMissingCliente ||
        isMissingEmpaque ||
        isMissingEstadoTib;

      if (hasAnyMissing) {
        const missingFields: string[] = [];
        if (isMissingImage) missingFields.push('foto');
        if (isMissingTracking) missingFields.push('tracking');
        if (isMissingPeso) missingFields.push('peso');
        if (isMissingCliente) missingFields.push('cliente');
        if (isMissingEmpaque) missingFields.push('empaque');
        if (isMissingEstadoTib) missingFields.push('estado_tib');

        list.push({
          id: p.id,
          numeroReciboBodega: p.numeroReciboBodega,
          tracking: p.tracking || '',
          nombreConsignatario: p.nombreConsignatario || '',
          pesoKg: Number(p.pesoKg || 0),
          tipoEmpaque: p.tipoEmpaque || '',
          estadoTib: p.estadoTib || '',
          tibImagenUrl: p.tibImagenUrl,
          missingFields,
        });
      }
    });

    return {
      list,
      stats: {
        missingImage,
        missingTracking,
        missingPeso,
        missingCliente,
        missingEmpaque,
        missingEstadoTib,
      },
    };
  }, [paquetesActuales]);

  // Ejecución y progreso
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentWr, setCurrentWr] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const cancelRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Cargar estadísticas de la base de datos completa al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      setStep('audit');
      setProcessedCount(0);
      setSuccessCount(0);
      setNotFoundCount(0);
      setErrorCount(0);
      setCurrentWr(null);
      setLogs([]);
      cancelRef.current = false;
      return;
    }

    void fetchDbStats();
  }, [isOpen]);

  // Autoscroll del log
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchDbStats = async () => {
    setLoadingDbStats(true);
    try {
      const res = await fetch('/api/paquetes/tib-image?limit=500');
      const data = await res.json();
      if (res.ok && data.ok) {
        setDbStats({
          totalPackages: data.totalPackages,
          withImage: data.withImage,
          totalMissing: data.totalMissing,
          stats: data.stats || {
            missingImage: 0,
            missingTracking: 0,
            missingPeso: 0,
            missingCliente: 0,
            missingEmpaque: 0,
            missingEstadoTib: 0,
          },
          missingList: (data.missing || []).map((m: any) => ({
            id: m.id,
            numeroReciboBodega: m.numeroReciboBodega,
            tracking: m.tracking,
            nombreConsignatario: m.nombreConsignatario,
            pesoKg: m.pesoKg,
            tipoEmpaque: m.tipoEmpaque,
            estadoTib: m.estadoTib,
            tibImagenUrl: m.tibImagenUrl,
            missingFields: m.missingFields || [],
          })),
        });
      }
    } catch (err) {
      console.error('Error al consultar estadísticas globales de BD:', err);
    } finally {
      setLoadingDbStats(false);
    }
  };

  // Calcular la lista final que se va a procesar
  const itemsToProcess = useMemo<ItemToProcess[]>(() => {
    let source: ItemToProcess[] = [];
    if (scope === 'current') {
      source = currentIncomplete.list;
    } else {
      source = dbStats?.missingList || [];
    }

    if (limitSelection !== 'all') {
      return source.slice(0, Number(limitSelection));
    }
    return source;
  }, [scope, currentIncomplete.list, dbStats, limitSelection]);

  // Iniciar la sincronización y enriquecimiento masivo
  const handleStartSync = async () => {
    if (itemsToProcess.length === 0) return;

    cancelRef.current = false;
    setStep('running');
    setTotalToProcess(itemsToProcess.length);
    setProcessedCount(0);
    setSuccessCount(0);
    setNotFoundCount(0);
    setErrorCount(0);
    setLogs([]);

    const CHUNK_SIZE = 3; // Lotes concurrentes
    let currentProcessed = 0;
    let currentSuccess = 0;
    let currentNotFound = 0;
    let currentErrors = 0;

    for (let i = 0; i < itemsToProcess.length; i += CHUNK_SIZE) {
      if (cancelRef.current) {
        addLog('CANCEL', 'cancelled', 'Proceso detenido por el operador.');
        break;
      }

      const chunk = itemsToProcess.slice(i, i + CHUNK_SIZE);
      setCurrentWr(chunk.map((item) => item.numeroReciboBodega).join(', '));

      await Promise.all(
        chunk.map(async (item) => {
          if (cancelRef.current) return;
          try {
            const res = await fetch('/api/paquetes/tib-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wr: item.numeroReciboBodega,
                id: item.id,
                forceRefresh,
                syncOptions,
              }),
            });

            const data = await res.json();
            if (res.ok && data.found) {
              currentSuccess++;
              const fieldsLabel =
                Array.isArray(data.updatedFields) && data.updatedFields.length > 0
                  ? `Completado: ${data.updatedFields.join(', ')}`
                  : 'Sincronizado sin cambios nuevos';

              addLog(item.numeroReciboBodega, 'ok', fieldsLabel);

              if (onPackageUpdated) {
                onPackageUpdated(
                  item.numeroReciboBodega,
                  data.tibImagenUrl,
                  data.tibTicketPdfUrl,
                  data.updatedData
                );
              }
            } else if (res.ok && !data.found) {
              currentNotFound++;
              addLog(
                item.numeroReciboBodega,
                'not_found',
                data.message || 'Sin registro en servidor TIB.'
              );
            } else {
              currentErrors++;
              addLog(
                item.numeroReciboBodega,
                'error',
                data.error || 'Respuesta inválida de TIB.'
              );
            }
          } catch (err: any) {
            currentErrors++;
            addLog(
              item.numeroReciboBodega,
              'error',
              err?.message || 'Error de conexión con el servidor.'
            );
          } finally {
            currentProcessed++;
            setProcessedCount(currentProcessed);
            setSuccessCount(currentSuccess);
            setNotFoundCount(currentNotFound);
            setErrorCount(currentErrors);
          }
        })
      );

      // Pausa de 150ms entre lotes para resguardar la API de TIB
      await new Promise((r) => setTimeout(r, 150));
    }

    setStep('done');
    setCurrentWr(null);
  };

  const addLog = (wr: string, status: 'ok' | 'not_found' | 'error' | 'cancelled', message: string) => {
    const time = new Date().toLocaleTimeString('es-PE', { hour12: false });
    setLogs((prev) => [
      ...prev,
      {
        id: `${wr}-${Date.now()}-${Math.random()}`,
        wr,
        status,
        message,
        time,
      },
    ]);
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleFinishAndRefresh = async () => {
    if (onRefreshData) {
      await onRefreshData();
    }
    onClose();
  };

  if (!isOpen) return null;

  const progressPercent = totalToProcess > 0 ? Math.round((processedCount / totalToProcess) * 100) : 0;
  const activeStats = scope === 'current' ? currentIncomplete.stats : (dbStats?.stats || currentIncomplete.stats);

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
    >
      <div
        className="modal-dialog"
        style={{
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                  Sincronización y Enriquecimiento TIB
                </h3>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}
                >
                  Fotos, Tracking, Peso y Datos de Bodega
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                Detecta y extrae automáticamente fotografías, tickets PDF, tracking, peso, consignatario y estado TIB.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={step === 'running'}
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: step === 'running' ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              opacity: step === 'running' ? 0.4 : 1
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#f8fafc'
          }}
        >
          {/* PASO 1: AUDITORÍA Y CONFIRMACIÓN */}
          {step === 'audit' && (
            <>
              {/* Tarjetas de Alcance */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {/* Opción 1: Vista actual */}
                <div
                  onClick={() => setScope('current')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: scope === 'current' ? '#ffffff' : '#f1f5f9',
                    border: scope === 'current' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    boxShadow: scope === 'current' ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>
                      <Layers className="w-4 h-4 text-blue-600" /> Vista Actual
                    </div>
                    <span
                      style={{
                        background: currentIncomplete.list.length > 0 ? '#fef3c7' : '#dcfce7',
                        color: currentIncomplete.list.length > 0 ? '#b45309' : '#16a34a',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px'
                      }}
                    >
                      {currentIncomplete.list.length} incompletos
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Total analizados en tabla: <strong>{paquetesActuales.length}</strong>
                  </div>
                </div>

                {/* Opción 2: Base de Datos Global */}
                <div
                  onClick={() => setScope('database')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: scope === 'database' ? '#ffffff' : '#f1f5f9',
                    border: scope === 'database' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    boxShadow: scope === 'database' ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>
                      <Database className="w-4 h-4 text-purple-600" /> Toda la Base de Datos
                    </div>
                    {loadingDbStats ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <span
                        style={{
                          background: (dbStats?.totalMissing || 0) > 0 ? '#fee2e2' : '#dcfce7',
                          color: (dbStats?.totalMissing || 0) > 0 ? '#b91c1c' : '#16a34a',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}
                      >
                        {dbStats?.totalMissing ?? '...'} incompletos
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Total con WR en BD: <strong>{dbStats?.totalPackages ?? '...'}</strong> paquetes
                  </div>
                </div>
              </div>

              {/* Panel de Diagnóstico Detallado de Campos Faltantes */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Diagnóstico de datos faltantes en {scope === 'current' ? 'vista actual' : 'base de datos'}:
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                    gap: '8px'
                  }}
                >
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera className="w-3 h-3 text-indigo-500" /> Sin Foto
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingImage > 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingImage}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag className="w-3 h-3 text-blue-500" /> Sin Tracking
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingTracking > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingTracking}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Scale className="w-3 h-3 text-amber-500" /> Sin Peso (0 kg)
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingPeso > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingPeso}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User className="w-3 h-3 text-emerald-500" /> Sin Cliente
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingCliente > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingCliente}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Box className="w-3 h-3 text-teal-500" /> Sin Empaque
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingEmpaque > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingEmpaque}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity className="w-3 h-3 text-purple-500" /> Sin Estado TIB
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: activeStats.missingEstadoTib > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
                      {activeStats.missingEstadoTib}
                    </div>
                  </div>
                </div>
              </div>

              {/* Casillas de Verificación: Qué campos enriquecer */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles className="w-4 h-4 text-blue-600" /> ¿Qué campos deseas que TIB extraiga y complete automáticamente?
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.images}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, images: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Fotos y Tickets PDF</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.tracking}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, tracking: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Número de Tracking</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.peso}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, peso: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Peso de Balanza Miami (kg)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.cliente}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, cliente: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Nombre de Cliente / Consignatario</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.empaque}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, empaque: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Tipo de Empaque (Caja/Sobre/etc.)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={syncOptions.estadoTib}
                      onChange={(e) => setSyncOptions(prev => ({ ...prev, estadoTib: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span>Estado Logístico TIB</span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      Límite de guías:
                    </label>
                    <select
                      value={String(limitSelection)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLimitSelection(val === 'all' ? 'all' : Number(val));
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        background: '#f8fafc',
                        color: '#0f172a'
                      }}
                    >
                      <option value="all">Todos los incompletos ({itemsToProcess.length})</option>
                      <option value="25">Primeros 25</option>
                      <option value="50">Primeros 50</option>
                      <option value="100">Primeros 100</option>
                    </select>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      color: '#475569',
                      fontWeight: 600
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={forceRefresh}
                      onChange={(e) => setForceRefresh(e.target.checked)}
                      style={{ width: '15px', height: '15px' }}
                    />
                    <span>Forzar re-consulta a TIB incluso si ya tenían datos previos</span>
                  </label>
                </div>
              </div>

              {/* Previsualización de Guías a Procesar */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    Guías que serán procesadas ({itemsToProcess.length})
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Alcance: {scope === 'current' ? 'Vista actual' : 'Base de datos'}
                  </span>
                </div>

                {itemsToProcess.length === 0 ? (
                  <div
                    style={{
                      padding: '30px',
                      textAlign: 'center',
                      color: '#16a34a',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    ¡Excelente! Todos los paquetes de este alcance ya cuentan con su información completa y fotos asignadas.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1px solid #f1f5f9',
                      borderRadius: '8px',
                      background: '#f8fafc'
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#e2e8f0', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '6px 10px', fontWeight: 700 }}>WR</th>
                          <th style={{ padding: '6px 10px', fontWeight: 700 }}>Tracking</th>
                          <th style={{ padding: '6px 10px', fontWeight: 700 }}>Consignatario</th>
                          <th style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right' }}>Peso</th>
                          <th style={{ padding: '6px 10px', fontWeight: 700 }}>Faltantes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsToProcess.map((item, idx) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid #e2e8f0',
                              background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                            }}
                          >
                            <td style={{ padding: '6px 10px', fontWeight: 800, fontFamily: 'monospace', color: '#1d4ed8' }}>
                              {item.numeroReciboBodega}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>
                              {item.tracking || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                              {item.nombreConsignatario || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              {item.pesoKg ? `${item.pesoKg} kg` : '—'}
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {item.missingFields.map((f) => (
                                  <span
                                    key={f}
                                    style={{
                                      background: '#fee2e2',
                                      color: '#991b1b',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* PASO 2: EN EJECUCIÓN (PROGRESO EN VIVO) */}
          {step === 'running' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Barra de progreso */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      Sincronizando {processedCount} de {totalToProcess} guías...
                    </span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#2563eb' }}>
                    {progressPercent}%
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    borderRadius: '999px',
                    background: '#e2e8f0',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>

                {currentWr && (
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Consultando TIB para lote:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{currentWr}</strong>
                  </div>
                )}
              </div>

              {/* Contadores en Vivo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                    ✓ Sincronizados
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    {successCount}
                  </div>
                </div>

                <div
                  style={{
                    background: '#fefce8',
                    border: '1px solid #fef08a',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>
                    ⚠ Sin Datos en TIB
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#a16207', marginTop: '4px' }}>
                    {notFoundCount}
                  </div>
                </div>

                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                    ✕ Errores de Red
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>
                    {errorCount}
                  </div>
                </div>
              </div>

              {/* Consola de Logs */}
              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '11px', borderBottom: '1px solid #334155', paddingBottom: '6px', marginBottom: '4px' }}>
                  REGISTRO DE ENRIQUECIMIENTO EN TIEMPO REAL:
                </div>
                <div
                  ref={logsContainerRef}
                  data-lenis-prevent=""
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ color: '#64748b' }}>[{log.time}]</span>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>{log.wr}:</span>
                      <span
                        style={{
                          color:
                            log.status === 'ok'
                              ? '#4ade80'
                              : log.status === 'not_found'
                              ? '#facc15'
                              : '#f87171',
                        }}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: RESUMEN FINAL */}
          {step === 'done' && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '28px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  border: '2px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a'
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Sincronización y Enriquecimiento Finalizado
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Se completó la verificación con el servidor de TIBCARGO y se guardaron los datos y fotos en la base de datos.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '520px'
                }}
              >
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOTAL PROCESADAS</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {processedCount}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>ENRIQUECIDAS CON ÉXITO</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                    {successCount}
                  </div>
                </div>

                <div style={{ background: '#fefce8', padding: '12px', borderRadius: '10px', border: '1px solid #fef08a' }}>
                  <div style={{ fontSize: '11px', color: '#854d0e', fontWeight: 700 }}>SIN DATOS EN TIB</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#a16207', marginTop: '2px' }}>
                    {notFoundCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          {step === 'audit' && (
            <>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info className="w-4 h-4 text-slate-400" />
                <span>
                  Se consultará a la API de TIB y se actualizarán automáticamente los campos seleccionados en Supabase.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={itemsToProcess.length === 0}
                  onClick={handleStartSync}
                  style={{
                    background: itemsToProcess.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: itemsToProcess.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: itemsToProcess.length === 0 ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Sincronización ({itemsToProcess.length})</span>
                </button>
              </div>
            </>
          )}

          {step === 'running' && (
            <>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Por favor mantén esta ventana abierta mientras se completan las consultas con TIB.
              </div>

              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Square className="w-3.5 h-3.5 fill-red-600" /> Detener Sincronización
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                ✓ Los datos y evidencias ya fueron guardados permanentemente en la base de datos.
              </div>

              <button
                type="button"
                onClick={handleFinishAndRefresh}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar y Actualizar Inventario</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
