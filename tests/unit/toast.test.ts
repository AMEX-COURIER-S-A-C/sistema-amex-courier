import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { toast, subscribeToast, clearToasts, ToastItem } from '@/lib/toast';

describe('Global Toast Notification System', () => {
  let currentToasts: ToastItem[] = [];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    clearToasts();
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = subscribeToast(toasts => {
      currentToasts = toasts;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (unsubscribe) {
      unsubscribe();
    }
    clearToasts();
  });

  it('subscribes and receives new success toast', () => {
    const id = toast.success('Entrega Registrada', 'Guía WR-100 • Juan Perez');

    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].id).toBe(id);
    expect(currentToasts[0].variant).toBe('success');
    expect(currentToasts[0].title).toBe('Entrega Registrada');
    expect(currentToasts[0].description).toBe('Guía WR-100 • Juan Perez');
  });

  it('supports error, info, and warning variants with options object', () => {
    toast.error('Error al guardar', { description: 'Fallo de conexión', duration: 5000 });
    expect(currentToasts[currentToasts.length - 1].variant).toBe('error');
    expect(currentToasts[currentToasts.length - 1].title).toBe('Error al guardar');
    expect(currentToasts[currentToasts.length - 1].duration).toBe(5000);

    toast.info('Actualización', { description: 'Sincronizando...' });
    expect(currentToasts[currentToasts.length - 1].variant).toBe('info');

    toast.warning('Atención', { description: 'Paquete sin peso asignado' });
    expect(currentToasts[currentToasts.length - 1].variant).toBe('warning');
  });

  it('enforces a maximum stack of 3 visible toasts without flooding', () => {
    toast.info('Toast 1');
    toast.info('Toast 2');
    toast.info('Toast 3');
    toast.info('Toast 4');
    toast.info('Toast 5');

    expect(currentToasts).toHaveLength(3);
    expect(currentToasts.map(t => t.title)).toEqual(['Toast 3', 'Toast 4', 'Toast 5']);
  });

  it('manually dismisses a toast by ID', () => {
    const id1 = toast.success('Primero');
    const id2 = toast.success('Segundo');

    expect(currentToasts).toHaveLength(2);
    toast.dismiss(id1);

    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].id).toBe(id2);
  });

  it('clears all active toasts', () => {
    toast.info('Item 1');
    toast.info('Item 2');
    expect(currentToasts).toHaveLength(2);

    toast.clear();
    expect(currentToasts).toHaveLength(0);
  });

  it('auto-dismisses after duration expires', () => {
    toast.success('Auto close', { duration: 3000 });
    expect(currentToasts).toHaveLength(1);

    vi.advanceTimersByTime(2999);
    expect(currentToasts).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(currentToasts).toHaveLength(0);
  });
});
