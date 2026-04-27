import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { LoadingSpinner, QuantityStepper } from './ui';
import { generateId, padMealName } from '../lib/format';
import type { DraftItem, Meal, UserOrder } from '../types';

interface EditDialogProps {
  order: UserOrder;
  meals: Meal[];
  isClosed: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (
    prev: { filler_name: string; timestamp: string },
    next: UserOrder,
  ) => Promise<boolean>;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  order, meals, isClosed, isSubmitting, onClose, onSave,
}) => {
  const [name, setName] = useState(order.filler_name);
  const [items, setItems] = useState<DraftItem[]>(() => order.items.map(i => ({ ...i })));
  const [selectedMealName, setSelectedMealName] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setName(order.filler_name);
    setItems(order.items.map(i => ({ ...i })));
  }, [order.timestamp, order.filler_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMeal = useMemo(
    () => meals.find(m => m.name === selectedMealName) || null,
    [meals, selectedMealName],
  );
  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items]);

  const addItem = () => {
    if (!selectedMeal || qty <= 0) return;
    setItems(prev => [...prev, {
      id: generateId(),
      meal: selectedMeal,
      quantity: qty,
      subtotal: selectedMeal.price * qty,
    }]);
    setSelectedMealName('');
    setQty(1);
  };

  const updateQty = (id: string, q: number) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: q, subtotal: i.meal.price * q } : i
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const save = async () => {
    if (!name.trim() || items.length === 0) return;
    const ok = await onSave(
      { filler_name: order.filler_name, timestamp: order.timestamp },
      {
        ...order,
        filler_name: name.trim(),
        items,
        total_price: total,
      },
    );
    if (ok) onClose();
  };

  const disabled = isClosed || isSubmitting;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-[20px] bg-[var(--bg-color)] border border-[var(--border-color)] shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-dark)]">編輯訂單</h2>
          <button type="button" onClick={onClose} aria-label="關閉" className="text-[var(--text-gray)] hover:text-[var(--text-dark)]">
            <X size={18} />
          </button>
        </header>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {isClosed && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              訂餐已截止，無法儲存修改。
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-dark)] mb-1">姓名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-[var(--text-dark)] mb-1">新增餐點</label>
              <select
                value={selectedMealName}
                onChange={e => setSelectedMealName(e.target.value)}
                disabled={disabled || meals.length === 0}
                className="w-full rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-[var(--text-dark)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                <option value="">{meals.length === 0 ? '尚無菜單' : '請選擇餐點'}</option>
                {meals.map(m => (
                  <option key={m.name} value={m.name}>{padMealName(m.name)} ${m.price}</option>
                ))}
              </select>
            </div>
            <QuantityStepper value={qty} onChange={setQty} disabled={disabled} />
            <button
              type="button"
              onClick={addItem}
              disabled={disabled || !selectedMeal}
              className="rounded-xl px-4 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
            >
              加入
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-[var(--text-gray)] text-center py-4">尚無餐點。</p>
          ) : (
            <ul className="rounded-xl bg-white/70 border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
              {items.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm text-[var(--text-dark)] flex-1">{item.meal.name}</span>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={q => updateQty(item.id, q)}
                    disabled={disabled}
                  />
                  <span className="text-sm tabular-nums text-[var(--text-dark)] w-16 text-right">${item.subtotal}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="移除"
                    className="text-rose-600 hover:brightness-95"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
          <div className="text-sm text-[var(--text-gray)]">
            合計 <span className="font-semibold text-[var(--text-dark)]">${total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 bg-white/70 border border-[var(--border-color)] text-[var(--text-dark)] hover:brightness-95 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              disabled={disabled || !name.trim() || items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] font-semibold disabled:opacity-50 hover:brightness-105 transition"
            >
              {isSubmitting && <LoadingSpinner size={14} />}
              儲存
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
