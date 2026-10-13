'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  X
} from 'lucide-react';
import { DialogItem, DialogVariant } from '@/lib/dialog';
import { smoothScrollManager } from '@/lib/smooth-scroll/manager';

interface GlobalDialogModalProps {
  dialog: DialogItem | null;
}

const VARIANT_ICONS: Record<DialogVariant, React.ComponentType<{ className?: string }>> = {
  danger: AlertTriangle,
  warning: AlertCircle,
  success: CheckCircle2,
  info: Info,
  default: HelpCircle
};

const VARIANT_COLORS: Record<
  DialogVariant,
  {
    iconWrap: string;
    iconColor: string;
    confirmBtn: string;
    defaultTitle: string;
  }
> = {
  danger: {
    iconWrap: 'bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-900/60',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBtn:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-500/25 focus:ring-red-500',
    defaultTitle: 'Confirmar eliminación'
  },
  warning: {
    iconWrap: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn:
      'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm shadow-amber-500/25 focus:ring-amber-500',
    defaultTitle: 'Advertencia'
  },
  success: {
    iconWrap: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    confirmBtn:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-500/25 focus:ring-emerald-500',
    defaultTitle: 'Operación exitosa'
  },
  info: {
    iconWrap: 'bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/25 focus:ring-blue-500',
    defaultTitle: 'Información del sistema'
  },
  default: {
    iconWrap: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    iconColor: 'text-slate-700 dark:text-slate-300',
    confirmBtn:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/25 focus:ring-blue-500',
    defaultTitle: 'Confirmación'
  }
};

export default function GlobalDialogModal({ dialog }: GlobalDialogModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const [promptValue, setPromptValue] = React.useState('');

  useEffect(() => {
    if (dialog && dialog.type === 'prompt') {
      setPromptValue(dialog.defaultValue || '');
    }
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      dialog.resolve(true);
    } else if (dialog.type === 'prompt') {
      dialog.resolve(promptValue);
    } else {
      dialog.resolve();
    }
  }, [dialog, promptValue]);

  const handleCancel = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      dialog.resolve(false);
    } else if (dialog.type === 'prompt') {
      dialog.resolve(null);
    } else {
      dialog.resolve();
    }
  }, [dialog]);

  // Keyboard navigation & lock management
  useEffect(() => {
    if (!dialog) return;

    smoothScrollManager.pushModalLock();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Safe focus assignment
    const timer = setTimeout(() => {
      if (dialog.type === 'prompt') {
        promptInputRef.current?.focus();
        promptInputRef.current?.select();
      } else if (dialog.type === 'confirm' && dialog.safeFocusCancel) {
        cancelBtnRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }, 40);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
      smoothScrollManager.popModalLock();
    };
  }, [dialog, handleCancel]);

  if (!dialog) return null;

  const variant = dialog.variant;
  const config = VARIANT_COLORS[variant] || VARIANT_COLORS.default;
  const IconComponent = VARIANT_ICONS[variant] || VARIANT_ICONS.default;
  const displayTitle = dialog.title || config.defaultTitle;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-dialog-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar with close button */}
        <div className="flex justify-end p-3 pb-0">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar diálogo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="px-6 pb-6 pt-1 flex flex-col items-center text-center">
          {/* Animated/Styled Icon Badge */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xs mb-4 ${config.iconWrap}`}
          >
            <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
          </div>

          <h3
            id="global-dialog-title"
            className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2"
          >
            {displayTitle}
          </h3>

          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm whitespace-pre-line break-words">
            {dialog.message}
          </div>

          {dialog.type === 'prompt' && (
            <input
              ref={promptInputRef}
              type="text"
              value={promptValue}
              onChange={e => setPromptValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder={dialog.placeholder}
              className="mt-4 w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end gap-3">
          {dialog.type === 'confirm' || dialog.type === 'prompt' ? (
            <>
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-medium text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                {dialog.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-medium text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${config.confirmBtn}`}
              >
                {dialog.confirmText}
              </button>
            </>
          ) : (
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${config.confirmBtn}`}
            >
              {dialog.confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
