import React, { useEffect, useMemo, useState } from 'react';
import { CloudUpload, RefreshCcw, Trash2 } from 'lucide-react';
import { LoadingSpinner, QuantityStepper } from './ui';
import { generateId } from '../lib/format';
import type { DraftItem, Meal, UserOrder } from '../types';

interface OrderFormProps {
  meals: Meal[];
  isClosed: boolean;
  isLoadingMenu: boolean;
  isRefreshingMenu: boolean;
  isSubmitting: boolean;
  onRefreshMenu: () => void;
  onSubmit: (draft: Omit<UserOrder, 'timestamp'>) => Promise<boolean>;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  meals, isClosed, isLoadingMenu, isRefreshingMenu, isSubmitting, onRefreshMenu, onSubmit,
}) => {
  const [fillerName, setFillerName] = useState('');
  const [selectedMealName, setSelectedMealName] = useState('');
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [nameError, setNameError] = useState(false);

  const selectedMeal = useMemo(
    () => meals.find(m => m.name === selectedMealName) || null,
    [meals, selectedMealName],
  );

  // Keep draft in sync with menu changes: remove deleted meals, update prices on rename/reprice.
  useEffect(() => {
    if (meals.length === 0) return;
    setDraft(prev => {
      const next = prev
        .filter(item => meals.some(m => m.name === item.meal.name))
        .map(item => {
          const current = meals.find(m => m.name === item.meal.name)!;
          if (current.price === item.meal.price) return item;
          return { ...item, meal: current, subtotal: current.price * item.quantity };
        });
      const unchanged = next.length === prev.length && next.every((u, i) => u === prev[i]);
      return unchanged ? prev : next;
    });
  }, [meals]);

  const total = useMemo(() => draft.reduce((s, i) => s + i.subtotal, 0), [draft]);

  const addToDraft = () => {
    if (!selectedMeal || qty <= 0) return;
    const item: DraftItem = {
      id: generateId(),
      meal: selectedMeal,
      quantity: qty,
      subtotal: selectedMeal.price * qty,
    };
    setDraft(prev => [...prev, item]);
    setSelectedMealName('');
    setQty(1);
  };

  const removeDraft = (id: string) => {
    setDraft(prev => prev.filter(i => i.id !== id));
  };

  const submit = async () => {
    const name = fillerName.trim();
    if (!name) { setNameError(true); return; }
    if (draft.length === 0) return;
    setNameError(false);
    const ok = await onSubmit({
      filler_name: name,
      items: draft,
      total_price: total,
    });
    if (ok) {
      setFillerName('');
      setDraft([]);
      setSelectedMealName('');
      setQty(1);
    }
  };

  const disabled = isClosed || isSubmitting;

  return (
    <section className="rounded-[20px] bg-[var(--card-bg)]/80 border border-[var(--border-color)] shadow-[0_4px_15px_rgba(101,113,102,0.12)] p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-dark)]">新增訂單</h2>
        <button
          type="button"
          onClick={onRefreshMenu}
          disabled={isRefreshingMenu}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-gray)] hover:text-[var(--text-dark)] disabled:opacity-50"
          aria-label="重新載入菜單"
        >
          <RefreshCcw size={14} className={isRefreshingMenu ? 'animate-spin' : ''} />
          <span>重載菜單</span>
        </button>
      </header>

      {isClosed && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          訂餐已截止，無法新增。
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--text-dark)] mb-1">姓名</label>
        <input
          type="text"
          value={fillerName}
          onChange={e => { setFillerName(e.target.value); if (nameError) setNameError(false); }}
          disabled={disabled}
          className={`w-full rounded-xl px-3 py-2 bg-white/80 border text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] ${
            nameError ? 'border-rose-400' : 'border-[var(--border-color)]'
          }`}
          placeholder="輸入姓名"
        />
        {nameError && <p className="text-xs text-rose-600 mt-1">請輸入姓名</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <label className="block text-sm font-medium text-[var(--text-dark)] mb-1">餐點</label>
          {isLoadingMenu ? (
            <div className="rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] flex items-center gap-2 text-sm text-[var(--text-gray)]">
              <LoadingSpinner size={14} /> 載入中…
            </div>
          ) : (
            <select
              value={selectedMealName}
              onChange={e => setSelectedMealName(e.target.value)}
              disabled={disabled || meals.length === 0}
              className="w-full rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] disabled:opacity-60"
            >
              <option value="">{meals.length === 0 ? '尚無菜單' : '請選擇餐點'}</option>
              {meals.map(m => (
                <option key={m.name} value={m.name}>
                  {m.name} — ${m.price}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dark)] mb-1">數量</label>
          <QuantityStepper value={qty} onChange={setQty} disabled={disabled} />
        </div>
        <button
          type="button"
          onClick={addToDraft}
          disabled={disabled || !selectedMeal}
          className="rounded-xl px-4 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
        >
          加入清單
        </button>
      </div>

      {draft.length > 0 && (
        <ul className="rounded-xl bg-white/70 border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
          {draft.map(item => (
            <li key={item.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[var(--text-dark)]">
                {item.meal.name} × {item.quantity}
              </span>
              <span className="text-sm tabular-nums text-[var(--text-dark)]">${item.subtotal}</span>
              <button
                type="button"
                onClick={() => removeDraft(item.id)}
                aria-label="移除"
                className="ml-2 text-rose-600 hover:brightness-95"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
        <div className="text-sm text-[var(--text-gray)]">
          目前合計 <span className="font-semibold text-[var(--text-dark)]">${total}</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || draft.length === 0}
          className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
        >
          {isSubmitting ? <LoadingSpinner size={16} /> : <CloudUpload size={16} />}
          送出訂單
        </button>
      </div>
    </section>
  );
};
