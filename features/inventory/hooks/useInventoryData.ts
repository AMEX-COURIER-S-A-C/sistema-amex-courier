'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Paquete,
  TipoUbicacion,
  TipoEstadoEntrega,
  TipoEstadoAmex,
  EstanteriaPosicion,
  MovimientoKardex,
  AlmacenSede
} from '@/types';
import { supabase } from '@/lib/supabase/client';
import { matchesFuzzySearch } from '@/lib/fuzzySearch';
import { exportPaquetesToExcel, exportKardexToExcel } from '@/lib/excelExport';
import { confirmDialog, alertDialog, promptDialog } from '@/lib/dialog';
import { toast } from '@/lib/toast';
import { soundEffects } from '@/lib/audio/soundEffects';
import { inventoryService } from '../services/inventory.service';
import { BatchShelfData, SinglePositionData, TransferFormData, DateFilterState } from '../types';
import { initialDateFilter, isPackageInDateFilter, resolveDateFilterRange } from '../utils/dateFilter';
import { parseWarehouseLocation } from '@/lib/validations/locations';

export interface UseInventoryDataProps {
  paquetes: Paquete[];
  onUpdatePackage?: (updated: Paquete) => void;
  onDeletePackage?: (id: string) => void;
  onRefreshData?: () => Promise<void> | void;
}

export function useInventoryData({
  paquetes,
  onUpdatePackage,
  onDeletePackage,
  onRefreshData
}: UseInventoryDataProps) {
  // Sub-pestañas: 'existencias' | 'movimientos' | 'matriz' | 'gestor'
  const [activeSubTab, setActiveSubTab] = useState<'existencias' | 'movimientos' | 'matriz' | 'gestor'>('existencias');

  // Filtros de Existencias (Limpios por defecto)
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [shelfFilter, setShelfFilter] = useState<string>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [statusAmexFilter, setStatusAmexFilter] = useState<string>('ALL');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(initialDateFilter);
  const resetDateFilter = useCallback(() => setDateFilter(initialDateFilter), []);

  // Paginación reactiva
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Búsqueda y Paginación Server-Side (PostgreSQL / Supabase RPC)
  const [serverPaquetes, setServerPaquetes] = useState<Paquete[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverExistenciasActivas, setServerExistenciasActivas] = useState<number>(0);
  const [serverPesoTotalKg, setServerPesoTotalKg] = useState<number>(0);
  const [isLoadingServer, setIsLoadingServer] = useState<boolean>(false);
  const [deliveringIds, setDeliveringIds] = useState<string[]>([]);
  const [recentlyDeliveredIds, setRecentlyDeliveredIds] = useState<string[]>([]);

  // Filtros de Kardex
  const [kardexSearch, setKardexSearch] = useState('');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('ALL');

  // Selección múltiple para acciones en lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Datos de Supabase en Tiempo Real
  const [kardexList, setKardexList] = useState<MovimientoKardex[]>([]);
  const [posicionesList, setPosicionesList] = useState<EstanteriaPosicion[]>([]);
  const [sedesList, setSedesList] = useState<AlmacenSede[]>([]);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);

  // Modales Pop-Up
  const [isGestorModalOpen, setIsGestorModalOpen] = useState(false);
  const [isMatrizModalOpen, setIsMatrizModalOpen] = useState(false);
  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewPositionModalOpen, setIsNewPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<EstanteriaPosicion | null>(null);
  const [isBatchStatusModalOpen, setIsBatchStatusModalOpen] = useState(false);
  const [isBulkWrModalOpen, setIsBulkWrModalOpen] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState<TipoEstadoEntrega>('EnAlmacen');
  const [batchTargetStatusAmex, setBatchTargetStatusAmex] = useState<TipoEstadoAmex>('en_almacen');
  const [selectedThermalPkg, setSelectedThermalPkg] = useState<Paquete | null>(null);
  const [selectedPackageForAction, setSelectedPackageForAction] = useState<Paquete | null>(null);

  // Filtros interactivos para la vista de Anaqueles
  const [shelfSearchTerm, setShelfSearchTerm] = useState('');
  const [shelfZoneFilter, setShelfZoneFilter] = useState<string>('ALL');
  const [shelfOccupancyFilter, setShelfOccupancyFilter] = useState<string>('ALL');

  // Modo de creación de anaquel: 'batch' | 'single'
  const [newPositionMode, setNewPositionMode] = useState<'batch' | 'single'>('batch');
  const [batchShelfData, setBatchShelfData] = useState<BatchShelfData>({
    almacenCodigo: 'LIN',
    codigoEstante: '',
    cantidadPisos: 3,
    capacidadPorPiso: 40,
    pesoPorPiso: 150,
    zonaTipo: 'ALMACENAJE',
    descripcion: ''
  });

  // Formulario de Traslado / Reubicación
  const [transferData, setTransferData] = useState<TransferFormData>({
    targetUbicacion: 'AmexLince',
    targetAnaquel: 'A1',
    targetPiso: 'P1',
    motivo: 'Reubicación WMS de Almacén',
    operador: 'Operador Logístico AMEX'
  });

  // Formulario de Edición de Paquete
  const [editFormData, setEditFormData] = useState<Partial<Paquete>>({});

  // Formulario de Nueva Posición Individual
  const [newPositionData, setNewPositionData] = useState<SinglePositionData>({
    almacenCodigo: 'LIN',
    codigoEstante: 'A3',
    nivelPiso: 'P1',
    zonaTipo: 'ALMACENAJE',
    capacidadMaxPaquetes: 40,
    pesoMaxKg: 120,
    descripcion: 'Nuevo anaquel de almacenamiento'
  });

  // Carga de Kardex, Posiciones y Sedes desde Supabase
  const fetchData = useCallback(async () => {
    setIsLoadingKardex(true);
    try {
      const [sedes, posiciones, kardex] = await Promise.all([
        inventoryService.getSedes(),
        inventoryService.getPosiciones(),
        inventoryService.getKardex(200)
      ]);
      setSedesList(sedes);
      setPosicionesList(posiciones);
      setKardexList(kardex);
    } catch (err) {
      console.warn('Error fetching WMS data from Supabase:', err);
    } finally {
      setIsLoadingKardex(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Suscripción Realtime a movimientos_kardex
    const kardexChannel = supabase
      .channel('kardex_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movimientos_kardex' },
        payload => {
          const newK = payload.new as any;
          setKardexList(prev => [
            {
              id: newK.id,
              paqueteId: newK.paquete_id,
              codigoPaquete: newK.codigo_paquete,
              consignatario: newK.consignatario || '',
              origenDescripcion: newK.origen_descripcion,
              destinoDescripcion: newK.destino_descripcion,
              tipoMovimiento: newK.tipo_movimiento,
              motivo: newK.motivo || '',
              usuarioOperador: newK.usuario_operador || 'Operador AMEX',
              creadoEn: newK.creado_en || new Date().toISOString()
            },
            ...prev
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kardexChannel);
    };
  }, [fetchData]);

  // Búsqueda Server-Side con PostgreSQL RPC + GIN Trigram
  const fetchServerPaquetes = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingServer(true);
    try {
      const { fechaDesde, fechaHasta } = resolveDateFilterRange(dateFilter);
      const res = await inventoryService.searchPaquetesServerSide({
        searchTerm,
        locationFilter,
        statusAmexFilter,
        deliveryTypeFilter,
        shelfFilter,
        floorFilter,
        packageTypeFilter,
        fechaDesde,
        fechaHasta,
        page: currentPage,
        pageSize
      });

      setServerPaquetes(prev => {
        // Preservar temporalmente en la vista aquellos paquetes recién entregados para que no desaparezcan bruscamente
        const activeRecent = prev.filter(p => recentlyDeliveredIds.includes(p.id));
        const merged = [...res.paquetes];
        for (const recent of activeRecent) {
          if (!merged.some(m => m.id === recent.id)) {
            merged.push(recent);
          }
        }
        return merged;
      });
      setServerTotal(res.total);
      setServerExistenciasActivas(res.existenciasActivas);
      setServerPesoTotalKg(res.pesoTotalKg);
    } catch (err) {
      console.error('Error fetching server-side packages:', err);
    } finally {
      if (!isSilent) setIsLoadingServer(false);
    }
  }, [
    searchTerm,
    locationFilter,
    statusAmexFilter,
    deliveryTypeFilter,
    shelfFilter,
    floorFilter,
    packageTypeFilter,
    dateFilter,
    currentPage,
    pageSize,
    recentlyDeliveredIds
  ]);

  useEffect(() => {
    fetchServerPaquetes();
  }, [fetchServerPaquetes]);

  // Suscripción Realtime a cambios en la tabla 'paquetes'
  useEffect(() => {
    const paquetesChannel = supabase
      .channel('paquetes_realtime_inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paquetes' },
        () => {
          fetchServerPaquetes(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paquetesChannel);
    };
  }, [fetchServerPaquetes]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, shelfFilter, floorFilter, packageTypeFilter, statusFilter, statusAmexFilter, deliveryTypeFilter, dateFilter, pageSize]);

  // Total de páginas determinado por el total devuelto por Supabase PostgreSQL
  const totalPages = Math.max(1, Math.ceil((serverTotal || serverPaquetes.length || paquetes.length) / pageSize));

  // Paquetes paginados directos del servidor (50 registros bajo demanda)
  const paginatedPaquetes = useMemo(() => {
    if (
      serverPaquetes.length > 0 ||
      searchTerm.trim() !== '' ||
      locationFilter !== 'ALL' ||
      statusAmexFilter !== 'ALL' ||
      deliveryTypeFilter !== 'ALL' ||
      shelfFilter !== 'ALL' ||
      floorFilter !== 'ALL' ||
      packageTypeFilter !== 'ALL' ||
      dateFilter.type !== 'ALL'
    ) {
      return serverPaquetes;
    }
    // Fallback únicamente si es el montaje inicial antes de que termine el primer RPC
    if (isLoadingServer && paquetes.length > 0) {
      return paquetes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }
    return serverPaquetes;
  }, [
    serverPaquetes,
    searchTerm,
    locationFilter,
    statusAmexFilter,
    deliveryTypeFilter,
    shelfFilter,
    floorFilter,
    packageTypeFilter,
    dateFilter.type,
    isLoadingServer,
    paquetes,
    currentPage,
    pageSize
  ]);

  const filteredPaquetes = paginatedPaquetes;

  // Conteos en tiempo real por Estado AMEX para píldoras rápidas
  const amexStatusCounts = useMemo(() => {
    let en_almacen = 0;
    let listo_recojo = 0;
    let en_ruta = 0;
    let entregado = 0;

    paquetes.forEach(p => {
      const st = p.estadoAmex;
      if (st === 'en_almacen' || st === 'recibido') en_almacen++;
      else if (st === 'listo_recojo') listo_recojo++;
      else if (st === 'en_ruta') en_ruta++;
      else if (st === 'entregado') entregado++;
    });

    const activas = serverExistenciasActivas > 0
      ? serverExistenciasActivas
      : paquetes.filter(p => p.estadoAmex !== 'entregado' && p.ubicacionActual !== 'Entregado').length;

    return {
      total: serverTotal > 0 ? serverTotal : paquetes.length,
      activas,
      recibido: 0,
      en_almacen,
      listo_recojo,
      en_ruta,
      entregado
    };
  }, [paquetes, serverTotal, serverExistenciasActivas]);

  // Filtrado reactivo de Kardex
  const filteredKardex = useMemo(() => {
    return kardexList.filter(k => {
      const matchesSearch = matchesFuzzySearch(kardexSearch, [
        k.codigoPaquete,
        k.consignatario,
        k.origenDescripcion,
        k.destinoDescripcion,
        k.usuarioOperador,
        k.motivo,
        k.tipoMovimiento
      ]);
      const matchesType = kardexTypeFilter === 'ALL' || k.tipoMovimiento === kardexTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [kardexList, kardexSearch, kardexTypeFilter]);

  // Agrupación dinámica de posiciones de estantería por anaquel
  const shelfGroups = useMemo(() => {
    const groups: { [key: string]: EstanteriaPosicion[] } = {};

    const effectivePosiciones =
      posicionesList.length > 0
        ? posicionesList
        : [
            { id: '1', almacenId: 'LIN', codigoEstante: 'A1', nivelPiso: 'P1', codigoPosicion: 'A1-P1', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 150 },
            { id: '2', almacenId: 'LIN', codigoEstante: 'A1', nivelPiso: 'P2', codigoPosicion: 'A1-P2', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 120 },
            { id: '3', almacenId: 'LIN', codigoEstante: 'A1', nivelPiso: 'P3', codigoPosicion: 'A1-P3', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 80 },
            { id: '4', almacenId: 'LIN', codigoEstante: 'A1', nivelPiso: 'P4', codigoPosicion: 'A1-P4', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 80 },
            { id: '5', almacenId: 'LIN', codigoEstante: 'A2', nivelPiso: 'P1', codigoPosicion: 'A2-P1', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 150 },
            { id: '6', almacenId: 'LIN', codigoEstante: 'A2', nivelPiso: 'P2', codigoPosicion: 'A2-P2', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 120 },
            { id: '7', almacenId: 'LIN', codigoEstante: 'A2', nivelPiso: 'P3', codigoPosicion: 'A2-P3', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 80 },
            { id: '8', almacenId: 'LIN', codigoEstante: 'A2', nivelPiso: 'P4', codigoPosicion: 'A2-P4', zonaTipo: 'ALMACENAJE', capacidadMaxPaquetes: 40, pesoMaxKg: 80 },
            { id: '9', almacenId: 'LIN', codigoEstante: 'OFI', nivelPiso: 'N/A', codigoPosicion: 'OFI', zonaTipo: 'OFICINA', capacidadMaxPaquetes: 100, pesoMaxKg: 500, descripcion: 'Oficina (OFI)' },
            { id: '10', almacenId: 'LIN', codigoEstante: 'DSP-Z1', nivelPiso: 'N/A', codigoPosicion: 'DSP-Z1', zonaTipo: 'DESPACHO', capacidadMaxPaquetes: 100, pesoMaxKg: 500, descripcion: 'Despacho Zona 1' },
            { id: '11', almacenId: 'LIN', codigoEstante: 'DSP-Z2', nivelPiso: 'N/A', codigoPosicion: 'DSP-Z2', zonaTipo: 'DESPACHO', capacidadMaxPaquetes: 100, pesoMaxKg: 500, descripcion: 'Despacho Zona 2' }
          ];

    effectivePosiciones.forEach(pos => {
      if (!groups[pos.codigoEstante]) {
        groups[pos.codigoEstante] = [];
      }
      groups[pos.codigoEstante].push(pos);
    });

    return groups;
  }, [posicionesList]);

  // Selección múltiple
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPaquetes.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  // Abrir Modal de Traslado
  const openTransferModal = (singlePkg?: Paquete) => {
    if (singlePkg) {
      setSelectedPackageForAction(singlePkg);
      setSelectedIds([singlePkg.id]);
      const initialAnaquel = singlePkg.anaquel || 'A1';
      const isLevelLessInit =
        initialAnaquel === 'OFI' ||
        initialAnaquel === 'REC' ||
        initialAnaquel.startsWith('DSP');

      setTransferData(prev => ({
        ...prev,
        targetUbicacion: singlePkg.ubicacionActual,
        targetAnaquel: initialAnaquel,
        targetPiso: isLevelLessInit ? '' : (singlePkg.piso || 'P1')
      }));
    } else {
      setSelectedPackageForAction(null);
    }
    setIsTransferModalOpen(true);
  };

  // Ejecutar Traslado
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const idsToMove = selectedPackageForAction ? [selectedPackageForAction.id] : selectedIds;
    if (idsToMove.length === 0) return;

    try {
      const { updatedPackages } = await inventoryService.executeTransfer(
        idsToMove,
        transferData,
        paquetes
      );
      if (onUpdatePackage) {
        updatedPackages.forEach(p => onUpdatePackage(p));
      }
      setServerPaquetes(prev =>
        prev.map(p => {
          const found = updatedPackages.find(u => u.id === p.id);
          return found || p;
        })
      );
    } catch (err) {
      console.warn('Error executing transfer:', err);
    }

    setIsTransferModalOpen(false);
    setSelectedIds([]);
    setSelectedPackageForAction(null);
  };

  // Abrir Modal de Edición de Paquete
  const openEditModal = (pkg: Paquete) => {
    setSelectedPackageForAction(pkg);
    setEditFormData({ ...pkg });
    setIsEditModalOpen(true);
  };

  // Guardar Edición de Paquete
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageForAction) return;

    const rawPos =
      editFormData.posicionEstante || `${editFormData.anaquel || 'A1'}-${editFormData.piso || 'P1'}`;
    const parsed = parseWarehouseLocation(rawPos);
    const ana = parsed.anaquel;
    const pis = parsed.piso || '';
    const pos = parsed.posicionEstante;

    const targetStatusAmex = (editFormData.estadoAmex === 'recibido'
      ? 'en_almacen'
      : (editFormData.estadoAmex || selectedPackageForAction.estadoAmex || 'en_almacen')) as TipoEstadoAmex;

    // Protección anti-chancado: si el paquete ya estaba ENTREGADO y se intenta cambiar a otro estado
    if (selectedPackageForAction.estadoAmex === 'entregado' && targetStatusAmex !== 'entregado') {
      const statusLabel =
        targetStatusAmex === 'en_almacen'
          ? 'En Almacén'
          : targetStatusAmex === 'listo_recojo'
          ? 'Listo Recojo'
          : targetStatusAmex === 'en_ruta'
          ? 'En Ruta'
          : targetStatusAmex;

      const confirmed = await confirmDialog({
        title: '⚠️ Confirmar Reversión de Entrega',
        message: `El paquete WR #${selectedPackageForAction.numeroReciboBodega} del cliente "${selectedPackageForAction.nombreConsignatario || 'Sin Nombre'}" ya fue marcado como ENTREGADO.\n\n¿Estás seguro de regresarlo al estado "${statusLabel}"? Esto reingresará el paquete al inventario activo.`,
        confirmText: 'Sí, Revertir Entrega',
        cancelText: 'Mantener como Entregado',
        variant: 'warning'
      });

      if (!confirmed) {
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const updated: Paquete = {
      ...selectedPackageForAction,
      ...editFormData,
      anaquel: ana,
      piso: pis,
      posicionEstante: pos,
      pesoKg: Number(editFormData.pesoKg || 0),
      estadoAmex: targetStatusAmex,
      actualizadoEn: nowIso
    };

    if (onUpdatePackage) {
      onUpdatePackage(updated);
    }
    setServerPaquetes(prev => prev.map(p => (p.id === updated.id ? updated : p)));

    try {
      await inventoryService.updatePackage(updated);
    } catch (err) {
      console.warn('Error updating package in Supabase:', err);
    }

    setIsEditModalOpen(false);
    setSelectedPackageForAction(null);
  };

  // Eliminar paquete individual con advertencia explícita de papelera
  const handleDeletePackage = async (pkgId: string, wrCode: string) => {
    const confirmed = await confirmDialog({
      title: '⚠️ Confirmar Envío a Papelera',
      message: `¿Estás seguro de enviar el paquete ${wrCode} a la papelera (Soft Delete)? Dejará de mostrarse en la vista activa de Almacén Lince, pero sus datos se conservarán en auditoría.`,
      confirmText: 'Sí, enviar a papelera',
      cancelText: 'Cancelar y conservar',
      variant: 'danger',
      safeFocusCancel: true
    });
    if (!confirmed) return;
    try {
      await inventoryService.deletePackage(pkgId);
      if (onDeletePackage) {
        onDeletePackage(pkgId);
      }
      setServerPaquetes(prev => prev.filter(x => x.id !== pkgId));
      setServerTotal(prev => Math.max(0, prev - 1));
      setSelectedIds(prev => prev.filter(x => x !== pkgId));
      toast.success('Paquete en papelera', `El paquete ${wrCode} fue enviado a la papelera (Soft Delete).`);
    } catch (err) {
      console.error('Error eliminando paquete:', err);
      await alertDialog({
        title: 'Error de eliminación',
        message: 'No se pudo eliminar el paquete. Inténtalo de nuevo o contacta al administrador.',
        variant: 'danger'
      });
    }
  };

  // Cambio rápido de estado individual TIB
  const handleQuickStatusChange = async (pkg: Paquete, newStatus: TipoEstadoEntrega) => {
    try {
      await inventoryService.quickStatusChange(pkg, newStatus);
      const updated: Paquete = { ...pkg, estadoEntrega: newStatus, estadoTib: newStatus, actualizadoEn: new Date().toISOString() };
      if (onUpdatePackage) onUpdatePackage(updated);
      setServerPaquetes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Error actualizando estado TIB:', err);
    }
  };

  // Cambio rápido de estado operativo individual AMEX
  const handleQuickStatusAmexChange = async (pkg: Paquete, newStatusAmex: TipoEstadoAmex) => {
    try {
      await inventoryService.quickStatusAmexChange(pkg, newStatusAmex);
      const updated: Paquete = { ...pkg, estadoAmex: newStatusAmex, actualizadoEn: new Date().toISOString() };
      if (onUpdatePackage) onUpdatePackage(updated);
      setServerPaquetes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      soundEffects.playSuccess();
      const statusLabel =
        newStatusAmex === 'entregado'
          ? 'Entregado'
          : newStatusAmex === 'en_almacen' || newStatusAmex === 'recibido'
          ? 'En Almacén'
          : newStatusAmex === 'listo_recojo'
          ? 'Listo Recojo'
          : newStatusAmex === 'en_ruta'
          ? 'En Ruta'
          : newStatusAmex;
      toast.success('Estado actualizado', `Guía ${pkg.numeroReciboBodega} cambió a "${statusLabel}"`);
    } catch (err) {
      console.error('Error actualizando estado AMEX:', err);
      toast.error('Error', 'No se pudo actualizar el estado.');
    }
  };

  // Entrega con modalidad obligatoria (Presencial, Agencia, Domicilio, Motorizado)
  const handleQuickDeliver = async (
    pkg: Paquete,
    tipoEntrega: string = 'Presencial',
    detalleEntrega?: string
  ) => {
    // 1. Marcar como procesando y guardar temporalmente en entrega reciente
    setDeliveringIds(prev => [...prev, pkg.id]);
    setRecentlyDeliveredIds(prev => [...prev, pkg.id]);

    // 2. Feedback optimista inmediato en memoria (0ms)
    const nowIso = new Date().toISOString();
    const optimisticUpdated: Paquete = {
      ...pkg,
      estadoAmex: 'entregado',
      estadoTib: 'Entregado',
      estadoEntrega: 'Entregado',
      ubicacionActual: 'Entregado',
      tipoEntrega: tipoEntrega as any,
      detalleEntrega: detalleEntrega || undefined,
      actualizadoEn: nowIso
    };

    if (onUpdatePackage) {
      onUpdatePackage(optimisticUpdated);
    }
    setServerPaquetes(prev => prev.map(p => (p.id === pkg.id ? optimisticUpdated : p)));

    // 3. Audio de éxito corporativo y Toast instantáneo
    soundEffects.playSuccess();
    const detalleToast = tipoEntrega === 'Agencia' ? `Agencia (${detalleEntrega || 'Shalom'})` : tipoEntrega;
    toast.success('Entrega Registrada', `Guía ${pkg.numeroReciboBodega} • Modalidad: ${detalleToast}`);

    try {
      const updated = await inventoryService.quickDeliver(pkg, tipoEntrega, detalleEntrega);
      if (onUpdatePackage) {
        onUpdatePackage(updated);
      }
      setServerPaquetes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Error al entregar paquete:', err);
      // Revertir optimismo
      if (onUpdatePackage) {
        onUpdatePackage(pkg);
      }
      setServerPaquetes(prev => prev.map(p => (p.id === pkg.id ? pkg : p)));
      setRecentlyDeliveredIds(prev => prev.filter(id => id !== pkg.id));
      soundEffects.playNotFound();
      toast.error('Error de entrega', 'No se pudo guardar la entrega en el servidor.');
    } finally {
      setDeliveringIds(prev => prev.filter(id => id !== pkg.id));
      setTimeout(() => {
        setRecentlyDeliveredIds(prev => prev.filter(id => id !== pkg.id));
      }, 2500);
    }
  };

  // Pre-asignar o actualizar modalidad de entrega
  const handleUpdateDeliveryMethod = async (pkgId: string, tipoEntrega: string, detalleEntrega?: string) => {
    try {
      await inventoryService.updateDeliveryMethod(pkgId, tipoEntrega, detalleEntrega);
      setServerPaquetes(prev => prev.map(p => p.id === pkgId ? { ...p, tipoEntrega: tipoEntrega as any, detalleEntrega } : p));
      if (onUpdatePackage) {
        const found = serverPaquetes.find(p => p.id === pkgId);
        if (found) {
          onUpdatePackage({ ...found, tipoEntrega: tipoEntrega as any, detalleEntrega });
        }
      }
      toast.success('Modalidad Actualizada', `Tipo de entrega guardado: ${tipoEntrega}`);
    } catch (err) {
      console.error('Error actualizando modalidad:', err);
      toast.error('Error', 'No se pudo actualizar la modalidad de entrega.');
    }
  };

  // Aplicar cambio de estado masivo directo (usado por modal de WRs)
  const handleBulkStatusChangeDirect = async (
    matchedIds: string[],
    targetStatusAmex: TipoEstadoAmex,
    targetStatusTib?: TipoEstadoEntrega,
    skipDelivered: boolean = true
  ) => {
    if (matchedIds.length === 0) return;
    try {
      if (targetStatusAmex === 'entregado') {
        setRecentlyDeliveredIds(prev => Array.from(new Set([...prev, ...matchedIds])));
      }
      const { updatedList, skippedList } = await inventoryService.batchStatusChange(
        matchedIds,
        paquetes,
        targetStatusAmex,
        targetStatusTib,
        skipDelivered
      );
      if (onUpdatePackage) {
        updatedList.forEach(p => onUpdatePackage(p));
      }
      setServerPaquetes(prev =>
        prev.map(p => {
          const found = updatedList.find(u => u.id === p.id);
          return found || p;
        })
      );
      soundEffects.playSuccess();
      const statusLabel =
        targetStatusAmex === 'entregado'
          ? 'Entregado'
          : targetStatusAmex === 'en_almacen'
          ? 'En Almacén'
          : targetStatusAmex === 'listo_recojo'
          ? 'Listo Recojo'
          : targetStatusAmex === 'en_ruta'
          ? 'En Ruta'
          : targetStatusAmex;

      if (skippedList.length > 0) {
        if (updatedList.length === 0) {
          toast.warning(
            'Operación protegida',
            `Los ${skippedList.length} paquetes ya figuran como ENTREGADOS y fueron protegidos.`
          );
        } else {
          toast.success(
            'Actualización parcial',
            `Se cambiaron a "${statusLabel}" ${updatedList.length} paquetes. Se protegieron ${skippedList.length} ya entregados.`
          );
        }
      } else {
        toast.success(
          'Actualización masiva completada',
          `Se cambiaron a "${statusLabel}" ${updatedList.length} paquetes con éxito.`
        );
      }

      if (targetStatusAmex === 'entregado') {
        setTimeout(() => {
          setRecentlyDeliveredIds(prev => prev.filter(id => !matchedIds.includes(id)));
        }, 2500);
      }
    } catch (err) {
      console.error('Error en cambio masivo de estado:', err);
      if (targetStatusAmex === 'entregado') {
        setRecentlyDeliveredIds(prev => prev.filter(id => !matchedIds.includes(id)));
      }
      toast.error('Error masivo', 'No se pudieron actualizar los paquetes.');
      throw err;
    }
  };

  // Cambio de estado masivo en lote (por selección en tabla)
  const handleBatchStatusChange = async (
    skipDelivered = true,
    tipoEntrega?: string,
    detalleEntrega?: string
  ) => {
    if (selectedIds.length === 0) return;
    const currentSelected = [...selectedIds];
    try {
      if (batchTargetStatusAmex === 'entregado') {
        setRecentlyDeliveredIds(prev => Array.from(new Set([...prev, ...currentSelected])));
      }
      const { updatedList, skippedList } = await inventoryService.batchStatusChange(
        selectedIds,
        paquetes,
        batchTargetStatusAmex,
        undefined,
        skipDelivered,
        tipoEntrega,
        detalleEntrega
      );
      if (onUpdatePackage) {
        updatedList.forEach(p => onUpdatePackage(p));
      }
      setServerPaquetes(prev =>
        prev.map(p => {
          const found = updatedList.find(u => u.id === p.id);
          return found || p;
        })
      );
      setSelectedIds([]);
      soundEffects.playSuccess();
      const statusLabel =
        batchTargetStatusAmex === 'entregado'
          ? 'Entregado'
          : batchTargetStatusAmex === 'en_almacen'
          ? 'En Almacén'
          : batchTargetStatusAmex === 'listo_recojo'
          ? 'Listo Recojo'
          : batchTargetStatusAmex === 'en_ruta'
          ? 'En Ruta'
          : batchTargetStatusAmex;

      if (skippedList.length > 0) {
        if (updatedList.length === 0) {
          toast.warning(
            'Operación protegida',
            `Los ${skippedList.length} paquetes ya figuran como ENTREGADOS y fueron protegidos.`
          );
        } else {
          toast.success(
            'Actualización parcial',
            `Se cambiaron a "${statusLabel}" ${updatedList.length} paquetes. Se protegieron ${skippedList.length} ya entregados.`
          );
        }
      } else {
        toast.success(
          'Actualización masiva completada',
          `Se cambiaron a "${statusLabel}" ${updatedList.length} paquetes con éxito.`
        );
      }

      if (batchTargetStatusAmex === 'entregado') {
        setTimeout(() => {
          setRecentlyDeliveredIds(prev => prev.filter(id => !currentSelected.includes(id)));
        }, 2500);
      }
    } catch (err) {
      console.error('Error actualizando estado en lote:', err);
      if (batchTargetStatusAmex === 'entregado') {
        setRecentlyDeliveredIds(prev => prev.filter(id => !currentSelected.includes(id)));
      }
      toast.error('Error masivo', 'Error al actualizar paquetes en lote.');
      throw err;
    }
  };

  // Eliminación masiva en lote con máxima seguridad y confirmación estricta
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    // Si son 3 o más paquetes (ej: toda una página o un bloque), exigir confirmación escrita estricta
    if (count >= 3) {
      const palabraClave = 'ELIMINAR';
      const input = await promptDialog({
        title: `🚨 ADVERTENCIA CRÍTICA: Eliminación Masiva (${count} paquetes)`,
        message: `Estás a punto de enviar a la papelera (Soft Delete) ${count} paquetes seleccionados.\n\nEstos paquetes dejarán de mostrarse en la vista activa de Almacén Lince.\n\nPara confirmar que NO es un error accidental, escribe la palabra "${palabraClave}" (en mayúsculas) a continuación:`,
        placeholder: 'Escribe ELIMINAR',
        confirmText: `Confirmar eliminación de ${count} paquetes`,
        cancelText: 'Cancelar y conservar paquetes',
        variant: 'danger'
      });

      if (!input || input.trim().toUpperCase() !== palabraClave) {
        if (input !== null) {
          await alertDialog({
            title: 'Operación cancelada',
            message: `No escribiste la palabra "${palabraClave}". La eliminación masiva ha sido cancelada por seguridad y ningún paquete fue modificado.`,
            variant: 'info'
          });
        }
        return;
      }
    } else {
      // Para 1 o 2 paquetes, diálogo de confirmación con enfoque seguro en Cancelar
      const confirmed = await confirmDialog({
        title: `⚠️ Confirmar Eliminación en Lote (${count} ${count === 1 ? 'paquete' : 'paquetes'})`,
        message: `¿Estás seguro de enviar los ${count} paquetes seleccionados a la papelera (Soft Delete)? Dejarán de mostrarse en la vista activa de Almacén Lince.`,
        confirmText: 'Sí, enviar a papelera',
        cancelText: 'Cancelar y conservar',
        variant: 'danger',
        safeFocusCancel: true
      });
      if (!confirmed) return;
    }

    try {
      await inventoryService.batchDelete(selectedIds);
      if (onDeletePackage) {
        selectedIds.forEach(id => onDeletePackage(id));
      }
      setServerPaquetes(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setServerTotal(prev => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
      toast.success('Eliminación masiva exitosa', `Se enviaron ${count} paquetes a la papelera (Soft Delete).`);
    } catch (err) {
      console.error('Error eliminando en lote:', err);
      toast.error('Error masivo', 'Error al procesar la eliminación en lote.');
    }
  };

  // Guardar Nueva Posición Individual
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await inventoryService.createPosition(newPositionData, sedesList);
      if (created) {
        setPosicionesList(prev => [...prev, created]);
        setIsNewPositionModalOpen(false);
      }
    } catch (err) {
      console.warn('Error creating shelf position:', err);
    }
  };

  // Crear Anaquel Completo en Lote
  const handleCreateBatchShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoEstanteClean = batchShelfData.codigoEstante.trim().toUpperCase();
    if (!codigoEstanteClean) {
      await alertDialog({
        title: 'Campo requerido',
        message: 'Por favor ingresa un código para el anaquel (ej: A3, B1).',
        variant: 'warning'
      });
      return;
    }

    try {
      const created = await inventoryService.createBatchShelf(batchShelfData, sedesList);
      if (created.length > 0) {
        setPosicionesList(prev => [...prev, ...created]);
        setIsNewPositionModalOpen(false);
        setBatchShelfData({
          almacenCodigo: 'LIN',
          codigoEstante: '',
          cantidadPisos: 3,
          capacidadPorPiso: 40,
          pesoPorPiso: 150,
          zonaTipo: 'ALMACENAJE',
          descripcion: ''
        });
      }
    } catch (err) {
      console.error('Error creating batch shelf:', err);
    }
  };

  // Guardar Edición de Posición / Capacidad
  const handleUpdatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition) return;
    try {
      await inventoryService.updatePosition(editingPosition.id, {
        zonaTipo: editingPosition.zonaTipo,
        capacidadMaxPaquetes: editingPosition.capacidadMaxPaquetes,
        pesoMaxKg: editingPosition.pesoMaxKg,
        descripcion: editingPosition.descripcion || ''
      });
      setPosicionesList(prev =>
        prev.map(p => (p.id === editingPosition.id ? editingPosition : p))
      );
      setEditingPosition(null);
    } catch (err) {
      console.error('Error updating shelf position:', err);
    }
  };

  // Eliminar Posición de Estantería
  const handleDeletePosition = async (posId: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar posición',
      message: '¿Estás seguro de eliminar esta posición de estantería?',
      confirmText: 'Sí, eliminar',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await inventoryService.deletePosition(posId);
      setPosicionesList(prev => prev.filter(p => p.id !== posId));
    } catch (err) {
      console.warn('Error deleting shelf position:', err);
    }
  };

  // Exportar Existencias a Excel
  const handleExportExcel = () => {
    exportPaquetesToExcel(paginatedPaquetes.length > 0 ? paginatedPaquetes : paquetes, 'Inventario_AMEX_Lince');
  };

  // Exportar Bitácora de Movimientos y Custodia a Excel
  const handleExportKardexExcel = () => {
    exportKardexToExcel(filteredKardex, 'Bitacora_Movimientos_Custodia_AMEX');
  };

  return {
    // Sub-pestañas
    activeSubTab,
    setActiveSubTab,

    // Filtros & Búsqueda
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    shelfFilter,
    setShelfFilter,
    floorFilter,
    setFloorFilter,
    packageTypeFilter,
    setPackageTypeFilter,
    statusFilter,
    setStatusFilter,
    statusAmexFilter,
    setStatusAmexFilter,
    deliveryTypeFilter,
    setDeliveryTypeFilter,
    amexStatusCounts,
    dateFilter,
    setDateFilter,
    resetDateFilter,

    // Paginación
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    filteredPaquetes,
    paginatedPaquetes,

    // Server-Side Search & Métricas Agregadas
    serverTotal,
    serverExistenciasActivas,
    serverPesoTotalKg,
    isLoadingServer,
    fetchServerPaquetes,

    // Kardex
    kardexList,
    filteredKardex,
    kardexSearch,
    setKardexSearch,
    kardexTypeFilter,
    setKardexTypeFilter,
    isLoadingKardex,
    fetchData,

    // Estanterías & Posiciones
    posicionesList,
    sedesList,
    shelfGroups,

    // Filtros Mapa Anaqueles
    shelfSearchTerm,
    setShelfSearchTerm,
    shelfZoneFilter,
    setShelfZoneFilter,
    shelfOccupancyFilter,
    setShelfOccupancyFilter,

    // Selección múltiple
    selectedIds,
    setSelectedIds,
    handleSelectAll,
    handleToggleSelect,

    // Modales & Formularios
    isTransferModalOpen,
    setIsTransferModalOpen,
    openTransferModal,
    transferData,
    setTransferData,
    handleExecuteTransfer,

    isEditModalOpen,
    setIsEditModalOpen,
    openEditModal,
    editFormData,
    setEditFormData,
    handleSaveEdit,

    isBatchStatusModalOpen,
    setIsBatchStatusModalOpen,
    isBulkWrModalOpen,
    setIsBulkWrModalOpen,
    batchTargetStatus,
    setBatchTargetStatus,
    batchTargetStatusAmex,
    setBatchTargetStatusAmex,
    handleBatchStatusChange,
    handleBulkStatusChangeDirect,
    handleBatchDelete,

    isNewPositionModalOpen,
    setIsNewPositionModalOpen,
    newPositionMode,
    setNewPositionMode,
    batchShelfData,
    setBatchShelfData,
    newPositionData,
    setNewPositionData,
    handleCreatePosition,
    handleCreateBatchShelf,

    editingPosition,
    setEditingPosition,
    handleUpdatePosition,
    handleDeletePosition,

    isGestorModalOpen,
    setIsGestorModalOpen,
    isMatrizModalOpen,
    setIsMatrizModalOpen,
    isKardexModalOpen,
    setIsKardexModalOpen,

    selectedThermalPkg,
    setSelectedThermalPkg,
    selectedPackageForAction,

    // Estados de transición fluida
    deliveringIds,
    recentlyDeliveredIds,

    // Acciones de paquetes
    handleDeletePackage,
    handleQuickDeliver,
    handleUpdateDeliveryMethod,
    handleQuickStatusChange,
    handleQuickStatusAmexChange,
    handleExportExcel,
    handleExportKardexExcel
  };
}
