import { describe, it, expect, beforeEach } from 'vitest';
import {
  confirmDialog,
  alertDialog,
  promptDialog,
  subscribeDialog,
  DialogItem
} from '@/lib/dialog';

describe('Global Dialog System', () => {
  let activeDialog: DialogItem | null = null;
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = subscribeDialog(dialog => {
      activeDialog = dialog;
    });
  });

  it('handles confirmDialog with confirmation (true)', async () => {
    const promise = confirmDialog({
      title: 'Eliminar paquete',
      message: '¿Estás seguro de eliminar el paquete WR-100?',
      variant: 'danger'
    });

    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.type).toBe('confirm');
    if (activeDialog?.type === 'confirm') {
      expect(activeDialog.title).toBe('Eliminar paquete');
      expect(activeDialog.variant).toBe('danger');
      expect(activeDialog.safeFocusCancel).toBe(true);
      activeDialog.resolve(true);
    }

    const result = await promise;
    expect(result).toBe(true);
  });

  it('handles confirmDialog with cancellation (false)', async () => {
    const promise = confirmDialog('¿Continuar sin guardar?');

    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.type).toBe('confirm');
    if (activeDialog?.type === 'confirm') {
      expect(activeDialog.variant).toBe('default');
      expect(activeDialog.safeFocusCancel).toBe(false);
      activeDialog.resolve(false);
    }

    const result = await promise;
    expect(result).toBe(false);
  });

  it('handles alertDialog acknowledgement', async () => {
    const promise = alertDialog({
      title: 'Sin conexión',
      message: 'Verifica tu red wifi',
      variant: 'warning'
    });

    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.type).toBe('alert');
    if (activeDialog?.type === 'alert') {
      expect(activeDialog.variant).toBe('warning');
      activeDialog.resolve();
    }

    await expect(promise).resolves.toBeUndefined();
  });

  it('queues dialogs sequentially', async () => {
    const p1 = confirmDialog('Diálogo 1');
    const p2 = alertDialog('Diálogo 2');

    expect(activeDialog?.message).toBe('Diálogo 1');

    if (activeDialog && activeDialog.type === 'confirm') {
      activeDialog.resolve(true);
    }
    await p1;

    expect(activeDialog?.message).toBe('Diálogo 2');

    if (activeDialog && activeDialog.type === 'alert') {
      activeDialog.resolve();
    }
    await p2;
  });

  it('handles promptDialog with input resolution', async () => {
    const promise = promptDialog({
      title: 'Renombrar libro',
      message: 'Ingresa el nuevo título:',
      defaultValue: 'Libro A'
    });

    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.type).toBe('prompt');
    if (activeDialog && activeDialog.type === 'prompt') {
      expect(activeDialog.defaultValue).toBe('Libro A');
      activeDialog.resolve('Libro Renombrado');
    }

    const result = await promise;
    expect(result).toBe('Libro Renombrado');
  });

  it('handles promptDialog cancellation (null)', async () => {
    const promise = promptDialog('Ingresa tu clave:');

    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.type).toBe('prompt');
    if (activeDialog && activeDialog.type === 'prompt') {
      activeDialog.resolve(null);
    }

    const result = await promise;
    expect(result).toBeNull();
  });
});
