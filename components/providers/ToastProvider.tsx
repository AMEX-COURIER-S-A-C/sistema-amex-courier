'use client';

import React, { useEffect, useState } from 'react';
import { ToastItem, subscribeToast } from '@/lib/toast';
import ToastContainer from '@/components/ui/toast/ToastContainer';

export default function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast(updatedToasts => {
      setToasts(updatedToasts);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} />
    </>
  );
}
