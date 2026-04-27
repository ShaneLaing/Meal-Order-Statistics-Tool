import React from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import type { ToastEntry } from '../types';

export const LoadingSpinner = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, min = 1, max = 99, disabled }) => {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="減少"
        className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-dark)] disabled:opacity-40 hover:brightness-95 transition"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[2.5rem] text-center font-semibold text-[var(--text-dark)] tabular-nums">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="增加"
        className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-dark)] disabled:opacity-40 hover:brightness-95 transition"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

interface ToastTrayProps {
  toasts: ToastEntry[];
  onDismiss: (id: string) => void;
}

export const ToastTray: React.FC<ToastTrayProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2 rounded-2xl px-4 py-3 shadow-lg backdrop-blur transition ${
            t.kind === 'error'
              ? 'bg-rose-50/95 text-rose-800 border border-rose-200'
              : t.kind === 'success'
              ? 'bg-emerald-50/95 text-emerald-800 border border-emerald-200'
              : 'bg-white/95 text-[var(--text-dark)] border border-[var(--border-color)]'
          }`}
        >
          <span className="text-sm leading-snug flex-1 break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="關閉"
            className="opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
