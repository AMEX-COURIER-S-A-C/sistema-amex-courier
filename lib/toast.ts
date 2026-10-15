import React from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number; // ms, default: 4000
  description?: string | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string | React.ReactNode;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();
const MAX_VISIBLE_TOASTS = 3;

function notify() {
  listeners.forEach(fn => fn([...toasts]));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

export function clearToasts() {
  toasts = [];
  notify();
}

function addToast(variant: ToastVariant, title: string, options?: ToastOptions | string) {
  const opts: ToastOptions = typeof options === 'string' ? { description: options } : options || {};
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const duration = opts.duration ?? 4000;

  const newItem: ToastItem = {
    id,
    variant,
    title,
    description: opts.description,
    duration,
    action: opts.action,
    createdAt: Date.now()
  };

  // Mantener como máximo MAX_VISIBLE_TOASTS
  if (toasts.length >= MAX_VISIBLE_TOASTS) {
    toasts = toasts.slice(toasts.length - (MAX_VISIBLE_TOASTS - 1));
  }

  toasts.push(newItem);
  notify();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

export const toast = {
  success: (title: string, options?: ToastOptions | string) => addToast('success', title, options),
  error: (title: string, options?: ToastOptions | string) => addToast('error', title, options),
  info: (title: string, options?: ToastOptions | string) => addToast('info', title, options),
  warning: (title: string, options?: ToastOptions | string) => addToast('warning', title, options),
  dismiss: dismissToast,
  clear: clearToasts
};
