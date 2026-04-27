import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { DeadlineStatus } from '../types';

export const DeadlineBanner: React.FC<DeadlineStatus> = ({ deadline, isClosed, label }) => {
  if (!deadline) {
    return (
      <div className="rounded-2xl px-4 py-3 bg-[var(--card-bg)]/70 border border-[var(--border-color)] text-sm text-[var(--text-gray)] flex items-center gap-2">
        <Clock size={16} />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl px-4 py-3 border flex items-center gap-2 text-sm font-medium shadow-[0_4px_12px_rgba(101,113,102,0.12)] ${
        isClosed
          ? 'bg-rose-50/95 border-rose-200 text-rose-800'
          : 'bg-[var(--success-light)]/40 border-[var(--primary-light)] text-[var(--text-dark)]'
      }`}
      role="status"
      aria-live="polite"
    >
      {isClosed ? <AlertTriangle size={16} /> : <Clock size={16} />}
      <span className="font-semibold">截止時間 {deadline}</span>
      <span className="opacity-80">— {label}</span>
    </div>
  );
};
