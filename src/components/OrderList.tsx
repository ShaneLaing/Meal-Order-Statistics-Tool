import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { LoadingSpinner } from './ui';
import { buildLineExport } from '../lib/lineExport';
import type { UserOrder } from '../types';

interface OrderListProps {
  orders: UserOrder[];
  isLoading: boolean;
  isClosed: boolean;
  deletingKey: string | null;
  onEdit: (o: UserOrder) => void;
  onDelete: (filler_name: string, timestamp: string) => void;
}

const orderKey = (o: UserOrder) => o.filler_name + '|' + o.timestamp;

export const OrderList: React.FC<OrderListProps> = ({
  orders, isLoading, isClosed, deletingKey, onEdit, onDelete,
}) => {
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [exportVisible, setExportVisible] = useState(false);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return orders;
    return orders.filter(o => o.filler_name.toLowerCase().includes(k));
  }, [orders, keyword]);

  const grandTotal = useMemo(
    () => filtered.reduce((s, o) => s + (o.total_price || 0), 0),
    [filtered],
  );

  const lineText = useMemo(() => buildLineExport(filtered), [filtered]);

  return (
    <section className="rounded-[20px] bg-[var(--card-bg)]/80 border border-[var(--border-color)] shadow-[0_4px_15px_rgba(101,113,102,0.12)] overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--text-dark)]">所有訂單</h2>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? '收合' : '展開'}
            className="text-[var(--text-gray)] hover:text-[var(--text-dark)]"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        <div className="text-sm text-[var(--text-dark)]">
          共 <span className="font-semibold">{filtered.length}</span> 筆 / 合計 <span className="font-semibold">${grandTotal}</span>
        </div>
      </header>

      {expanded && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜尋姓名…"
              className="flex-1 min-w-[160px] rounded-xl px-3 py-2 bg-white/80 border border-[var(--border-color)] text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            />
            <button
              type="button"
              onClick={() => setExportVisible(v => !v)}
              className="rounded-xl px-3 py-2 bg-[var(--primary-color)] text-[var(--text-dark)] text-sm font-semibold hover:brightness-105 transition"
            >
              {exportVisible ? '收合匯出' : '匯出 LINE 文字'}
            </button>
          </div>

          {exportVisible && (
            <textarea
              readOnly
              value={lineText}
              className="w-full min-h-[140px] rounded-xl bg-white/70 border border-[var(--border-color)] p-3 text-sm font-mono text-[var(--text-dark)]"
              onFocus={e => e.currentTarget.select()}
            />
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-gray)] text-sm">目前沒有訂單。</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map(order => {
                const k = orderKey(order);
                const isDeleting = deletingKey === k;
                return (
                  <li
                    key={k}
                    className="rounded-2xl bg-white/70 border border-[var(--border-color)] p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[var(--text-dark)]">{order.filler_name}</div>
                        <div className="text-xs text-[var(--text-gray)]">總計 ${order.total_price}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(order)}
                          disabled={isClosed}
                          aria-label="編輯"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-dark)] hover:brightness-95 disabled:opacity-40 transition"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(order.filler_name, order.timestamp)}
                          disabled={isClosed || isDeleting}
                          aria-label="刪除"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:brightness-95 disabled:opacity-40 transition"
                        >
                          {isDeleting ? <LoadingSpinner size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 ? (
                      <ul className="text-sm text-[var(--text-gray)] space-y-1">
                        {order.items.map(item => (
                          <li key={item.id} className="flex justify-between">
                            <span>{item.meal.name} × {item.quantity}</span>
                            <span className="tabular-nums">${item.subtotal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : order.items_summary ? (
                      <pre className="text-sm text-[var(--text-gray)] whitespace-pre-wrap font-sans">{order.items_summary}</pre>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
