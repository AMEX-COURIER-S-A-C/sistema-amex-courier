import React from 'react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'default';

export interface ConfirmDialogOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  /**
   * If true, focuses the Cancel button by default to prevent accidental destructive actions on Enter.
   * Defaults to true if variant === 'danger'.
   */
  safeFocusCancel?: boolean;
}

export interface AlertDialogOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  variant?: DialogVariant;
}

export interface PromptDialogOptions {
  title?: string;
  message?: string | React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export type DialogItem =
  | ({
      id: string;
      type: 'confirm';
      title?: string;
      message: string | React.ReactNode;
      confirmText: string;
      cancelText: string;
      variant: DialogVariant;
      safeFocusCancel: boolean;
      resolve: (value: boolean) => void;
    })
  | ({
      id: string;
      type: 'alert';
      title?: string;
      message: string | React.ReactNode;
      confirmText: string;
      variant: DialogVariant;
      resolve: () => void;
    })
  | ({
      id: string;
      type: 'prompt';
      title?: string;
      message?: string | React.ReactNode;
      defaultValue: string;
      placeholder?: string;
      confirmText: string;
      cancelText: string;
      variant: DialogVariant;
      resolve: (value: string | null) => void;
    });

type DialogListener = (item: DialogItem | null) => void;

let currentDialog: DialogItem | null = null;
const dialogQueue: DialogItem[] = [];
const listeners = new Set<DialogListener>();

function notify() {
  listeners.forEach(fn => fn(currentDialog));
}

function processNext() {
  if (currentDialog !== null) return;
  if (dialogQueue.length > 0) {
    currentDialog = dialogQueue.shift()!;
    notify();
  } else {
    notify();
  }
}

export function subscribeDialog(listener: DialogListener) {
  listeners.add(listener);
  listener(currentDialog);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Modern replacement for window.confirm()
 * Returns a Promise<boolean> that resolves to true if confirmed, false if cancelled.
 */
export function confirmDialog(options: ConfirmDialogOptions | string): Promise<boolean> {
  const opts: ConfirmDialogOptions =
    typeof options === 'string' ? { message: options } : options;

  const variant: DialogVariant = opts.variant || 'default';
  const safeFocusCancel =
    opts.safeFocusCancel !== undefined ? opts.safeFocusCancel : variant === 'danger';

  return new Promise<boolean>(resolve => {
    const item: DialogItem = {
      id: `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'confirm',
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || (variant === 'danger' ? 'Sí, eliminar' : 'Confirmar'),
      cancelText: opts.cancelText || 'Cancelar',
      variant,
      safeFocusCancel,
      resolve: (val: boolean) => {
        resolve(val);
        currentDialog = null;
        processNext();
      }
    };

    dialogQueue.push(item);
    processNext();
  });
}

/**
 * Modern replacement for window.alert()
 * Returns a Promise<void> that resolves when user acknowledges the message.
 */
export function alertDialog(options: AlertDialogOptions | string): Promise<void> {
  const opts: AlertDialogOptions =
    typeof options === 'string' ? { message: options } : options;

  const variant: DialogVariant = opts.variant || 'info';

  return new Promise<void>(resolve => {
    const item: DialogItem = {
      id: `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'alert',
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Aceptar',
      variant,
      resolve: () => {
        resolve();
        currentDialog = null;
        processNext();
      }
    };

    dialogQueue.push(item);
    processNext();
  });
}

/**
 * Modern replacement for window.prompt()
 * Returns a Promise<string | null> that resolves to the entered text, or null if cancelled.
 */
export function promptDialog(
  options: PromptDialogOptions | string,
  defaultValue?: string
): Promise<string | null> {
  const opts: PromptDialogOptions =
    typeof options === 'string'
      ? { message: options, defaultValue: defaultValue || '' }
      : options;

  return new Promise<string | null>(resolve => {
    const item: DialogItem = {
      id: `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'prompt',
      title: opts.title || 'Ingresar valor',
      message: opts.message,
      defaultValue: opts.defaultValue || '',
      placeholder: opts.placeholder,
      confirmText: opts.confirmText || 'Aceptar',
      cancelText: opts.cancelText || 'Cancelar',
      variant: opts.variant || 'default',
      resolve: (val: string | null) => {
        resolve(val);
        currentDialog = null;
        processNext();
      }
    };

    dialogQueue.push(item);
    processNext();
  });
}

/**
 * React Hook to access confirmDialog, alertDialog and promptDialog with convenient syntax.
 */
export function useDialog() {
  return {
    confirm: confirmDialog,
    alert: alertDialog,
    prompt: promptDialog
  };
}
