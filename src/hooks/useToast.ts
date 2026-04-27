import { useCallback, useState } from 'react';
import { generateId } from '../lib/format';
import type { ToastEntry, ToastKind } from '../types';

const AUTO_DISMISS_MS = 4_000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const info = useCallback((m: string) => push('info', m), [push]);
  const success = useCallback((m: string) => push('success', m), [push]);
  const error = useCallback((m: string) => push('error', m), [push]);

  return { toasts, info, success, error, dismiss };
}

export type ToastApi = ReturnType<typeof useToast>;
