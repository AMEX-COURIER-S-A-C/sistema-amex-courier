import { supabase } from '@/lib/supabase/client';
import {
  HojaCotejo,
  ItemCotejo,
  TipoProcesoCotejo,
  TipoEstadoItemCotejo
} from '@/types';
import type { NewSheetItemRow, SheetTemplateMode } from '../types';

export interface SheetExtendedMeta {
  __amexMetaV1: true;
  desc?: string;
  templateMode?: SheetTemplateMode;
  extraCells?: Record<string, string>;
  colWidths?: Record<string, number>;
}

export function resolveSheetTemplateMode(
  tipoProceso?: TipoProcesoCotejo | string | null,
  metaMode?: SheetTemplateMode | null
): SheetTemplateMode {
  if (metaMode === 'BLANK' || metaMode === 'COTEJO' || metaMode === 'WR_LOOKUP') {
    return metaMode;
  }
  if (tipoProceso === 'OTRO') return 'BLANK';
  if (tipoProceso === 'AUDITORIA' || tipoProceso === 'INVENTARIO_ANAQUEL') return 'WR_LOOKUP';
  return 'COTEJO';
}

export function parseSheetMeta(
  rawDescripcion: string | null | undefined,
  tipoProceso?: TipoProcesoCotejo | string | null
): {
  description: string;
  templateMode: SheetTemplateMode;
  extraCells: Record<string, string>;
  colWidths: Record<string, number>;
} {
  if (!rawDescripcion) {
    return {
      description: '',
      templateMode: resolveSheetTemplateMode(tipoProceso),
      extraCells: {},
      colWidths: {}
    };
  }
  const trimmed = rawDescripcion.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"__amexMetaV1"')) {
    try {
      const parsed = JSON.parse(trimmed) as SheetExtendedMeta;
      return {
        description: parsed.desc || 'Cotejo y pistoleo en tiempo real de bultos recibidos',
        templateMode: resolveSheetTemplateMode(tipoProceso, parsed.templateMode),
        extraCells: parsed.extraCells || {},
        colWidths: parsed.colWidths || {}
      };
    } catch {
      // Fallback a texto plano
    }
  }
  return {
    description: rawDescripcion,
    templateMode: resolveSheetTemplateMode(tipoProceso),
    extraCells: {},
    colWidths: {}
  };
}

export function serializeSheetMeta(
  description: string,
  extraCells: Record<string, string>,
  colWidths?: Record<string, number>,
  templateMode?: SheetTemplateMode
): string {
  const cleanExtra: Record<string, string> = {};
  Object.entries(extraCells || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      cleanExtra[k] = String(v);
    }
  });

  const hasExtra = Object.keys(cleanExtra).length > 0;
  const hasWidths = colWidths && Object.keys(colWidths).length > 0;

  if (!hasExtra && !hasWidths && !templateMode) {
    return description || 'Cotejo y pistoleo en tiempo real de bultos recibidos';
  }

  const payload: SheetExtendedMeta = {
    __amexMetaV1: true,
    desc: description || 'Cotejo y pistoleo en tiempo real de bultos recibidos',
    ...(templateMode ? { templateMode } : {}),
    extraCells: cleanExtra,
    ...(hasWidths ? { colWidths } : {})
  };
  return JSON.stringify(payload);
}

export const sheetsService = {
  async fetchHojas(): Promise<HojaCotejo[]> {
    const { data, error } = await supabase
      .from('hojas_cotejo')
      .select('*')
      .order('actualizado_en', { ascending: false });

    if (error) {
      console.error('Error fetching hojas_cotejo:', error);
      throw error;
    }

    if (!data) return [];

    return data.map(h => {
      const parsedMeta = parseSheetMeta(h.descripcion, h.tipo_proceso);
      return {
        id: h.id,
        libroId: h.libro_id || null,
        nombreHoja: h.nombre_hoja || (h.libro_id ? h.titulo : 'Hoja 1'),
        titulo: h.titulo,
        descripcion: parsedMeta.description,
        rawDescripcion: h.descripcion || '',
        templateMode: parsedMeta.templateMode,
        extraCells: parsedMeta.extraCells,
        colWidths: parsedMeta.colWidths,
        tipoProceso: (h.tipo_proceso as TipoProcesoCotejo) || 'RECEPCION_LINCE',
        estado: h.estado || 'ACTIVA',
        sedeId: h.sede_id,
        creadoPor: h.creado_por || 'AMEX',
        creadoEn: h.creado_en,
        actualizadoEn: h.actualizado_en
      } as HojaCotejo & {
        rawDescripcion?: string;
        templateMode?: SheetTemplateMode;
        extraCells?: Record<string, string>;
        colWidths?: Record<string, number>;
      };
    });
  },

  async saveSheetExtraMeta(
    hojaId: string,
    description: string,
    extraCells: Record<string, string>,
    colWidths?: Record<string, number>,
    templateMode?: SheetTemplateMode
  ): Promise<void> {
    if (!hojaId) return;
    const serialized = serializeSheetMeta(description, extraCells, colWidths, templateMode);
    const { error } = await supabase
      .from('hojas_cotejo')
      .update({
        descripcion: serialized,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', hojaId);
    if (error) {
      console.error('[sheetsService] Error guardando metadatos de celdas extra:', error);
    }
  },

  async fetchItems(hojaId: string): Promise<ItemCotejo[]> {
    if (!hojaId || typeof hojaId !== 'string') return [];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hojaId.trim());
    if (!isUuid) {
      console.warn('[sheetsService] fetchItems llamado con ID no-UUID:', hojaId);
      return [];
    }

    const { data, error } = await supabase
      .from('hojas_cotejo_items')
      .select('*')
      .eq('hoja_id', hojaId.trim())
      .order('orden', { ascending: true });

    if (error) {
      console.error('[sheetsService] Error fetching items:', error.message || error, error.details || '', error.code || '', 'hojaId:', hojaId);
      return [];
    }

    if (!data) return [];

    return data.map(i => ({
      id: i.id,
      hojaId: i.hoja_id,
      codigoWr: i.codigo_wr || '',
      tracking: (i as any).tracking || '',
      casillero: i.casillero || '',
      consignatario: i.consignatario || '',
      pesoKg: Number(i.peso_kg || 0),
      posicionEstante: i.posicion_estante || 'REC',
      notas: i.notas || '',
      estado: (i.estado as TipoEstadoItemCotejo) || 'PENDIENTE',
      escaneadoEn: i.escaneado_en,
      escaneadoPor: i.escaneado_por,
      vecesEscaneado: i.veces_escaneado || 0,
      orden: i.orden,
      creadoEn: i.creado_en,
      actualizadoEn: i.actualizado_en
    }));
  },

  async updateSheetTitle(hojaId: string, titulo: string): Promise<void> {
    const { error } = await supabase
      .from('hojas_cotejo')
      .update({ titulo: titulo.trim(), actualizado_en: new Date().toISOString() })
      .eq('id', hojaId);
    if (error) throw error;
  },

  async updateSheetTabName(hojaId: string, nombreHoja: string): Promise<void> {
    const { error } = await supabase
      .from('hojas_cotejo')
      .update({ nombre_hoja: nombreHoja.trim(), actualizado_en: new Date().toISOString() })
      .eq('id', hojaId);
    if (error) throw error;
  },

  async createSheet(
    titulo: string,
    descripcion: string = 'Cotejo y pistoleo en tiempo real de bultos recibidos',
    tipoProceso: TipoProcesoCotejo = 'RECEPCION_LINCE',
    creadoPor: string = 'AMEX',
    libroId?: string | null,
    nombreHoja?: string | null,
    templateMode?: SheetTemplateMode
  ): Promise<(HojaCotejo & { templateMode?: SheetTemplateMode; extraCells?: Record<string, string> }) | null> {
    const defaultTabName = nombreHoja || (libroId ? titulo : 'Hoja 1');
    const resolvedMode = resolveSheetTemplateMode(tipoProceso, templateMode);
    const serializedDesc = serializeSheetMeta(descripcion, {}, undefined, resolvedMode);

    const { data, error } = await supabase
      .from('hojas_cotejo')
      .insert({
        titulo: titulo || 'AMEX WR',
        nombre_hoja: defaultTabName,
        descripcion: serializedDesc,
        tipo_proceso: tipoProceso,
        creado_por: creadoPor,
        libro_id: libroId || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sheet:', error);
      throw error;
    }

    if (!data) return null;

    const parsedMeta = parseSheetMeta(data.descripcion, data.tipo_proceso);

    return {
      id: data.id,
      libroId: data.libro_id || null,
      nombreHoja: data.nombre_hoja || defaultTabName,
      titulo: data.titulo,
      descripcion: parsedMeta.description,
      templateMode: parsedMeta.templateMode,
      extraCells: parsedMeta.extraCells,
      tipoProceso: (data.tipo_proceso as TipoProcesoCotejo) || 'RECEPCION_LINCE',
      estado: data.estado || 'ACTIVA',
      sedeId: data.sede_id,
      creadoPor: data.creado_por || 'AMEX',
      creadoEn: data.creado_en,
      actualizadoEn: data.actualizado_en
    };
  },

  async createSubSheet(
    libroId: string,
    nombreHoja: string,
    operatorName: string = 'AMEX',
    tipoProceso: TipoProcesoCotejo = 'RECEPCION_LINCE',
    templateMode?: SheetTemplateMode
  ): Promise<HojaCotejo | null> {
    return this.createSheet(
      nombreHoja,
      'Pestaña de hoja de cálculo',
      tipoProceso,
      operatorName,
      libroId,
      nombreHoja,
      templateMode
    );
  },

  async deleteSheet(hojaId: string): Promise<void> {
    await supabase.from('hojas_cotejo_items').delete().eq('hoja_id', hojaId);
    const { error } = await supabase.from('hojas_cotejo').delete().eq('id', hojaId);
    if (error) throw error;
  },

  async duplicateSheet(hojaId: string, operatorName: string, originalSheet: HojaCotejo): Promise<HojaCotejo | null> {
    const isSubSheet = !!originalSheet.libroId;
    const title = isSubSheet
      ? `${originalSheet.nombreHoja || originalSheet.titulo} (Copia)`
      : `${originalSheet.titulo} (Copia)`;
    const tabName = isSubSheet
      ? `${originalSheet.nombreHoja || originalSheet.titulo} (Copia)`
      : 'Hoja 1';

    const originalMeta = originalSheet as HojaCotejo & {
      rawDescripcion?: string;
      templateMode?: SheetTemplateMode;
      extraCells?: Record<string, string>;
    };
    const resolvedMode = resolveSheetTemplateMode(originalSheet.tipoProceso, originalMeta.templateMode);

    const newSheet = await this.createSheet(
      title,
      originalSheet.descripcion,
      originalSheet.tipoProceso,
      operatorName,
      originalSheet.libroId || null,
      tabName,
      resolvedMode
    );

    if (!newSheet) return null;

    if (originalMeta.extraCells && Object.keys(originalMeta.extraCells).length > 0) {
      await this.saveSheetExtraMeta(
        newSheet.id,
        originalSheet.descripcion || '',
        originalMeta.extraCells,
        undefined,
        resolvedMode
      );
      newSheet.extraCells = { ...originalMeta.extraCells };
    }

    const { data: originalItems } = await supabase
      .from('hojas_cotejo_items')
      .select('*')
      .eq('hoja_id', hojaId);

    if (originalItems && originalItems.length > 0) {
      const cloned = originalItems.map(it => ({
        hoja_id: newSheet.id,
        codigo_wr: it.codigo_wr,
        casillero: it.casillero,
        consignatario: it.consignatario,
        tracking: (it as any).tracking,
        peso_kg: it.peso_kg,
        posicion_estante: it.posicion_estante,
        notas: it.notas,
        estado: it.estado,
        escaneado_en: it.escaneado_en,
        escaneado_por: it.escaneado_por,
        veces_escaneado: it.veces_escaneado,
        orden: it.orden
      }));
      await supabase.from('hojas_cotejo_items').insert(cloned);
    }

    return newSheet;
  },

  async insertItems(rows: NewSheetItemRow[]): Promise<unknown[]> {
    const { data, error } = await supabase.from('hojas_cotejo_items').insert(rows).select();
    if (error) throw error;
    return data || [];
  },

  async updateItem(itemId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('hojas_cotejo_items')
      .update(patch)
      .eq('id', itemId);
    if (error) throw error;
  },

  async deleteItems(itemIds: string[]): Promise<void> {
    if (!itemIds || itemIds.length === 0) return;
    const { error } = await supabase
      .from('hojas_cotejo_items')
      .delete()
      .in('id', itemIds);
    if (error) throw error;
  },

  async resetScans(hojaId: string): Promise<void> {
    const { error } = await supabase
      .from('hojas_cotejo_items')
      .update({
        estado: 'PENDIENTE',
        tracking: null,
        notas: null,
        escaneado_en: null,
        escaneado_por: null,
        veces_escaneado: 0,
        actualizado_en: new Date().toISOString()
      })
      .eq('hoja_id', hojaId);
    if (error) throw error;
  },

  async clearScanAtRow(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('hojas_cotejo_items')
      .update({
        tracking: null,
        notas: null,
        estado: 'PENDIENTE',
        escaneado_en: null,
        escaneado_por: null,
        veces_escaneado: 0,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', itemId);
    if (error) throw error;
  },

  async syncScannedToMainPackages(scannedItems: ItemCotejo[]): Promise<number> {
    let updatedCount = 0;
    for (const item of scannedItems) {
      const codeToSync = (item.codigoWr || item.tracking || '').trim();
      if (!codeToSync) continue;
      const { error } = await supabase
        .from('paquetes')
        .update({
          ubicacion_actual: 'AmexLince',
          posicion_estante: item.posicionEstante || 'OFI',
          estado_amex: 'en_almacen'
        })
        .eq('numero_recibo_bodega', codeToSync);

      if (!error) updatedCount++;
    }
    return updatedCount;
  }
};
