import React, { useEffect, useState } from 'react';
import { Clock, RefreshCw, Save, Trash2 } from 'lucide-react';
import { LoadingSpinner } from './ui';
import type { DeadlineStatus } from '../types';

interface DeadlineSettingsCardProps extends DeadlineStatus {
  onRefresh: () => Promise<void>;
  onUpdate: (iso: string | null) => Promise<boolean>;
}

// Convert backend deadline string into the value expected by
// <input type="datetime-local"> (YYYY-MM-DDTHH:mm in local time).
function toDatetimeLocalValue(deadline: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DeadlineSettingsCard: React.FC<DeadlineSettingsCardProps> = ({
  deadline,
  isClosed,
  label,
  onRefresh,
  onUpdate,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<string>(() => toDatetimeLocalValue(deadline));

  // Sync draft when the upstream deadline changes (after refresh / save).
  useEffect(() => {
    setDraft(toDatetimeLocalValue(deadline));
  }, [deadline]);

  const currentValue = toDatetimeLocalValue(deadline);
  const dirty = draft !== currentValue;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    // datetime-local has no timezone; treat input as local time and convert to ISO.
    const local = new Date(draft);
    if (isNaN(local.getTime())) return;
    setSaving(true);
    try {
      await onUpdate(local.toISOString());
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!deadline) return;
    if (!confirm('確定要清除截止時間？清除後將不再顯示倒數。')) return;
    setSaving(true);
    try {
      await onUpdate(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[20px] bg-[var(--card-bg)]/60 border border-[var(--border-color)] overflow-hidden">
      <header className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-[var(--text-dark)] flex items-center gap-2">
            <Clock size={16} />
            截止時間
          </h2>
          <p className="mt-1 text-xs text-[var(--text-gray)]">
            寫入 Google Sheet 的 <code>Config</code> 工作表（key 包含「截止時間」）。
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || saving}
          aria-label="重新讀取截止時間"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-[var(--card-bg)] text-sm text-[var(--text-dark)] border border-[var(--border-color)] hover:brightness-95 disabled:opacity-50 transition"
        >
          {refreshing ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
          重新整理
        </button>
      </header>

      <div className="p-4 space-y-3">
        <div
          className={`rounded-xl px-4 py-3 border text-sm ${
            !deadline
              ? 'bg-white/70 border-[var(--border-color)] text-[var(--text-gray)]'
              : isClosed
                ? 'bg-rose-50/95 border-rose-200 text-rose-800'
                : 'bg-[var(--success-light)]/40 border-[var(--primary-light)] text-[var(--text-dark)]'
          }`}
          role="status"
          aria-live="polite"
        >
          {deadline ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">目前：{deadline}</span>
              <span className="opacity-80">— {label}</span>
            </div>
          ) : (
            <span>{label}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
          <label className="contents">
            <span className="sr-only">截止時間</span>
            <input
              type="datetime-local"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              disabled={saving}
              className="rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft || !dirty}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
          >
            {saving ? <LoadingSpinner size={14} /> : <Save size={14} />}
            儲存
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={saving || !deadline}
            aria-label="清除截止時間"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-rose-100 text-rose-700 text-sm font-medium disabled:opacity-40 hover:brightness-95 transition"
          >
            <Trash2 size={14} />
            清除
          </button>
        </div>

        <p className="text-xs text-[var(--text-gray)]">
          時間以瀏覽器當地時區輸入，送出時轉成 ISO 8601 由後端寫回試算表。
        </p>
      </div>
    </section>
  );
};
