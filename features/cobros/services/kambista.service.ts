import type { TipoCambioConfig, CotizacionKambista } from '../types';

const STORAGE_KEY = 'amex_tipo_cambio_config';

const DEFAULT_COTIZACION: TipoCambioConfig = {
  compra: 3.750,
  venta: 3.800,
  actualizadoEn: new Date().toISOString(),
  origen: 'DEFAULT'
};

export const TipoCambioService = {
  /**
   * Obtiene la cotización actual guardada en memoria/localStorage o por defecto
   */
  getCotizacionActual(): TipoCambioConfig {
    if (typeof window === 'undefined') return DEFAULT_COTIZACION;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.venta && parsed.compra) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading Tipo de Cambio from localStorage:', e);
    }
    return DEFAULT_COTIZACION;
  },

  /**
   * Guarda una cotización personalizada fijada por el operador para el turno
   */
  setCotizacionManual(compra: number, venta: number): TipoCambioConfig {
    const updated: TipoCambioConfig = {
      compra: Number(compra) || DEFAULT_COTIZACION.compra,
      venta: Number(venta) || DEFAULT_COTIZACION.venta,
      actualizadoEn: new Date().toISOString(),
      origen: 'MANUAL_OPERADOR'
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving Tipo de Cambio to localStorage:', e);
      }
    }
    return updated;
  },

  /**
   * Retorna la cotización actual sin llamadas externas fallidas
   */
  async fetchLiveExchangeRate(): Promise<TipoCambioConfig> {
    return this.getCotizacionActual();
  },

  /**
   * Convierte un monto en dólares (USD) a soles peruanos (PEN) usando el tipo de cambio venta
   */
  convertUsdToPen(amountUsd: number, tc?: number): number {
    if (typeof tc === 'number' && tc <= 0) return 0;
    const activeTc = typeof tc === 'number' && tc > 0 ? tc : this.getCotizacionActual().venta;
    return Math.round(amountUsd * activeTc * 100) / 100;
  },

  /**
   * Convierte un monto en soles (PEN) a dólares (USD) usando el tipo de cambio
   */
  convertPenToUsd(amountPen: number, tc?: number): number {
    if (typeof tc === 'number' && tc <= 0) return 0;
    const activeTc = typeof tc === 'number' && tc > 0 ? tc : this.getCotizacionActual().venta;
    if (!activeTc || activeTc <= 0) return 0;
    return Math.round((amountPen / activeTc) * 100) / 100;
  },

  /**
   * Formatea un valor monetario en Dólares ($ 0.00)
   */
  formatUsd(amount: number): string {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Formatea un valor monetario en Soles (S/ 0.00)
   */
  formatPen(amount: number): string {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

// Alias de retrocompatibilidad
export const KambistaService = TipoCambioService;
