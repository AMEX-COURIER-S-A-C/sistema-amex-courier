'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface TibFileInfo {
  id?: string;
  tipo: 'delivered' | 'sent' | 'received';
  r2_key: string;
  nombre_archivo: string;
  peso_bytes: number;
  subido_en: string;
  subido_por_nombre: string;
}

interface TibState {
  fecha: string;
  fechaHoy: string;
  isToday: boolean;
  isComplete: boolean;
  files: {
    delivered: TibFileInfo | null;
    sent: TibFileInfo | null;
    received: TibFileInfo | null;
  };
}

interface JobProgress {
  id: string;
  estado: string;
  etapa: string;
  mensaje: string;
  progreso: number;
  total_guias: number | null;
  coincidencias: number | null;
  sin_coincidencia: number | null;
  segundos: number | null;
  db_actualizados?: number;
  resultado_key?: string | null;
}

export interface SyncTibModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => Promise<void> | void;
}

const TIB_CONFIG: Array<{
  tipo: 'delivered' | 'sent' | 'received';
  label: string;
  fileHint: string;
  color: string;
  iconBg: string;
}> = [
  { tipo: 'delivered', label: 'ENTREGADO TIB', fileHint: 'ENTREGADO TIB.xlsx', color: '#16a34a', iconBg: '#dcfce7' },
  { tipo: 'sent', label: 'ENVIADO TIB', fileHint: 'ENVIADO TIB.xlsx', color: '#2563eb', iconBg: '#dbeafe' },
  { tipo: 'received', label: 'RECIBIDO TIB', fileHint: 'RECIBIDO TIB.xlsx', color: '#d97706', iconBg: '#fef3c7' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SyncTibModal({ isOpen, onClose, onRefreshData }: SyncTibModalProps) {
  const [tibState, setTibState] = useState<TibState | null>(null);
  const [, setIsLoadingTib] = useState(false);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dbCount, setDbCount] = useState<number>(0);
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'todos'>('activos');
  const [syncCloudFiles, setSyncCloudFiles] = useState<boolean>(true);
  const [showManualUpload, setShowManualUpload] = useState<boolean>(false);

  // Estados de ejecución
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [activeJob, setActiveJob] = useState<JobProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiCredentialsReady, setApiCredentialsReady] = useState<boolean>(true);
  const [accountEmail, setAccountEmail] = useState<string>('operaciones@amexcourierperu.com');

  const [successResult, setSuccessResult] = useState<{
    modo: 'api_direct' | 'worker_job';
    coincidencias: number;
    dbActualizados: number;
    cambiosDetectados?: number;
    sinCoincidencia: number;
    duracionSegundos?: string;
    tibCounts?: {
      recibido: number;
      enviado: number;
      entregado: number;
      totalRaw: number;
    };
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar estado de TIB y BD
  const loadTibState = useCallback(async () => {
    setIsLoadingTib(true);
    setErrorMessage(null);
    try {
      const [tibRes, statsRes, apiCheckRes] = await Promise.all([
        fetch('/api/inventario-tib').then((r) => r.json()).catch(() => ({})),
        fetch('/api/inventario-jobs').then((r) => r.json()).catch(() => ({})),
        fetch('/api/tib/sync-inventario').then((r) => r.json()).catch(() => ({})),
      ]);

      if (tibRes?.files) {
        setTibState(tibRes);
      }
      if (statsRes?.dbStats) {
        setDbCount(filtroEstado === 'todos' ? statsRes.dbStats.todos : statsRes.dbStats.activos);
      }
      if (apiCheckRes?.ok) {
        setApiCredentialsReady(Boolean(apiCheckRes.credentialsConfigured));
        if (apiCheckRes.accountEmail) setAccountEmail(apiCheckRes.accountEmail);
      }
    } catch (err: unknown) {
      console.error('Error cargando estado TIB:', err);
    } finally {
      setIsLoadingTib(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    if (isOpen) {
      void loadTibState();
      setActiveJob(null);
      setSuccessResult(null);
      setErrorMessage(null);
      setIsProcessing(false);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isOpen, loadTibState]);

  // =========================================================================
  // MÉTODO 1: SINCRONIZACIÓN DIRECTA DESDE API TIB (100% AUTOMÁTICO, CERO EXCELS)
  // =========================================================================
  const handleStartDirectApiSync = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessResult(null);
    setProcessingStage('Consultando API oficial TIB (RECIBIDO, ENVIADO, ENTREGADO)...');

    try {
      const t0 = Date.now();
      const res = await fetch('/api/tib/sync-inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filtro_estado: filtroEstado,
          sync_cloud_files: syncCloudFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Ocurrió un error al sincronizar con la API de TIB.');
      }

      const totalSec = ((Date.now() - t0) / 1000).toFixed(1);

      setSuccessResult({
        modo: 'api_direct',
        coincidencias: data.coincidencias ?? 0,
        dbActualizados: data.dbActualizados ?? 0,
        cambiosDetectados: data.cambiosDetectados ?? 0,
        sinCoincidencia: data.sinCoincidencia ?? 0,
        duracionSegundos: totalSec,
        tibCounts: data.tibCounts,
      });

      // Refrescar inventario en pantalla
      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch (e) {
          console.error('Error refrescando tabla:', e);
        }
      }

      // Recargar estadísticas
      void loadTibState();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error en sincronización directa TIB.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // =========================================================================
  // MÉTODO 2: FLUJO DE RESPALDO VÍA WORKER HOSTINGER (EXCELS MANUALES)
  // =========================================================================
  const handleUploadSingleTib = async (tipo: 'delivered' | 'sent' | 'received', file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMessage(`El archivo "${file.name}" debe ser formato .xlsx.`);
      return;
    }

    setIsUploading((prev) => ({ ...prev, [tipo]: true }));
    setUploadProgress((prev) => ({ ...prev, [tipo]: 0 }));
    setErrorMessage(null);

    try {
      const presign = await fetch('/api/inventario-jobs/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: tipo, filename: file.name, isDailyTib: true }),
      }).then((r) => r.json());

      if (!presign.uploadUrl) throw new Error(presign.error || 'No se pudo generar URL de subida a R2.');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presign.uploadUrl);
        xhr.setRequestHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((prev) => ({ ...prev, [tipo]: Math.round((e.loaded / e.total) * 100) }));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 status ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Error de conexión con R2'));
        xhr.send(file);
      });

      const confirmRes = await fetch('/api/inventario-tib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          r2_key: presign.key,
          nombre_archivo: file.name,
          peso_bytes: file.size,
        }),
      }).then((r) => r.json());

      if (!confirmRes.ok) throw new Error(confirmRes.error || 'No se pudo registrar archivo TIB.');
      await loadTibState();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al subir archivo TIB.');
    } finally {
      setIsUploading((prev) => ({ ...prev, [tipo]: false }));
    }
  };

  const handleStartWorkerSync = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await fetch('/api/inventario-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usar_tib_diario: true,
          origen_inventario: 'db',
          filtro_estado: filtroEstado,
          sincronizar_db: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'No se pudo encolar el trabajo de cruce.');
      }

      const jobId = data.id;
      setActiveJob({
        id: jobId,
        estado: 'queued',
        etapa: 'queued',
        mensaje: 'En cola, esperando procesamiento por Worker Hostinger...',
        progreso: 5,
        total_guias: null,
        coincidencias: null,
        sin_coincidencia: null,
        segundos: null,
      });

      const channel = supabase
        .channel(`sync-tib-job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inventario_jobs',
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            const updated = payload.new as JobProgress;
            setActiveJob(updated);
            if (updated.estado === 'done') {
              handleWorkerJobFinished(jobId, updated);
            } else if (updated.estado === 'error') {
              setIsProcessing(false);
              setErrorMessage(updated.mensaje || 'Ocurrió un error en el procesador.');
            }
          }
        )
        .subscribe();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const detailRes = await fetch(`/api/inventario-jobs/${jobId}`);
          const detailData = await detailRes.json();
          if (detailData.job) {
            setActiveJob(detailData.job);
            if (detailData.job.estado === 'done') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              supabase.removeChannel(channel);
              handleWorkerJobFinished(jobId, detailData.job);
            } else if (detailData.job.estado === 'error') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              supabase.removeChannel(channel);
              setIsProcessing(false);
              setErrorMessage(detailData.job.mensaje || 'Error en worker.');
            }
          }
        } catch {
          /* reintenta */
        }
      }, 1500);
    } catch (err: unknown) {
      setIsProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar cruce en worker.');
    }
  };

  const handleWorkerJobFinished = async (jobId: string, jobData: JobProgress) => {
    setIsProcessing(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let finalActualizados = jobData.db_actualizados || 0;
    try {
      const syncRes = await fetch(`/api/inventario-jobs/${jobId}/sync-db`, { method: 'POST' });
      const syncData = await syncRes.json();
      if (syncData.updatedCount !== undefined) {
        finalActualizados = syncData.updatedCount;
      }
    } catch (e) {
      console.warn('Sync post-verificación:', e);
    }

    setSuccessResult({
      modo: 'worker_job',
      coincidencias: jobData.coincidencias ?? 0,
      dbActualizados: finalActualizados,
      sinCoincidencia: jobData.sin_coincidencia ?? 0,
      duracionSegundos: String(jobData.segundos || ''),
    });

    if (onRefreshData) {
      try {
        await onRefreshData();
      } catch (e) {
        console.error('Error refrescando tabla:', e);
      }
    }
  };

  const hasAnyTibFiles = Boolean(
    tibState?.files.delivered || tibState?.files.sent || tibState?.files.received
  );

  return (
    <Modal isOpen={isOpen} onClose={isProcessing ? () => {} : onClose} maxWidth="3xl">
      <div style={{ padding: '4px' }}>
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  Sincronización Automática con TIB Courier
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Globe className="w-3 h-3 text-emerald-600" />
                  API En Vivo
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Cruce directo de inventario contra TIB Courier sin necesidad de descargar ni subir Excels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* ALERTA DE ERROR */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* RESULTADO EXITOSO */}
        {successResult && (
          <div
            style={{
              padding: '16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '14px' }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>¡Sincronización completada con éxito!</span>
              </div>
              {successResult.duracionSegundos && (
                <span style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                  ⚡ En solo {successResult.duracionSegundos}s
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d' }}>
                  {successResult.coincidencias.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', fontWeight: 700 }}>
                  Coincidencias TIB
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563eb' }}>
                  {successResult.dbActualizados.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', fontWeight: 700 }}>
                  Paquetes Sincronizados
                </div>
                {successResult.cambiosDetectados !== undefined && successResult.cambiosDetectados > 0 && (
                  <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 800, marginTop: '2px' }}>
                    ({successResult.cambiosDetectados} con cambios nuevos)
                  </div>
                )}
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  {successResult.sinCoincidencia.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', fontWeight: 700 }}>
                  Sin Coincidencia
                </div>
              </div>
            </div>

            {successResult.tibCounts && (
              <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#166534', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <span>Entregados: <strong>{successResult.tibCounts.entregado.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Enviados: <strong>{successResult.tibCounts.enviado.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Recibidos Miami: <strong>{successResult.tibCounts.recibido.toLocaleString()}</strong></span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{ fontSize: '12.5px', fontWeight: 800, padding: '8px 16px' }}
              >
                Cerrar y Ver Inventario
              </button>
            </div>
          </div>
        )}

        {/* ESTADO EN PROCESAMIENTO DIRECTO API */}
        {isProcessing && !activeJob && (
          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                {processingStage || 'Sincronizando directamente con TIB Courier...'}
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* ESTADO EN PROGRESO DEL WORKER (LEGACY) */}
        {isProcessing && activeJob && (
          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server className="w-4 h-4 text-blue-600 animate-pulse" />
                Worker Hostinger: {activeJob.etapa}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb' }}>{activeJob.progreso}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${activeJob.progreso}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{activeJob.mensaje}</div>
          </div>
        )}

        {/* TARJETA PRINCIPAL: SINCRONIZACIÓN 100% AUTOMÁTICA DIRECTA DESDE API */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a8a' }}>
                Conexión Oficial API TIB Courier
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#1e40af',
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '8px',
                fontWeight: 700,
              }}
            >
              {accountEmail}
            </span>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
            Al pulsar el botón, el sistema consulta en segundos las guías de <strong>RECIBIDO</strong>, <strong>ENVIADO</strong> y <strong>ENTREGADO</strong> desde la API oficial de TIB y actualiza automáticamente los pesos, trackings, consignatarios y estados en tu inventario master.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #dbeafe',
            }}
          >
            {/* Opciones de Filtro y Caché */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Filtro:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as 'activos' | 'todos')}
                  disabled={isProcessing}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  <option value="activos">Solo activos en almacén ({dbCount.toLocaleString()} guías)</option>
                  <option value="todos">Todos los paquetes registrados</option>
                </select>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#475569',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={syncCloudFiles}
                  onChange={(e) => setSyncCloudFiles(e.target.checked)}
                  disabled={isProcessing}
                />
                <span>Actualizar reportes del día para Cobros (R2 + VPS)</span>
              </label>
            </div>

            {/* BOTÓN PRINCIPAL DE SINCRONIZACIÓN */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartDirectApiSync}
              disabled={isProcessing || !apiCredentialsReady}
              style={{
                fontSize: '13px',
                fontWeight: 900,
                padding: '9px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing && !activeJob ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando con TIB...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Sincronizar con API TIB Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SECCIÓN COLAPSABLE: CARGA MANUAL DE EXCELS (RESPALDO / LEGACY) */}
        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={() => setShowManualUpload(!showManualUpload)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            {showManualUpload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>¿Deseas subir archivos Excel manualmente con el Worker Hostinger?</span>
          </button>

          {showManualUpload && (
            <div style={{ marginTop: '12px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                  Archivos TIB Activos del Día (R2)
                </span>
                {tibState && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: tibState.isComplete ? '#dcfce7' : '#fef3c7',
                      color: tibState.isComplete ? '#15803d' : '#b45309',
                    }}
                  >
                    {tibState.isComplete ? '✓ 3/3 listos en nube' : 'Archivos parciales'}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {TIB_CONFIG.map(({ tipo, label, fileHint, color }) => {
                  const fileData = tibState?.files[tipo];
                  const uploading = isUploading[tipo];
                  const pct = uploadProgress[tipo] || 0;

                  return (
                    <div
                      key={tipo}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: fileData ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color }}>{label}</span>
                        {fileData ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>Pendiente</span>
                        )}
                      </div>

                      {fileData ? (
                        <div style={{ fontSize: '10.5px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fileData.nombre_archivo}
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{fileHint}</div>
                      )}

                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '6px',
                          fontSize: '10.5px',
                          color: '#2563eb',
                          cursor: uploading || isProcessing ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        <Upload className="w-3 h-3" />
                        <span>{uploading ? `${pct}%` : fileData ? 'Reemplazar' : 'Subir'}</span>
                        <input
                          type="file"
                          accept=".xlsx"
                          disabled={uploading || isProcessing}
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleUploadSingleTib(tipo, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleStartWorkerSync}
                  disabled={isProcessing || !hasAnyTibFiles}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1e293b',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  Procesar vía Worker Hostinger (C#)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
