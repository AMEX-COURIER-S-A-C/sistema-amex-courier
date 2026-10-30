import { supabase } from '@/lib/supabase/client';
import {
  Paquete,
  TipoUbicacion,
  TipoEstadoTib,
  TipoEstadoEntrega,
  TipoEstadoAmex,
  EstanteriaPosicion,
  MovimientoKardex,
  AlmacenSede
} from '@/types';
import { BatchShelfData, SinglePositionData, TransferFormData } from '../types';
import { parseWarehouseLocation } from '@/lib/validations/locations';

export interface BatchStatusChangeResult {
  updatedList: Paquete[];
  skippedList: Paquete[];
}

export const inventoryService = {
  // Sedes
  async getSedes(): Promise<AlmacenSede[]> {
    const { data } = await supabase
      .from('almacenes_sedes')
      .select('*')
      .order('nombre', { ascending: true });

    if (!data) return [];
    return data.map(s => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      tipo: s.tipo || 'ALMACEN',
      direccion: s.direccion || '',
      ciudad: s.ciudad || '',
      pais: s.pais || '',
      esActivo: s.es_activo ?? true,
      creadoEn: s.creado_en || ''
    }));
  },

  // Posiciones de estantería
  async getPosiciones(): Promise<EstanteriaPosicion[]> {
    const { data } = await supabase
      .from('estanterias_posiciones')
      .select('*')
      .order('codigo_posicion', { ascending: true });

    if (!data) return [];
    return data.map(p => ({
      id: p.id,
      almacenId: p.almacen_id || '',
      codigoEstante: p.codigo_estante,
      nivelPiso: p.nivel_piso,
      codigoPosicion: p.codigo_posicion,
      zonaTipo: p.zona_tipo || 'ALMACENAJE',
      capacidadMaxPaquetes: p.capacidad_max_paquetes || 40,
      pesoMaxKg: Number(p.peso_max_kg || 150),
      descripcion: p.descripcion || '',
      creadoEn: p.creado_en || ''
    }));
  },

  // Movimientos Kardex
  async getKardex(limit = 200): Promise<MovimientoKardex[]> {
    const { data } = await supabase
      .from('movimientos_kardex')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (!data) return [];
    return data.map(k => ({
      id: k.id,
      paqueteId: k.paquete_id || undefined,
      codigoPaquete: k.codigo_paquete,
      consignatario: k.consignatario || '',
      origenDescripcion: k.origen_descripcion,
      destinoDescripcion: k.destino_descripcion,
      tipoMovimiento: k.tipo_movimiento,
      motivo: k.motivo || '',
      usuarioOperador: k.usuario_operador || 'Operador AMEX',
      creadoEn: k.creado_en || new Date().toISOString()
    }));
  },

  // Traslado / Reubicación de paquetes
  async executeTransfer(
    idsToMove: string[],
    transferData: TransferFormData,
    paquetesList: Paquete[]
  ): Promise<{ updatedPackages: Paquete[] }> {
    const rawPos =
      transferData.targetAnaquel === 'DSP-Z1' ||
      transferData.targetAnaquel === 'DSP-Z2' ||
      transferData.targetAnaquel === 'OFI' ||
      transferData.targetAnaquel === 'TRANSITO' ||
      transferData.targetAnaquel === 'DSP' ||
      transferData.targetAnaquel?.includes('DESPACHO')
        ? transferData.targetAnaquel
        : `${transferData.targetAnaquel}-${transferData.targetPiso || 'P1'}`;

    const parsed = parseWarehouseLocation(rawPos);
    const targetAnaquel = parsed.anaquel;
    const targetPiso = parsed.piso;
    const targetPos = parsed.posicionEstante;

    const nowTransfer = new Date().toISOString();
    await supabase
      .from('paquetes')
      .update({
        ubicacion_actual: transferData.targetUbicacion,
        anaquel: targetAnaquel,
        piso: targetPiso,
        posicion_estante: targetPos,
        actualizado_en: nowTransfer
      })
      .in('id', idsToMove);

    const kardexInserts = [];
    const updatedPackages: Paquete[] = [];

    for (const id of idsToMove) {
      const pkg = paquetesList.find(p => p.id === id);
      if (pkg) {
        const origenStr = `${pkg.ubicacionActual} (${pkg.posicionEstante || 'OFI'})`;
        const destinoStr = `${transferData.targetUbicacion} (${targetPos})`;

        kardexInserts.push({
          paquete_id: pkg.id,
          codigo_paquete: pkg.numeroReciboBodega,
          consignatario: pkg.nombreConsignatario || 'Cliente AMEX',
          origen_descripcion: origenStr,
          destino_descripcion: destinoStr,
          tipo_movimiento: 'REUBICACION',
          motivo: transferData.motivo,
          usuario_operador: transferData.operador
        });

        updatedPackages.push({
          ...pkg,
          ubicacionActual: transferData.targetUbicacion,
          anaquel: targetAnaquel,
          piso: targetPiso || undefined,
          posicionEstante: targetPos,
          actualizadoEn: nowTransfer
        });
      }
    }

    if (kardexInserts.length > 0) {
      await supabase.from('movimientos_kardex').insert(kardexInserts);
    }

    return { updatedPackages };
  },

  // Guardar edición de paquete
  async updatePackage(updated: Paquete): Promise<void> {
    const nowIso = new Date().toISOString();
    await supabase
      .from('paquetes')
      .update({
        numero_recibo_bodega: updated.numeroReciboBodega,
        tracking: updated.tracking || '',
        tipo_empaque: updated.tipoEmpaque,
        nombre_consignatario: updated.nombreConsignatario,
        descripcion: updated.descripcion,
        peso_kg: updated.pesoKg,
        ubicacion_actual: updated.ubicacionActual,
        anaquel: updated.anaquel,
        piso: updated.piso,
        posicion_estante: updated.posicionEstante,
        estado_tib: updated.estadoTib || updated.estadoEntrega || 'EnAlmacen',
        estado_amex: updated.estadoAmex === 'recibido' ? 'en_almacen' : (updated.estadoAmex || 'en_almacen'),
        tipo_entrega: updated.tipoEntrega || null,
        detalle_entrega: updated.detalleEntrega || null,
        actualizado_en: nowIso
      })
      .eq('id', updated.id);
  },

  // Eliminar paquete individual con Soft Delete y Auditoría
  async deletePackage(id: string, motivo: string = 'Eliminación manual desde Almacén Lince'): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const now = new Date().toISOString();

    await supabase
      .from('paquetes')
      .update({
        eliminado_en: now,
        eliminado_por: userId,
        motivo_eliminacion: motivo
      })
      .eq('id', id);

    await supabase.from('auditoria_sistema').insert({
      usuario_id: userId,
      usuario_nombre: authData?.user?.user_metadata?.nombre_completo || 'Operador Logístico AMEX',
      usuario_email: authData?.user?.email || 'sistemaamexcourier@gmail.com',
      modulo: 'INVENTARIO',
      accion: 'ELIMINAR_SOFT',
      registro_id: id,
      detalles: `Eliminación lógica de paquete individual. Motivo: ${motivo}`,
      valores_anteriores: { id, eliminado: false },
      valores_nuevos: { id, eliminado_en: now, motivo_eliminacion: motivo }
    });
  },

  // Cambio rápido de estado individual TIB
  async quickStatusChange(pkg: Paquete, newStatus: TipoEstadoEntrega): Promise<void> {
    const nowIso = new Date().toISOString();
    await supabase.from('paquetes').update({ estado_tib: newStatus, actualizado_en: nowIso }).eq('id', pkg.id);

    await supabase.from('movimientos_kardex').insert({
      paquete_id: pkg.id,
      codigo_paquete: pkg.numeroReciboBodega,
      consignatario: pkg.nombreConsignatario || 'Cliente AMEX',
      origen_descripcion: `AmexLince (${pkg.posicionEstante || 'REC'})`,
      destino_descripcion: `Estado TIB actualizado a: ${newStatus}`,
      tipo_movimiento: newStatus === 'Entregado' ? 'ENTREGA' : 'ESTADO_CAMBIO',
      motivo: 'Ajuste operativo desde Almacén Central Lince',
      usuario_operador: 'Operador Logístico AMEX'
    });
  },

  // Cambio rápido de estado operativo individual AMEX
  async quickStatusAmexChange(pkg: Paquete, newStatusAmex: TipoEstadoAmex): Promise<void> {
    const nowIso = new Date().toISOString();
    await supabase.from('paquetes').update({ estado_amex: newStatusAmex, actualizado_en: nowIso }).eq('id', pkg.id);

    await supabase.from('movimientos_kardex').insert({
      paquete_id: pkg.id,
      codigo_paquete: pkg.numeroReciboBodega,
      consignatario: pkg.nombreConsignatario || 'Cliente AMEX',
      origen_descripcion: `AmexLince (${pkg.posicionEstante || 'REC'})`,
      destino_descripcion: `Estado AMEX actualizado a: ${newStatusAmex}`,
      tipo_movimiento: newStatusAmex === 'entregado' ? 'ENTREGA' : 'ESTADO_CAMBIO',
      motivo: 'Ajuste de ciclo interno AMEX desde Almacén Central Lince',
      usuario_operador: 'Operador Logístico AMEX'
    });
  },

  // Entrega con modalidad obligatoria (Presencial, Agencia, Domicilio, Motorizado)
  async quickDeliver(
    pkg: Paquete,
    tipoEntrega: string = 'Presencial',
    detalleEntrega?: string,
    usuarioOperador?: string
  ): Promise<Paquete> {
    const nowIso = new Date().toISOString();
    
    let detalleKardex = tipoEntrega;
    if (tipoEntrega === 'Agencia') {
      detalleKardex = `Agencia ${detalleEntrega || 'Shalom'}`;
    } else if (tipoEntrega === 'Motorizado') {
      detalleKardex = `Motorizado Cliente ${detalleEntrega ? `(${detalleEntrega})` : ''}`.trim();
    } else if (tipoEntrega === 'Domicilio') {
      detalleKardex = 'A Domicilio (Carro AMEX)';
    } else if (tipoEntrega === 'Presencial') {
      detalleKardex = 'Presencial (Mostrador Lince)';
    }

    await supabase
      .from('paquetes')
      .update({
        estado_amex: 'entregado',
        estado_tib: 'Entregado',
        ubicacion_actual: 'Entregado',
        tipo_entrega: tipoEntrega,
        detalle_entrega: detalleEntrega || null,
        actualizado_en: nowIso
      })
      .eq('id', pkg.id);

    await supabase.from('movimientos_kardex').insert({
      paquete_id: pkg.id,
      codigo_paquete: pkg.numeroReciboBodega,
      consignatario: pkg.nombreConsignatario || 'Cliente AMEX',
      origen_descripcion: `AmexLince (${pkg.posicionEstante || 'REC'})`,
      destino_descripcion: `Entregado al Cliente - Modalidad: ${detalleKardex}`,
      tipo_movimiento: 'ENTREGA',
      motivo: `Entrega completada [${detalleKardex}]`,
      usuario_operador: usuarioOperador || 'Operador Logístico AMEX'
    });

    return {
      ...pkg,
      estadoAmex: 'entregado',
      estadoTib: 'Entregado',
      estadoEntrega: 'Entregado',
      ubicacionActual: 'Entregado',
      tipoEntrega: tipoEntrega as any,
      detalleEntrega: detalleEntrega || undefined,
      actualizadoEn: nowIso
    };
  },

  // Pre-asignar o actualizar modalidad de entrega
  async updateDeliveryMethod(
    pkgId: string,
    tipoEntrega: string,
    detalleEntrega?: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    await supabase
      .from('paquetes')
      .update({
        tipo_entrega: tipoEntrega,
        detalle_entrega: detalleEntrega || null,
        actualizado_en: nowIso
      })
      .eq('id', pkgId);
  },

  // Verificación fresca contra la base de datos para detectar si otros usuarios ya entregaron paquetes
  async checkDeliveredConflict(ids: string[]): Promise<{
    deliveredIds: string[];
    deliveredPackages: { id: string; numeroReciboBodega: string; nombreConsignatario: string; actualizadoEn?: string }[];
  }> {
    if (!ids || ids.length === 0) {
      return { deliveredIds: [], deliveredPackages: [] };
    }

    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('id, numero_recibo_bodega, nombre_consignatario, estado_amex, actualizado_en')
        .in('id', ids)
        .eq('estado_amex', 'entregado');

      if (error || !data) {
        return { deliveredIds: [], deliveredPackages: [] };
      }

      const deliveredPackages = data.map((d: any) => ({
        id: d.id,
        numeroReciboBodega: d.numero_recibo_bodega || '',
        nombreConsignatario: d.nombre_consignatario || '',
        actualizadoEn: d.actualizado_en || undefined
      }));

      return {
        deliveredIds: deliveredPackages.map(d => d.id),
        deliveredPackages
      };
    } catch (err) {
      console.warn('Error checking delivered conflict in Supabase:', err);
      return { deliveredIds: [], deliveredPackages: [] };
    }
  },

  // Cambio de estado masivo en lote con protección anti-chancado de entregados
  async batchStatusChange(
    selectedIds: string[],
    arg2: Paquete[] | TipoEstadoEntrega,
    arg3: TipoEstadoAmex | Paquete[],
    arg4?: TipoEstadoAmex | TipoEstadoEntrega,
    skipDelivered: boolean = true,
    tipoEntrega?: string,
    detalleEntrega?: string
  ): Promise<BatchStatusChangeResult> {
    let paquetesList: Paquete[] = [];
    let targetStatusAmex: TipoEstadoAmex = 'en_almacen';
    let targetStatusTib: TipoEstadoEntrega | undefined = undefined;

    if (Array.isArray(arg2)) {
      // Firma: batchStatusChange(selectedIds, paquetesList, targetStatusAmex, targetStatusTib?, skipDelivered?)
      paquetesList = arg2;
      const rawAmex = (arg3 as TipoEstadoAmex) || 'en_almacen';
      targetStatusAmex = rawAmex === 'recibido' ? 'en_almacen' : rawAmex;
      targetStatusTib = arg4 as TipoEstadoEntrega | undefined;
    } else {
      // Firma previa: batchStatusChange(selectedIds, targetStatusTib, paquetesList, targetStatusAmex?, skipDelivered?)
      targetStatusTib = arg2 as TipoEstadoEntrega | undefined;
      paquetesList = (arg3 as Paquete[]) || [];
      const rawAmex = (arg4 as TipoEstadoAmex) || 'en_almacen';
      targetStatusAmex = rawAmex === 'recibido' ? 'en_almacen' : rawAmex;
    }

    // Si el estado destino NO es 'entregado' y se solicitó proteger entregados:
    let idsToUpdate = [...selectedIds];
    const skippedList: Paquete[] = [];

    if (targetStatusAmex !== 'entregado' && skipDelivered) {
      // 1. Filtrar los que en memoria ya son 'entregado'
      const memoryDeliveredIds = new Set(
        paquetesList.filter(p => p.estadoAmex === 'entregado').map(p => p.id)
      );

      // 2. Consultar en BD fresca si algún paquete fue marcado como entregado concurrentemente
      const conflictCheck = await this.checkDeliveredConflict(selectedIds);
      const dbDeliveredIds = new Set(conflictCheck.deliveredIds);

      const allDeliveredIds = new Set([...memoryDeliveredIds, ...dbDeliveredIds]);

      idsToUpdate = selectedIds.filter(id => !allDeliveredIds.has(id));

      for (const id of allDeliveredIds) {
        if (selectedIds.includes(id)) {
          const pkg = paquetesList.find(p => p.id === id) || {
            id,
            numeroReciboBodega: conflictCheck.deliveredPackages.find(d => d.id === id)?.numeroReciboBodega || '',
            nombreConsignatario: conflictCheck.deliveredPackages.find(d => d.id === id)?.nombreConsignatario || '',
            estadoAmex: 'entregado'
          } as Paquete;
          skippedList.push(pkg);
        }
      }

      // 🛡️ Alerta de Seguridad: Escudo Anti-Chancado
      if (skippedList.length > 0 && typeof window !== 'undefined') {
        try {
          fetch('/api/admin/alertas-seguridad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'anti_chancado_entregado',
              detalles: {
                totalPaquetes: skippedList.length,
                accion: `Intento de cambio masivo a estado '${targetStatusAmex}' bloqueado por escudo anti-chancado`,
                paquetes: skippedList.map(p => ({
                  wr: p.numeroReciboBodega,
                  consignatario: p.nombreConsignatario,
                  estadoPrevio: 'ENTREGADO',
                  estadoIntentado: targetStatusAmex.toUpperCase(),
                })),
              },
            }),
          }).catch(() => {});
        } catch {}
      }
    }

    if (idsToUpdate.length === 0) {
      return { updatedList: [], skippedList };
    }

    // 🌙 Alerta de Seguridad: Movimiento Masivo Fuera del Horario Laboral (antes de 7am o después de 9pm)
    if (typeof window !== 'undefined' && idsToUpdate.length >= 5) {
      try {
        const currentHourLima = parseInt(
          new Intl.DateTimeFormat('es-PE', {
            timeZone: 'America/Lima',
            hour: 'numeric',
            hour12: false,
          }).format(new Date()),
          10
        );
        const isOffHours = currentHourLima < 7 || currentHourLima >= 21;
        if (isOffHours) {
          fetch('/api/admin/alertas-seguridad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'movimiento_fuera_horario',
              detalles: {
                totalPaquetes: idsToUpdate.length,
                accion: `Movimiento masivo de ${idsToUpdate.length} paquetes a estado '${targetStatusAmex}' ejecutado en horario nocturno (${currentHourLima}:00 hrs Lima)`,
              },
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    const nowIso = new Date().toISOString();
    // Por requerimiento: el cambio masivo actualiza estado_amex y datos de entrega si aplica
    const updatePayload: Record<string, any> = {
      estado_amex: targetStatusAmex,
      actualizado_en: nowIso
    };
    if (targetStatusAmex === 'entregado') {
      updatePayload.tipo_entrega = tipoEntrega || 'Presencial';
      updatePayload.detalle_entrega = detalleEntrega || null;
      updatePayload.ubicacion_actual = 'Entregado';
      updatePayload.estado_tib = 'Entregado';
    }
    if (targetStatusTib) {
      updatePayload.estado_tib = targetStatusTib;
    }

    await supabase.from('paquetes').update(updatePayload).in('id', idsToUpdate);

    const updatedList: Paquete[] = [];
    const kardexInserts = [];

    for (const id of idsToUpdate) {
      const pkg = paquetesList.find(p => p.id === id);
      if (pkg) {
        const updated: Paquete = {
          ...pkg,
          estadoAmex: targetStatusAmex,
          actualizadoEn: nowIso,
          ...(targetStatusAmex === 'entregado'
            ? {
                tipoEntrega: (tipoEntrega || 'Presencial') as any,
                detalleEntrega: detalleEntrega || undefined,
                ubicacionActual: 'Entregado',
                estadoTib: 'Entregado',
                estadoEntrega: 'Entregado'
              }
            : {}),
          ...(targetStatusTib ? { estadoTib: targetStatusTib, estadoEntrega: targetStatusTib } : {})
        };
        updatedList.push(updated);

        let detalleKardex = tipoEntrega || 'Presencial';
        if (tipoEntrega === 'Agencia') {
          detalleKardex = `Agencia ${detalleEntrega || 'Shalom'}`;
        } else if (tipoEntrega === 'Motorizado') {
          detalleKardex = `Motorizado Cliente ${detalleEntrega ? `(${detalleEntrega})` : ''}`.trim();
        } else if (tipoEntrega === 'Domicilio') {
          detalleKardex = 'A Domicilio (Carro AMEX)';
        } else if (tipoEntrega === 'Presencial') {
          detalleKardex = 'Presencial (Mostrador Lince)';
        }

        kardexInserts.push({
          paquete_id: pkg.id,
          codigo_paquete: pkg.numeroReciboBodega,
          consignatario: pkg.nombreConsignatario || 'Cliente AMEX',
          origen_descripcion: `AmexLince (${pkg.posicionEstante || 'REC'})`,
          destino_descripcion: targetStatusAmex === 'entregado'
            ? `Entregado al Cliente - Modalidad: ${detalleKardex}`
            : `Estado AMEX masivo: ${targetStatusAmex}`,
          tipo_movimiento: targetStatusAmex === 'entregado' ? 'ENTREGA' : 'ESTADO_CAMBIO',
          motivo: targetStatusAmex === 'entregado'
            ? `Entrega masiva [${detalleKardex}]`
            : 'Cambio masivo de estado AMEX desde Almacén Lince',
          usuario_operador: 'Operador Logístico AMEX'
        });
      }
    }

    if (kardexInserts.length > 0) {
      await supabase.from('movimientos_kardex').insert(kardexInserts);
    }

    return { updatedList, skippedList };
  },

  // Eliminación masiva en lote con Soft Delete y Auditoría
  async batchDelete(selectedIds: string[], motivo: string = 'Eliminado desde vista Inventario'): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const now = new Date().toISOString();

    await supabase
      .from('paquetes')
      .update({
        eliminado_en: now,
        eliminado_por: userId,
        motivo_eliminacion: motivo
      })
      .in('id', selectedIds);

    // Registro inmutable de auditoría
    for (const id of selectedIds) {
      await supabase.from('auditoria_sistema').insert({
        usuario_id: userId,
        usuario_nombre: authData?.user?.user_metadata?.nombre_completo || 'Operador Logístico AMEX',
      usuario_email: authData?.user?.email || 'sistemaamexcourier@gmail.com',
        modulo: 'INVENTARIO',
        accion: 'ELIMINAR_SOFT',
        registro_id: id,
        detalles: `Eliminación lógica de paquete. Motivo: ${motivo}`,
        valores_anteriores: { id, eliminado: false },
        valores_nuevos: { id, eliminado_en: now, motivo_eliminacion: motivo }
      });
    }
  },

  // Crear posición individual
  async createPosition(
    positionData: SinglePositionData,
    sedesList: AlmacenSede[]
  ): Promise<EstanteriaPosicion | null> {
    const sede = sedesList.find(s => s.codigo === positionData.almacenCodigo);
    const almacenId = sede ? sede.id : null;
    const codigoPos = `${positionData.codigoEstante}-${positionData.nivelPiso}`;

    const { data, error } = await supabase
      .from('estanterias_posiciones')
      .insert({
        almacen_id: almacenId,
        codigo_estante: positionData.codigoEstante.toUpperCase(),
        nivel_piso: positionData.nivelPiso.toUpperCase(),
        codigo_posicion: codigoPos.toUpperCase(),
        zona_tipo: positionData.zonaTipo,
        capacidad_max_paquetes: Number(positionData.capacidadMaxPaquetes),
        peso_max_kg: Number(positionData.pesoMaxKg),
        descripcion: positionData.descripcion
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      almacenId: data.almacen_id || '',
      codigoEstante: data.codigo_estante,
      nivelPiso: data.nivel_piso,
      codigoPosicion: data.codigo_posicion,
      zonaTipo: data.zona_tipo || 'ALMACENAJE',
      capacidadMaxPaquetes: data.capacidad_max_paquetes || 40,
      pesoMaxKg: Number(data.peso_max_kg || 150),
      descripcion: data.descripcion || '',
      creadoEn: data.creado_en || ''
    };
  },

  // Crear anaquel completo en lote (N pisos)
  async createBatchShelf(
    batchData: BatchShelfData,
    sedesList: AlmacenSede[]
  ): Promise<EstanteriaPosicion[]> {
    const codigoEstanteClean = batchData.codigoEstante.trim().toUpperCase();
    const sede = sedesList.find(s => s.codigo === batchData.almacenCodigo);
    const almacenId = sede ? sede.id : null;

    const newPositionsToInsert = [];
    for (let i = 1; i <= batchData.cantidadPisos; i++) {
      const nivelPiso = `P${i}`;
      const codigoPosicion = `${codigoEstanteClean}-${nivelPiso}`;
      newPositionsToInsert.push({
        almacen_id: almacenId,
        codigo_estante: codigoEstanteClean,
        nivel_piso: nivelPiso,
        codigo_posicion: codigoPosicion,
        zona_tipo: batchData.zonaTipo,
        capacidad_max_paquetes: Number(batchData.capacidadPorPiso),
        peso_max_kg: Number(batchData.pesoPorPiso),
        descripcion: batchData.descripcion || `Anaquel ${codigoEstanteClean} - Piso ${i}`
      });
    }

    const { data, error } = await supabase
      .from('estanterias_posiciones')
      .insert(newPositionsToInsert)
      .select();

    if (error || !data) return [];
    return data.map(p => ({
      id: p.id,
      almacenId: p.almacen_id || '',
      codigoEstante: p.codigo_estante,
      nivelPiso: p.nivel_piso,
      codigoPosicion: p.codigo_posicion,
      zonaTipo: p.zona_tipo || 'ALMACENAJE',
      capacidadMaxPaquetes: p.capacidad_max_paquetes || 40,
      pesoMaxKg: Number(p.peso_max_kg || 150),
      descripcion: p.descripcion || '',
      creadoEn: p.creado_en || ''
    }));
  },

  // Actualizar posición
  async updatePosition(
    id: string,
    updatedData: {
      zonaTipo: string;
      capacidadMaxPaquetes: number;
      pesoMaxKg: number;
      descripcion?: string;
    }
  ): Promise<void> {
    await supabase
      .from('estanterias_posiciones')
      .update({
        zona_tipo: updatedData.zonaTipo,
        capacidad_max_paquetes: updatedData.capacidadMaxPaquetes,
        peso_max_kg: updatedData.pesoMaxKg,
        descripcion: updatedData.descripcion
      })
      .eq('id', id);
  },

  // Eliminar posición
  async deletePosition(id: string): Promise<void> {
    await supabase.from('estanterias_posiciones').delete().eq('id', id);
  },

  // Consulta Server-Side de Paquetes en Almacén bajo demanda (sin límites de 1,000)
  async getPaquetesEnAlmacen(): Promise<Paquete[]> {
    const CHUNK_SIZE = 1000;
    let offset = 0;
    const allRows: Record<string, unknown>[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .is('eliminado_en', null)
        .or('estado_amex.eq.en_almacen,estado_amex.eq.recibido')
        .order('creado_en', { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) {
        console.error('Error fetching paquetes en almacén:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }
    return allRows.map(mapPaqueteDbRow);
  },

  // Consulta Server-Side de Paquetes Activos bajo custodia (en almacén + en ruta, no entregados)
  async getPaquetesActivos(): Promise<Paquete[]> {
    const CHUNK_SIZE = 1000;
    let offset = 0;
    const allRows: Record<string, unknown>[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .is('eliminado_en', null)
        .neq('estado_amex', 'entregado')
        .neq('ubicacion_actual', 'Entregado')
        .order('creado_en', { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) {
        console.error('Error fetching paquetes activos:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }
    return allRows.map(mapPaqueteDbRow);
  },

  // Consulta Server-Side de Paquetes filtrados por estado AMEX exacto
  async getPaquetesByEstado(estadoAmex: string): Promise<Paquete[]> {
    const CHUNK_SIZE = 1000;
    let offset = 0;
    const allRows: Record<string, unknown>[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .is('eliminado_en', null)
        .eq('estado_amex', estadoAmex)
        .order('creado_en', { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) {
        console.error(`Error fetching paquetes con estado ${estadoAmex}:`, error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }
    return allRows.map(mapPaqueteDbRow);
  },

  // Consulta Server-Side de Todo el Inventario (paginado en lotes hasta el 100%)
  async getAllPaquetes(): Promise<Paquete[]> {
    const CHUNK_SIZE = 1000;
    let offset = 0;
    const allRows: Record<string, unknown>[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .is('eliminado_en', null)
        .order('creado_en', { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) {
        console.error('Error fetching all paquetes:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }
    return allRows.map(mapPaqueteDbRow);
  },

  // Búsqueda y Paginación Server-Side (RPC en PostgreSQL)
  async searchPaquetesServerSide(
    params: SearchPaquetesServerSideParams = {}
  ): Promise<SearchPaquetesServerSideResult> {
    const { data, error } = await supabase.rpc('buscar_paquetes_servidor', {
      p_search: params.searchTerm?.trim() || '',
      p_ubicacion: params.locationFilter || 'ALL',
      p_estado_amex: params.statusAmexFilter || 'ALL',
      p_shelf_filter: params.shelfFilter || 'ALL',
      p_floor_filter: params.floorFilter || 'ALL',
      p_package_type: params.packageTypeFilter || 'ALL',
      p_fecha_desde: params.fechaDesde || null,
      p_fecha_hasta: params.fechaHasta || null,
      p_page: params.page || 1,
      p_page_size: params.pageSize || 50,
      p_tipo_entrega: params.deliveryTypeFilter || 'ALL'
    });

    if (error || !data) {
      console.error('Error en búsqueda server-side:', error);
      return {
        paquetes: [],
        total: 0,
        existenciasActivas: 0,
        pesoTotalKg: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 50
      };
    }

    const rawData = data as Record<string, unknown>;
    const paquetesList = Array.isArray(rawData.data)
      ? (rawData.data as Record<string, unknown>[]).map(mapPaqueteDbRow)
      : [];

    return {
      paquetes: paquetesList,
      total: Number(rawData.total || 0),
      existenciasActivas: Number(rawData.existencias_activas || 0),
      pesoTotalKg: Number(rawData.peso_total_kg || 0),
      page: Number(rawData.page || 1),
      pageSize: Number(rawData.page_size || 50)
    };
  }
};

export interface SearchPaquetesServerSideParams {
  searchTerm?: string;
  locationFilter?: string;
  statusAmexFilter?: string;
  shelfFilter?: string;
  floorFilter?: string;
  packageTypeFilter?: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  page?: number;
  pageSize?: number;
  deliveryTypeFilter?: string;
}

export interface SearchPaquetesServerSideResult {
  paquetes: Paquete[];
  total: number;
  existenciasActivas: number;
  pesoTotalKg: number;
  page: number;
  pageSize: number;
}

function mapPaqueteDbRow(row: Record<string, unknown>): Paquete {
  const rawPos = String(
    row.posicion_estante ||
      (row.anaquel && row.piso ? `${row.anaquel}-${row.piso}` : (row.anaquel || 'OFI'))
  );
  const parsed = parseWarehouseLocation(rawPos);
  const anaquel = String(row.anaquel || parsed.anaquel);
  const piso = String(row.piso ?? (parsed.piso || ''));
  const posicion = parsed.posicionEstante;

  return {
    id: String(row.id),
    numeroReciboBodega: String(row.numero_recibo_bodega || ''),
    tracking: String(row.tracking || ''),
    tipoEmpaque: String(row.tipo_empaque || ''),
    numeroFactura: '',
    nombreConsignatario: String(row.nombre_consignatario || ''),
    descripcion: String(row.descripcion || ''),
    pesoKg: row.peso_kg !== null && row.peso_kg !== undefined ? Number(row.peso_kg) : 0,
    ubicacionActual: (row.ubicacion_actual as TipoUbicacion) || 'AmexLince',
    anaquel: String(row.anaquel || anaquel),
    piso: String(row.piso || piso),
    posicionEstante: posicion,
    metodoEntrega: 'CarroAmexDomicilio',
    estadoTib: ((row.estado_tib || row.estado_entrega) as TipoEstadoTib) || 'EnAlmacen',
    estadoEntrega: ((row.estado_tib || row.estado_entrega) as TipoEstadoEntrega) || 'EnAlmacen',
    estadoAmex: (row.estado_amex === 'recibido' ? 'en_almacen' : ((row.estado_amex as TipoEstadoAmex) || 'en_almacen')),
    facturaPdfUrl: '',
    tibImagenUrl: row.tib_imagen_url ? String(row.tib_imagen_url) : undefined,
    tibTicketPdfUrl: row.tib_ticket_pdf_url ? String(row.tib_ticket_pdf_url) : undefined,
    tipoEntrega: (row.tipo_entrega as any) || (row.estado_amex === 'entregado' ? 'Presencial' : undefined),
    detalleEntrega: row.detalle_entrega ? String(row.detalle_entrega) : undefined,
    usuarioEmail: String(row.usuario_email || ''),
    creadoPor: row.creado_por ? String(row.creado_por) : undefined,
    creadoEn: String(row.creado_en || ''),
    actualizadoEn: String(row.actualizado_en || row.creado_en || '')
  };
}
