'use client';

import React, { useEffect, useState } from 'react';
import { DialogItem, subscribeDialog } from '@/lib/dialog';
import GlobalDialogModal from '@/components/ui/dialog/GlobalDialogModal';

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DialogItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeDialog(dialog => {
      setActiveDialog(dialog);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <GlobalDialogModal dialog={activeDialog} />
    </>
  );
}
