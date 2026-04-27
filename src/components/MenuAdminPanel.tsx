import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from './ui';
import type { Meal } from '../types';

interface MenuAdminPanelProps {
  meals: Meal[];
  onUpsert: (item: { name: string; price: number; prevName?: string }) => Promise<Meal | null>;
  onDelete: (name: string) => Promise<boolean>;
}

export const MenuAdminPanel: React.FC<MenuAdminPanelProps> = ({ meals, onUpsert, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const submitNew = async () => {
    const name = draftName.trim();
    const price = Number(draftPrice);
    if (!name || isNaN(price) || price < 0) return;
    setBusy(true);
    const saved = await onUpsert({ name, price });
    setBusy(false);
    if (saved) {
      setDraftName('');
      setDraftPrice('');
    }
  };

  return (
    <section className="rounded-[20px] bg-[var(--card-bg)]/60 border border-dashed border-[var(--border-color)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--card-bg)]/80 transition"
        aria-expanded={open}
      >
        <span className="font-semibold text-[var(--text-dark)]">進階設定 — 菜單管理</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-gray)]">
            這裡可以新增、編輯、改名或刪除菜單項目，會直接寫回 Google Sheet 的 <code>Menu</code> 工作表。
          </p>

          <ul className="rounded-xl bg-white/70 border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
            {meals.length === 0 && (
              <li className="px-3 py-3 text-sm text-[var(--text-gray)]">尚無菜單項目。</li>
            )}
            {meals.map(meal => (
              <MenuRow key={meal.name} meal={meal} onUpsert={onUpsert} onDelete={onDelete} />
            ))}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="新菜名"
              className="rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            />
            <input
              type="number"
              min={0}
              value={draftPrice}
              onChange={e => setDraftPrice(e.target.value)}
              placeholder="價格"
              className="rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            />
            <button
              type="button"
              onClick={submitNew}
              disabled={busy || !draftName.trim() || !draftPrice}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
            >
              {busy ? <LoadingSpinner size={14} /> : <Plus size={14} />}
              新增
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

interface MenuRowProps {
  meal: Meal;
  onUpsert: (item: { name: string; price: number; prevName?: string }) => Promise<Meal | null>;
  onDelete: (name: string) => Promise<boolean>;
}

const MenuRow: React.FC<MenuRowProps> = ({ meal, onUpsert, onDelete }) => {
  const [name, setName] = useState(meal.name);
  const [price, setPrice] = useState(String(meal.price));
  const [busy, setBusy] = useState(false);
  const dirty = name !== meal.name || price !== String(meal.price);

  const save = async () => {
    const trimmed = name.trim();
    const p = Number(price);
    if (!trimmed || isNaN(p) || p < 0) return;
    setBusy(true);
    await onUpsert({ name: trimmed, price: p, prevName: meal.name });
    setBusy(false);
  };

  const remove = async () => {
    if (!confirm(`確定刪除「${meal.name}」？`)) return;
    setBusy(true);
    await onDelete(meal.name);
    setBusy(false);
  };

  return (
    <li className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-center px-3 py-2">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="min-w-0 rounded-xl px-3 py-1.5 bg-white border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
      />
      <input
        type="number"
        min={0}
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="rounded-xl px-3 py-1.5 bg-white border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-xl px-3 py-1.5 bg-[var(--primary-color)] text-[var(--text-dark)] text-sm font-semibold disabled:opacity-40 hover:brightness-105 transition"
        >
          {busy ? <LoadingSpinner size={14} /> : '儲存'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label="刪除"
          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:brightness-95 disabled:opacity-40 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
};
