import { supabase } from '@/lib/supabase/client';
import { DniSlotData } from '@/lib/dni-matrix/db';
import { DniPrintSize } from '@/lib/dni-matrix/docx-exporter';
import { z } from 'zod';

const DniSlotDataSchema = z.object({
  id: z.number(),
  anverso: z.string().nullable().optional(),
  reverso: z.string().nullable().optional(),
  label: z.string().optional(),
  dni: z.string().optional(),
  clienteId: z.string().optional(),
  paqueteId: z.string().optional(),
  anversoRotation: z.number().optional(),
  reversoRotation: z.number().optional(),
  updatedAt: z.number().optional()
});

const DniCloudSettingsSchema = z.object({
  // `medium` is a legacy persisted value; it is normalized to `standard` below.
  printSize: z.enum(['large', 'xlarge', 'standard', 'medium']).optional(),
  soundEnabled: z.boolean().optional(),
  activeSlotId: z.number().optional()
}).partial();

export interface DniCloudSettings {
  printSize?: DniPrintSize;
  soundEnabled?: boolean;
  activeSlotId?: number;
}

export interface DniCloudDraft {
  slots: DniSlotData[];
  settings: DniCloudSettings;
  totalSlots: number;
}

export const DniCloudService = {
  /**
   * Carga el borrador de la matriz DNI desde Supabase en la nube
   */
  async loadDraftFromCloud(userEmail?: string): Promise<DniCloudDraft | null> {
    if (!userEmail) return null;
    try {
      const { data, error } = await supabase
        .from('dni_matrix_borradores')
        .select('slots_data, settings, total_slots')
        .eq('usuario_email', userEmail.toLowerCase().trim())
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const slotsResult = z.array(DniSlotDataSchema).safeParse(data.slots_data);
      const settingsResult = DniCloudSettingsSchema.safeParse(data.settings || {});

      if (!slotsResult.success || !settingsResult.success) {
        console.warn('[DniCloudService] Borrador remoto con formato incompatible.');
        return null;
      }

      const settings = {
        ...settingsResult.data,
        printSize: settingsResult.data.printSize === 'medium'
          ? 'standard'
          : settingsResult.data.printSize
      } as DniCloudSettings;

      return {
        slots: slotsResult.data as DniSlotData[],
        settings,
        totalSlots: data.total_slots || 100
      };
    } catch (err) {
      console.warn('[DniCloudService] Error al cargar borrador de la nube:', err);
      return null;
    }
  },

  /**
   * Guarda o actualiza el borrador de la matriz DNI en Supabase
   */
  async saveDraftToCloud(params: {
    slots: DniSlotData[];
    settings?: DniCloudSettings;
    totalSlots: number;
    userEmail: string;
    userId?: string;
  }): Promise<boolean> {
    if (!params.userEmail) return false;
    try {
      // Proteger contra límites de payload de PostgREST / Supabase (máx 3.5 MB)
      let slotsToSave = params.slots;
      const rawJson = JSON.stringify(slotsToSave);

      if (rawJson.length > 3_500_000) {
        console.warn(`[DniCloudService] Lote grande detectado (${Math.round(rawJson.length / 1024)} KB). Minimizando para nube...`);
        // Preservar metadatos completos y mantener imágenes de los cupos más recientes
        slotsToSave = slotsToSave.map((slot, index) => {
          if (index < 12) return slot;
          return {
            ...slot,
            anverso: (slot.anverso && slot.anverso.length > 200_000) ? slot.anverso.slice(0, 500) + '...[local_only]' : slot.anverso,
            reverso: (slot.reverso && slot.reverso.length > 200_000) ? slot.reverso.slice(0, 500) + '...[local_only]' : slot.reverso
          };
        });
      }

      const { error } = await supabase.from('dni_matrix_borradores').upsert(
        {
          usuario_id: params.userId || null,
          usuario_email: params.userEmail.toLowerCase().trim(),
          slots_data: slotsToSave,
          settings: params.settings || {},
          total_slots: params.totalSlots,
          actualizado_en: new Date().toISOString()
        },
        { onConflict: 'usuario_email' }
      );

      if (error) {
        console.warn('[DniCloudService] Error en upsert de borrador en la nube:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[DniCloudService] Error guardando borrador en la nube:', err);
      return false;
    }
  },

  /**
   * Elimina el borrador de la nube cuando el usuario reinicia o borra el lote
   */
  async clearDraftFromCloud(userEmail?: string): Promise<boolean> {
    if (!userEmail) return false;
    try {
      const { error } = await supabase
        .from('dni_matrix_borradores')
        .delete()
        .eq('usuario_email', userEmail.toLowerCase().trim());

      if (error) {
        console.warn('[DniCloudService] Error eliminando borrador de la nube:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[DniCloudService] Error en clearDraftFromCloud:', err);
      return false;
    }
  }
};
