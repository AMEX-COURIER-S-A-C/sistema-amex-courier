'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type FuenteKey = 'delivered' | 'sent' | 'received';

interface TibFileInfo {
  id?: string;
  tipo: FuenteKey;
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
  files: Record<FuenteKey, TibFileInfo | null>;
}

export interface InventarioJobsTabProps {
  onNavigateTab?: (tabId: string) => void;
}

const FUENTES: Array<{
  key: FuenteKey;
  label: string;
  file: string;
  color: string;
  bgLight: string;
  borderLight: string;
  icon: string;
  description: string;
}> = [
  {
    key: 'delivered',
    label: 'ENTREGADO TIB',
    file: 'ENTREGADO TIB.xlsx',
    color: '#16a34a',
    bgLight: '#f0fdf4',
    borderLight: '#bbf7d0',
    icon: 'fa-solid fa-circle-check',
    description: 'Reporte oficial de paquetes entregados con fecha y estado final.',
  },
  {
    key: 'sent',
    label: 'ENVIADO TIB',
    file: 'ENVIADO TIB.xlsx',
    color: '#2563eb',
    bgLight: '#eff6ff',
    borderLight: '#bfdbfe',
    icon: 'fa-solid fa-paper-plane',
    description: 'Reporte oficial de paquetes despachados y salidas a destino.',
  },
  {
    key: 'received',
    label: 'RECIBIDO TIB',
    file: 'RECIBIDO TIB.xlsx',
    color: '#d97706',
    bgLight: '#fffbeb',
    borderLight: '#fde68a',
    icon: 'fa-solid fa-inbox',
    description: 'Reporte oficial de paquetes recepcionados y clasificados.',
  },
];

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 respondió ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error('Error de red subiendo el archivo a la nube (R2).'));
    xhr.send(file);
  });
}

export default function InventarioJobsTab({ onNavigateTab }: InventarioJobsTabProps) {
  const [tibState, setTibState] = useState<TibState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingTib, setUploadingTib] = useState<Record<string, boolean>>({});
  const [uploadPct, setUploadPct] = useState<Record<string, number>>({});
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [deletingTib, setDeletingTib] = useState<Record<string, boolean>>({});

  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setSuccessNotice(null), 5000);
  };

  const loadTibState = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventario-tib');
      const data = await res.json();
      if (data.files) {
        setTibState(data);
      }
    } catch {
      setError('No se pudo cargar el estado actual de los reportes TIB.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTibState();
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [loadTibState]);

  const handleUploadFile = async (slot: FuenteKey, file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError(`"${file.name}" debe tener extensión .xlsx`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" supera el límite de 100 MB (${formatBytes(file.size)}).`);
      return;
    }

    setUploadingTib((p) => ({ ...p, [slot]: true }));
    setUploadPct((p) => ({ ...p, [slot]: 0 }));
    setError(null);

    try {
      // 1. Obtener URL presignada para subida directa a R2
      const presign = await fetch('/api/inventario-jobs/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, filename: file.name, isDailyTib: true }),
      }).then((r) => r.json());

      if (!presign.uploadUrl) {
        throw new Error(presign.error || `No se pudo preparar la subida para ${slot}.`);
      }

      // 2. Subida con progreso
      await uploadWithProgress(presign.uploadUrl, file, (pct) => {
        setUploadPct((p) => ({ ...p, [slot]: pct }));
      });

      // 3. Confirmar registro en base de datos y worker
      const confirmRes = await fetch('/api/inventario-tib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: slot,
          r2_key: presign.key,
          nombre_archivo: file.name,
          peso_bytes: file.size,
        }),
      }).then((r) => r.json());

      if (!confirmRes.ok) {
        throw new Error(confirmRes.error || 'No se pudo registrar el archivo en la base de datos.');
      }

      const fuenteConfig = FUENTES.find((f) => f.key === slot);
      showSuccess(`✓ Reporte ${fuenteConfig?.label} (${file.name}) subido y sincronizado correctamente.`);
      await loadTibState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al subir reporte TIB.');
    } finally {
      setUploadingTib((p) => ({ ...p, [slot]: false }));
      setUploadPct((p) => ({ ...p, [slot]: 0 }));
    }
  };

  const handleDeleteFile = async (slot: FuenteKey) => {
    const fuenteConfig = FUENTES.find((f) => f.key === slot);
    const confirmed = window.confirm(
      `¿Estás seguro de quitar el archivo ${fuenteConfig?.label}? Esto lo desactivará de los cruces automáticos.`
    );
    if (!confirmed) return;

    setDeletingTib((p) => ({ ...p, [slot]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/inventario-tib?tipo=${slot}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo eliminar el archivo.');
      }
      showSuccess(`Reporte ${fuenteConfig?.label} quitado correctamente.`);
      await loadTibState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar reporte TIB.');
    } finally {
      setDeletingTib((p) => ({ ...p, [slot]: false }));
    }
  };

  const totalFilesPresent = tibState?.files
    ? Object.values(tibState.files).filter(Boolean).length
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '6px' }}>
      {/* CABECERA DEL MÓDULO */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                13. Subir Archivos TIB
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                }}
              >
                Carga de Reportes
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Sube y mantén al día los 3 reportes oficiales TIB en la nube. El cruce con paquetes se ejecuta desde el Módulo de Inventario o Cobros.
            </p>
          </div>
        </div>

        {/* ESTADO GENERAL Y BOTÓN DE ACTUALIZACIÓN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12.5px',
            }}
          >
            <i className="fa-regular fa-calendar" style={{ color: '#64748b' }}></i>
            <span style={{ color: '#475569' }}>Fecha Operativa:</span>
            <strong style={{ color: '#0f172a', fontWeight: 800 }}>
              {tibState?.fecha || 'Hoy'}
            </strong>
            {tibState?.isToday && (
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Hoy
              </span>
            )}
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background:
                totalFilesPresent === 3
                  ? '#dcfce7'
                  : totalFilesPresent > 0
                  ? '#fef3c7'
                  : '#f1f5f9',
              color:
                totalFilesPresent === 3
                  ? '#15803d'
                  : totalFilesPresent > 0
                  ? '#b45309'
                  : '#64748b',
              border: `1px solid ${
                totalFilesPresent === 3
                  ? '#86efac'
                  : totalFilesPresent > 0
                  ? '#fde68a'
                  : '#cbd5e1'
              }`,
            }}
          >
            <i
              className={
                totalFilesPresent === 3
                  ? 'fa-solid fa-circle-check'
                  : totalFilesPresent > 0
                  ? 'fa-solid fa-clock'
                  : 'fa-solid fa-circle-info'
              }
            ></i>
            <span>
              {totalFilesPresent === 3
                ? 'Reportes Completos (3/3 listos)'
                : totalFilesPresent > 0
                ? `Carga parcial (${totalFilesPresent}/3)`
                : 'Sin archivos cargados'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void loadTibState()}
            disabled={isLoading}
            title="Recargar estado desde el servidor"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#334155',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i
              className={`fa-solid fa-arrows-rotate ${isLoading ? 'fa-spin' : ''}`}
              style={{ color: '#0284c7' }}
            ></i>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ALERTAS DE ERROR O ÉXITO */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '16px' }}></i>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {successNotice && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '16px' }}></i>
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#15803d',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* TARJETAS DE CARGA DE LOS 3 ARCHIVOS TIB */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px',
        }}
      >
        {FUENTES.map((f) => {
          const fileData = tibState?.files?.[f.key];
          const isUp = uploadingTib[f.key];
          const pct = uploadPct[f.key] || 0;
          const isDrag = dragActive[f.key];
          const isDel = deletingTib[f.key];

          return (
            <div
              key={f.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive((p) => ({ ...p, [f.key]: true }));
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive((p) => ({ ...p, [f.key]: false }));
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive((p) => ({ ...p, [f.key]: false }));
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void handleUploadFile(f.key, dropped);
              }}
              style={{
                background: '#ffffff',
                border: isDrag
                  ? `2px dashed ${f.color}`
                  : fileData
                  ? `1.5px solid ${f.borderLight}`
                  : '1.5px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: isDrag
                  ? '0 6px 20px rgba(0, 0, 0, 0.08)'
                  : '0 2px 8px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              {/* ENCABEZADO DE LA TARJETA */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: f.bgLight,
                      color: f.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    <i className={f.icon}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                      {f.label}
                    </h3>
                    <code
                      style={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        background: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {f.file}
                    </code>
                  </div>
                </div>

                {/* BADGE DE ESTADO */}
                <div>
                  {fileData ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: '#dcfce7',
                        color: '#15803d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="fa-solid fa-circle-check"></i> Activo
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: '#fef3c7',
                        color: '#d97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="fa-solid fa-circle-dot"></i> Pendiente
                    </span>
                  )}
                </div>
              </div>

              {/* DESCRIPCIÓN */}
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', minHeight: '32px' }}>
                {f.description}
              </p>

              {/* DETALLE DEL ARCHIVO O DROPZONE */}
              {fileData ? (
                <div
                  style={{
                    background: f.bgLight,
                    border: `1px solid ${f.borderLight}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={fileData.nombre_archivo}
                    >
                      <i className="fa-solid fa-file-excel" style={{ color: '#16a34a', flexShrink: 0 }}></i>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fileData.nombre_archivo}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#475569',
                        flexShrink: 0,
                      }}
                    >
                      {formatBytes(fileData.peso_bytes)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '4px',
                      fontSize: '11px',
                      color: '#64748b',
                      paddingTop: '4px',
                      borderTop: '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    <span>
                      <i className="fa-regular fa-clock"></i>{' '}
                      {fileData.subido_en
                        ? new Date(fileData.subido_en).toLocaleDateString([], {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          }) +
                          ' ' +
                          new Date(fileData.subido_en).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recién subido'}
                    </span>
                    {fileData.subido_por_nombre && (
                      <span title="Usuario que subió el reporte">
                        <i className="fa-regular fa-user"></i> {fileData.subido_por_nombre}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '24px 14px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#64748b',
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '26px', color: '#94a3b8' }}></i>
                  <div>
                    <strong style={{ fontSize: '12.5px', color: '#334155', display: 'block' }}>
                      Arrastra tu archivo aquí
                    </strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      o usa el botón inferior para seleccionarlo
                    </span>
                  </div>
                </div>
              )}

              {/* BARRA DE PROGRESO DE SUBIDA */}
              {isUp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>
                    <span>
                      <i className="fa-solid fa-spinner fa-spin"></i> Subiendo a la nube (R2)...
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #0284c7, #16a34a)',
                        transition: 'width 0.15s ease',
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* BOTONES DE ACCIÓN: SUBIR / REEMPLAZAR / QUITAR */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
                <label
                  style={{
                    flex: 1,
                    background: fileData ? '#ffffff' : f.color,
                    color: fileData ? '#0f172a' : '#ffffff',
                    border: fileData ? '1px solid #cbd5e1' : 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: isUp ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: fileData ? '0 1px 3px rgba(0,0,0,0.05)' : `0 4px 10px ${f.color}40`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className={isUp ? 'fa-solid fa-spinner fa-spin' : fileData ? 'fa-solid fa-arrows-rotate' : 'fa-solid fa-arrow-up-from-bracket'}></i>
                  <span>
                    {isUp
                      ? `Subiendo ${pct}%...`
                      : fileData
                      ? 'Reemplazar archivo'
                      : 'Subir archivo'}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx"
                    disabled={isUp}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const picked = e.target.files?.[0];
                      if (picked) void handleUploadFile(f.key, picked);
                      e.target.value = '';
                    }}
                  />
                </label>

                {fileData && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteFile(f.key)}
                    disabled={isUp || isDel}
                    title="Eliminar este archivo"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      cursor: isUp || isDel ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className={isDel ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-trash-can'}></i>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BANNER EXPLICATIVO: ¿CÓMO SE EJECUTA EL CRUCE? */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px',
            }}
          >
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
              ¿Dónde y cómo se realiza el cruce con estos archivos?
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Los reportes que subes aquí quedan almacenados permanentemente en la nube y sincronizados con el Worker de Hostinger. No necesitas volver a cargarlos; realiza el cruce directamente desde los módulos operativos:
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
            marginTop: '4px',
          }}
        >
          {/* ACCESO RÁPIDO A INVENTARIO */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  MÓDULO 3
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Inventario de Paquetes</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Cruza directamente los paquetes físicos de almacén contra los reportes TIB mediante el botón <strong>&quot;Cruzar con TIB&quot;</strong> para actualizar estados, trackings y pesos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab?.('inventario')}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-boxes-stacked"></i>
              <span>Ir a Módulo 3: Inventario</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }}></i>
            </button>
          </div>

          {/* ACCESO RÁPIDO A COBROS */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  MÓDULO 4
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Cobros &amp; Planillas</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Concilia los estados de entrega y cruza la planilla diaria con las entregas de TIB mediante el botón <strong>&quot;Armar Planilla&quot;</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab?.('fico-cobros')}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-hand-holding-dollar"></i>
              <span>Ir a Módulo 4: Cobros</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }}></i>
            </button>
          </div>
        </div>
      </div>

      {/* GUÍA RÁPIDA DE REQUERIMIENTOS TIB */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '12px',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
            Formato requerido: <strong>.xlsx (Excel)</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-weight-scale" style={{ color: '#0284c7' }}></i>
            Tamaño máximo: <strong>100 MB por archivo</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#8b5cf6' }}></i>
            Almacenamiento seguro en Cloudflare R2
          </span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
          Los cambios se sincronizan en tiempo real para todos los operadores.
        </span>
      </div>
    </div>
  );
}
