'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  User,
  Users,
  CheckCircle2,
  Search,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Package,
  Receipt,
  FileSpreadsheet,
  ClipboardPaste,
  RotateCcw,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { CotizacionKambista, Cliente } from '../types';
import { parseExcelCobroBlock } from '../utils/excelCobroParser';
import { smoothScrollManager } from '@/lib/smooth-scroll/manager';

interface WrItemDraft {
  wr: string;
  pesoKg: string;
  precioUsd: string;
  cajaNumero?: string;
  consignatarioNombre?: string;
  notas?: string;
}

interface RegistrarCobroDiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableFechas?: string[];
  allClientNames?: string[];
  clientes?: Cliente[];
  cotizacionKambista: CotizacionKambista;
  getTarifaCliente?: (clienteNombre: string) => { tarifa: number; personalizada: boolean };
  onNavigateToClientes?: () => void;
  onGuardarCobro: (params: {
    fechaLote?: string;
    clienteNombre: string;
    esCorporativo?: boolean;
    observaciones?: string;
    itemsWR: Array<{
      wr: string;
      pesoKg: number;
      precioUsd: number;
      cajaNumero?: string;
      consignatarioNombre?: string;
      notas?: string;
    }>;
    estadoInicialPago?: 'PAGADO' | 'FALTA';
    estadoInicialEntrega?: 'EN_ALMACEN' | 'ENTREGADO';
  }) => void;
}

export const RegistrarCobroDiarioModal: React.FC<RegistrarCobroDiarioModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <RegistrarCobroDiarioModalContent {...props} />;
};

const RegistrarCobroDiarioModalContent: React.FC<RegistrarCobroDiarioModalProps> = ({
  onClose,
  allClientNames = [],
  clientes = [],
  cotizacionKambista,
  getTarifaCliente,
  onNavigateToClientes,
  onGuardarCobro
}) => {
  // Cliente seleccionado o escrito
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [esCorporativo, setEsCorporativo] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  // Tarifa por kilo asignada al cliente
  const [tarifaPorKg, setTarifaPorKg] = useState<number>(7.0);

  // Mensaje de éxito tras pegar desde Excel
  const [pasteSuccessMessage, setPasteSuccessMessage] = useState<string | null>(null);

  // Bloqueo de scroll de fondo y activación de aislamiento para modales
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    smoothScrollManager.pushModalLock();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      smoothScrollManager.popModalLock();
    };
  }, [onClose]);

  // Normalizar lista de clientes con datos del Directorio
  const directoryClients = useMemo(() => {
    if (clientes && clientes.length > 0) {
      return clientes.map((c) => {
        const doc = c.documentoIdentidad?.trim() || '';
        const isEmpresa =
          doc.length === 11 ||
          /^(20|10)\d{9}$/.test(doc) ||
          /(S\.A\.C\.|S\.R\.L\.|E\.I\.R\.L\.|CORP|EMPRESA|GRUPO|IMPORT|LOGISTIC)/i.test(c.nombre);
        return {
          id: c.id,
          nombre: c.nombre.trim(),
          documentoIdentidad: doc,
          telefono: c.telefono || '',
          direccionEntrega: c.direccionEntrega || '',
          esEmpresa: isEmpresa
        };
      });
    }
    // Fallback con nombres existentes
    return allClientNames.map((name, idx) => ({
      id: `cli_${idx}`,
      nombre: name.trim(),
      documentoIdentidad: '',
      telefono: '',
      direccionEntrega: '',
      esEmpresa: /(CORP|SAC|SRL|EMPRESA)/i.test(name)
    }));
  }, [clientes, allClientNames]);

  // Cliente actualmente seleccionado
  const selectedClientObj = useMemo(() => {
    const targetName = (clienteSeleccionado || clienteSearch).trim();
    if (!targetName) return null;
    return (
      directoryClients.find(
        (c) => c.nombre.toUpperCase() === targetName.toUpperCase()
      ) || null
    );
  }, [directoryClients, clienteSeleccionado, clienteSearch]);

  // Actualizar tarifa y tipo de cuenta al seleccionar cliente
  useEffect(() => {
    const currentName = clienteSeleccionado || clienteSearch;
    if (currentName) {
      if (getTarifaCliente) {
        const info = getTarifaCliente(currentName);
        setTarifaPorKg(info.tarifa);
      }
      if (selectedClientObj?.esEmpresa) {
        setEsCorporativo(true);
      }
    }
  }, [clienteSeleccionado, clienteSearch, getTarifaCliente, selectedClientObj]);

  // Estado Inicial por defecto
  const estadoInicialPago: 'PAGADO' | 'FALTA' = 'FALTA';
  const estadoInicialEntrega: 'EN_ALMACEN' | 'ENTREGADO' = 'EN_ALMACEN';

  // Lista de WRs asignados a esta persona
  const [itemsWR, setItemsWR] = useState<WrItemDraft[]>([
    { wr: '', pesoKg: '', precioUsd: '', cajaNumero: '', consignatarioNombre: '', notas: '' }
  ]);

  // Filtrar clientes registrados en el Directorio
  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.trim().toUpperCase();
    if (!q) return directoryClients.slice(0, 10);
    return directoryClients
      .filter((c) => {
        return (
          c.nombre.toUpperCase().includes(q) ||
          (c.documentoIdentidad && c.documentoIdentidad.toUpperCase().includes(q)) ||
          (c.telefono && c.telefono.includes(q))
        );
      })
      .slice(0, 12);
  }, [directoryClients, clienteSearch]);

  // Procesar texto pegado desde Excel
  const handleProcessPastedText = useCallback(
    (text: string) => {
      if (!text || !text.trim()) return;

      const parsed = parseExcelCobroBlock(text, tarifaPorKg, cotizacionKambista.venta);

      if (parsed.itemsWR.length > 0 || parsed.clienteNombre) {
        if (parsed.clienteNombre) {
          setClienteSeleccionado(parsed.clienteNombre);
          setClienteSearch(parsed.clienteNombre);
        }

        if (parsed.itemsWR.length > 0) {
          setItemsWR(parsed.itemsWR);
        }

        setPasteSuccessMessage(
          `¡Pegado exitoso! Se cargaron ${parsed.itemsWR.length} paquete(s) para "${parsed.clienteNombre || 'el cliente'}" (${parsed.totalPeso} kg).`
        );

        setTimeout(() => {
          setPasteSuccessMessage(null);
        }, 6000);
      }
    },
    [tarifaPorKg, cotizacionKambista.venta]
  );

  // Botón directo para pegar desde portapapeles
  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          handleProcessPastedText(text);
          return;
        }
      }
    } catch (err) {
      console.warn('Acceso al portapapeles restringido:', err);
      alert('Tu navegador requiere permiso o no permitió leer el portapapeles directamente. Puedes presionar Ctrl + V dentro de esta ventana para pegar las celdas de Excel.');
    }
  };

  // Soporte global para presionar Ctrl + V en cualquier parte de la ventana
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const text = e.clipboardData?.getData('text');

      if (!text) return;

      // Si el texto pegado tiene formato de tabla de Excel (\t o múltiples líneas con WR/pesos)
      if (text.includes('\t') || (text.includes('\n') && /WR|TOTAL|\d+[.,]\d+/i.test(text))) {
        e.preventDefault();
        handleProcessPastedText(text);
      } else if (!isInput) {
        handleProcessPastedText(text);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [handleProcessPastedText]);

  const addWrRow = () => {
    setItemsWR((prev) => [
      ...prev,
      { wr: '', pesoKg: '', precioUsd: '', cajaNumero: '', consignatarioNombre: '', notas: '' }
    ]);
  };

  const removeWrRow = (index: number) => {
    if (itemsWR.length <= 1) {
      setItemsWR([
        { wr: '', pesoKg: '', precioUsd: '', cajaNumero: '', consignatarioNombre: '', notas: '' }
      ]);
      return;
    }
    setItemsWR((prev) => prev.filter((_, i) => i !== index));
  };

  const updateWrField = (index: number, field: keyof WrItemDraft, value: string) => {
    setItemsWR((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // Si cambia el peso y no hay precio, calcular automáticamente según tarifa
      if (field === 'pesoKg' && value) {
        const peso = parseFloat(value.replace(',', '.'));
        if (!isNaN(peso) && peso > 0) {
          if (!copy[index].precioUsd || parseFloat(copy[index].precioUsd) === 0) {
            const precioSugerido = Math.round(peso * tarifaPorKg * 100) / 100;
            copy[index].precioUsd = precioSugerido.toFixed(2);
          }
        }
      }

      return copy;
    });
  };

  // Cálculos de totales
  const totalPeso = useMemo(() => {
    return itemsWR.reduce((acc, item) => {
      const p = parseFloat(item.pesoKg.replace(',', '.')) || 0;
      return acc + p;
    }, 0);
  }, [itemsWR]);

  const totalUsd = useMemo(() => {
    return itemsWR.reduce((acc, item) => {
      const val = parseFloat(item.precioUsd) || 0;
      return acc + val;
    }, 0);
  }, [itemsWR]);

  const totalPen = useMemo(() => {
    return Math.round(totalUsd * cotizacionKambista.venta * 100) / 100;
  }, [totalUsd, cotizacionKambista.venta]);

  const wrsValidos = useMemo(() => {
    return itemsWR.filter(
      (w) => w.wr.trim().length > 0 || (parseFloat(w.pesoKg.replace(',', '.')) || 0) > 0
    );
  }, [itemsWR]);

  const clienteNombreFinal = (clienteSeleccionado || clienteSearch).trim();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clienteNombreFinal) {
      alert('Por favor ingresa o selecciona un cliente para este cobro.');
      return;
    }

    if (wrsValidos.length === 0) {
      alert('Por favor ingresa o pega al menos un número de WR o peso para este cobro.');
      return;
    }

    onGuardarCobro({
      fechaLote: new Date().toLocaleDateString('es-PE'),
      clienteNombre: clienteNombreFinal,
      esCorporativo,
      observaciones: observaciones.trim() || undefined,
      itemsWR: wrsValidos.map((w, idx) => ({
        wr: w.wr.trim().toUpperCase() || `WR-${Date.now().toString().slice(-6)}-${idx + 1}`,
        pesoKg: parseFloat(w.pesoKg.replace(',', '.')) || 0,
        precioUsd: parseFloat(w.precioUsd) || 0,
        cajaNumero: w.cajaNumero?.trim() || undefined,
        consignatarioNombre: w.consignatarioNombre?.trim() || undefined,
        notas: w.notas?.trim() || undefined
      })),
      estadoInicialPago,
      estadoInicialEntrega
    });

    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      data-lenis-prevent=""
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      <div
        data-lenis-prevent=""
        onWheel={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1220px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          height: '94vh'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <Plus style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Registrar Cobro a Cliente</h2>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    letterSpacing: '0.02em'
                  }}
                >
                  ⚡ Pegado Excel + Preview en Vivo
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#d1fae5', margin: '2px 0 0 0' }}>
                Copia las celdas de tu Excel (Ctrl+C) y pégalas aquí para autocompletar cliente, WRs y liquidación
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
            title="Cerrar modal"
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* MODAL BODY (SPLIT VIEW: IZQUIERDA PEGADO/EDICIÓN - DERECHA PREVIEW PROVISIONAL) */}
        <div
          data-lenis-prevent=""
          onWheel={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '20px',
            padding: '20px 24px',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* ============================================================== */}
          {/* COLUMNA IZQUIERDA: ZONA DE PEGADO Y FORMULARIO DE EDICIÓN      */}
          {/* ============================================================== */}
          <div
            data-lenis-prevent=""
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: 0
            }}
          >

            {/* 2. DATOS DEL CLIENTE / EMPRESA */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User style={{ width: '15px', height: '15px', color: '#2563eb' }} />
                  Cliente o Empresa *
                </label>

                {directoryClients.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: 700, color: '#1d4ed8' }}>
                    <ShieldCheck style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                    <span>Directorio AMEX</span>
                    <span style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '1px 5px', borderRadius: '10px', fontSize: '10px', fontFamily: 'monospace' }}>
                      {directoryClients.length}
                    </span>
                  </div>
                )}
              </div>

              {/* INPUT DE CLIENTE */}
              <div style={{ position: 'relative' }}>
                <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Escribe o busca el nombre del cliente (ej: AMEX ALEJANDRO QUIJANO)..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setClienteSeleccionado(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: '36px',
                    paddingRight: clienteSearch ? '32px' : '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    fontSize: '12.5px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    outline: 'none',
                    fontWeight: 700
                  }}
                />
                {clienteSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSearch('');
                      setClienteSeleccionado('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* LISTA DE RESULTADOS DEL DIRECTORIO SI HAY COINCIDENCIAS */}
              {clientesFiltrados.length > 0 && !selectedClientObj && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>
                    Sugerencias del Directorio:
                  </span>
                  <div
                    data-lenis-prevent=""
                    onWheel={(e) => e.stopPropagation()}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '5px',
                      maxHeight: '105px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      padding: '4px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {clientesFiltrados.map((cli) => {
                      return (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(cli.nombre);
                            setClienteSearch(cli.nombre);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px'
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cli.nombre}
                          </span>
                          {cli.esEmpresa ? (
                            <span style={{ fontSize: '8.5px', fontWeight: 800, backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                              CORP
                            </span>
                          ) : (
                            <span style={{ fontSize: '8.5px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                              PERS
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. TABLA EDITABLE DE PAQUETES (WRs) */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package style={{ width: '15px', height: '15px', color: '#059669' }} />
                  Paquetes ({itemsWR.length})
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Pegar celdas copiadas de Excel (o presiona Ctrl+V)"
                  >
                    <ClipboardPaste style={{ width: '13px', height: '13px' }} />
                    Pegar bloque desde Excel
                  </button>

                  <button
                    type="button"
                    onClick={addWrRow}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#059669',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} /> Agregar WR manual
                  </button>
                </div>
              </div>

              {/* MENSAJE DE CONFIRMACIÓN TRAS PEGAR */}
              {pasteSuccessMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    fontSize: '11.5px',
                    fontWeight: 700
                  }}
                >
                  <CheckCircle2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{pasteSuccessMessage}</span>
                </div>
              )}

              {/* TABLA DE WRs */}
              <div
                data-lenis-prevent=""
                onWheel={(e) => e.stopPropagation()}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  overscrollBehavior: 'contain'
                }}
              >
                <table style={{ width: '100%', fontSize: '11.5px', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '6px 10px' }}>CÓDIGO WR *</th>
                      <th style={{ padding: '6px 10px', width: '85px' }}>PESO (kg) *</th>
                      <th style={{ padding: '6px 10px', width: '95px' }}>PRECIO $</th>
                      <th style={{ padding: '6px 10px', width: '85px', color: '#059669' }}>SOLES (S/)</th>
                      <th style={{ padding: '6px 10px', width: '80px' }}>CAJA/TRACK</th>
                      <th style={{ padding: '6px 6px', width: '32px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWR.map((wrRow, idx) => {
                      const rowPrice = parseFloat(wrRow.precioUsd) || 0;
                      const rowPen = (rowPrice * cotizacionKambista.venta).toFixed(2);

                      return (
                        <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px' }}>
                            <input
                              type="text"
                              placeholder="Ej: WR000466682"
                              value={wrRow.wr}
                              onChange={(e) => updateWrField(idx, 'wr', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '3px 6px',
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#0f172a',
                                backgroundColor: '#ffffff'
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <input
                              type="text"
                              placeholder="Ej: 2.78"
                              value={wrRow.pesoKg}
                              onChange={(e) => updateWrField(idx, 'pesoKg', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '3px 6px',
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                                textAlign: 'right'
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={wrRow.precioUsd}
                              onChange={(e) => updateWrField(idx, 'precioUsd', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              style={{
                                width: '100%',
                                padding: '3px 6px',
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                                textAlign: 'right'
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#059669', textAlign: 'right', fontSize: '11px' }}>
                            S/ {rowPen}
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <input
                              type="text"
                              placeholder="Caja"
                              value={wrRow.cajaNumero || ''}
                              onChange={(e) => updateWrField(idx, 'cajaNumero', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '3px 6px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeWrRow(idx)}
                              style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                              title="Eliminar fila"
                            >
                              <Trash2 style={{ width: '13px', height: '13px', color: '#ef4444' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. OBSERVACIONES OPCIONALES */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                Observaciones / Notas (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Pagará en efectivo cuando recoja motorizado"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* COLUMNA DERECHA: PREVIEW EN VIVO DE LIQUIDACIÓN PROVISIONAL    */}
          {/* ============================================================== */}
          <div
            data-lenis-prevent=""
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0
            }}
          >
            {/* ENCABEZADO PREVIEW */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt style={{ width: '18px', height: '18px', color: '#2563eb' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Preview de Cobro Provisional
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#475569',
                  backgroundColor: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}
              >
                {new Date().toLocaleDateString('es-PE')}
              </span>
            </div>

            {/* CONTENIDO PREVIEW */}
            <div
              data-lenis-prevent=""
              onWheel={(e) => e.stopPropagation()}
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain'
              }}
            >
              {/* FICHA DEL CLIENTE */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#1e3a8a' }}>
                    {clienteNombreFinal || 'Nombre del Cliente'}
                  </span>
                  {selectedClientObj ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        border: '1px solid #86efac'
                      }}
                    >
                      <CheckCircle2 style={{ width: '11px', height: '11px' }} /> Verificado en Directorio
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      Cliente Libre
                    </span>
                  )}
                </div>

                {selectedClientObj?.documentoIdentidad && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Doc: {selectedClientObj.documentoIdentidad}
                  </span>
                )}
              </div>

              {/* TARJETAS MÉTRICAS DE TOTALES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Paquetes</span>
                  <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 900 }}>{wrsValidos.length} WRs</strong>
                </div>

                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Peso Total</span>
                  <strong style={{ fontSize: '15px', color: '#059669', fontWeight: 900 }}>{totalPeso.toFixed(2)} kg</strong>
                </div>

                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Tarifa</span>
                  <strong style={{ fontSize: '15px', color: '#2563eb', fontWeight: 900 }}>${tarifaPorKg.toFixed(2)}/kg</strong>
                </div>
              </div>

              {/* DESGLOSE DETALLADO DE PAQUETES (WRs) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Desglose de Paquetes en este Cobro:
                </span>
                <div
                  data-lenis-prevent=""
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    overscrollBehavior: 'contain',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {wrsValidos.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px' }}>
                      No hay paquetes ingresados todavía
                    </div>
                  ) : (
                    <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '9.5px', fontWeight: 800, borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '5px 8px' }}>WR</th>
                          <th style={{ padding: '5px 8px', textAlign: 'right' }}>PESO</th>
                          <th style={{ padding: '5px 8px' }}>CAJA/TRACK</th>
                          <th style={{ padding: '5px 8px', textAlign: 'right' }}>USD ($)</th>
                          <th style={{ padding: '5px 8px', textAlign: 'right', color: '#059669' }}>SOLES (S/)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wrsValidos.map((w, i) => {
                          const pUsd = parseFloat(w.precioUsd) || 0;
                          const pPen = (pUsd * cotizacionKambista.venta).toFixed(2);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 800, color: '#1e40af' }}>
                                {w.wr || `WR-${i + 1}`}
                              </td>
                              <td style={{ padding: '4px 8px', fontFamily: 'monospace', textAlign: 'right' }}>
                                {w.pesoKg ? `${parseFloat(w.pesoKg.replace(',', '.')).toFixed(2)} kg` : '-'}
                              </td>
                              <td style={{ padding: '4px 8px', color: '#475569', fontSize: '10.5px' }}>
                                {w.cajaNumero || '-'}
                              </td>
                              <td style={{ padding: '4px 8px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>
                                ${pUsd.toFixed(2)}
                              </td>
                              <td style={{ padding: '4px 8px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                                S/ {pPen}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* RECUADRO RESUMEN FINANCIERO */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#4b5563' }}>
                  <span>Subtotal en Dólares:</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>
                    ${totalUsd.toFixed(2)} USD
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#4b5563' }}>
                  <span>Tipo de Cambio (Kambista):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    S/ {cotizacionKambista.venta.toFixed(3)}
                  </span>
                </div>

                <div
                  style={{
                    borderTop: '1px dashed #86efac',
                    paddingTop: '8px',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#166534', textTransform: 'uppercase' }}>
                    Total a Cobrar:
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
                      S/ {totalPen.toFixed(2)} PEN
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      (${totalUsd.toFixed(2)} USD)
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÓN DE CONFIRMACIÓN DIRECTO EN LA PREVIEW */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!clienteNombreFinal || wrsValidos.length === 0}
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '13.5px',
                  color: '#ffffff',
                  backgroundColor: !clienteNombreFinal || wrsValidos.length === 0 ? '#94a3b8' : '#059669',
                  border: 'none',
                  cursor: !clienteNombreFinal || wrsValidos.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: !clienteNombreFinal || wrsValidos.length === 0 ? 'none' : '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                Confirmar y Guardar Cobro
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Registrando cobro para:{' '}
              <strong style={{ color: '#0f172a' }}>{clienteNombreFinal || '(Sin cliente)'}</strong>
            </span>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!clienteNombreFinal || wrsValidos.length === 0}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '12.5px',
                color: '#ffffff',
                backgroundColor: !clienteNombreFinal || wrsValidos.length === 0 ? '#94a3b8' : '#059669',
                border: 'none',
                cursor: !clienteNombreFinal || wrsValidos.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 style={{ width: '15px', height: '15px' }} />
              Guardar Cobro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
