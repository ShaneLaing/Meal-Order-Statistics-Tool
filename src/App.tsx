import { useState } from 'react';
import { Header } from './components/Header';
import { DeadlineBanner } from './components/DeadlineBanner';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { EditDialog } from './components/EditDialog';
import { MenuAdminPanel } from './components/MenuAdminPanel';
import { ToastTray } from './components/ui';
import { useMenu } from './hooks/useMenu';
import { useOrders } from './hooks/useOrders';
import { useDeadline } from './hooks/useDeadline';
import { useToast } from './hooks/useToast';
import { isCloudConfigured } from './config';
import type { UserOrder } from './types';

export default function App() {
  const toast = useToast();
  const menu = useMenu({ onError: toast.error });
  const deadline = useDeadline({ onError: toast.error });
  const orders = useOrders({
    onError: toast.error,
    onPastDeadline: () => {
      deadline.markClosed();
      void deadline.refresh();
    },
  });

  const [editing, setEditing] = useState<UserOrder | null>(null);

  const handleSubmit = async (draft: Omit<UserOrder, 'timestamp'>): Promise<boolean> => {
    const ok = await orders.create(draft);
    if (ok) toast.success('訂單已送出');
    return ok;
  };

  const handleUpdate = async (
    prev: { filler_name: string; timestamp: string },
    next: UserOrder,
  ): Promise<boolean> => {
    const ok = await orders.update(prev, next);
    if (ok) toast.success('訂單已更新');
    return ok;
  };

  const handleDelete = async (filler_name: string, timestamp: string) => {
    const ok = await orders.remove(filler_name, timestamp);
    if (ok) toast.info('訂單已刪除');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-dark)]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {!isCloudConfigured && (
          <div className="rounded-2xl px-4 py-3 bg-amber-50 border border-amber-200 text-sm text-amber-900">
            尚未設定 <code>VITE_APP_SCRIPT_WEB_APP_URL</code>，目前以本機模擬模式執行（資料不會持久化）。
          </div>
        )}

        <DeadlineBanner
          deadline={deadline.deadline}
          isClosed={deadline.isClosed}
          remainingMs={deadline.remainingMs}
          label={deadline.label}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
          <OrderList
            orders={orders.orders}
            isLoading={orders.isLoading}
            isClosed={deadline.isClosed}
            deletingKey={orders.deletingKey}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
          <OrderForm
            meals={menu.meals}
            isClosed={deadline.isClosed}
            isLoadingMenu={menu.isLoading}
            isRefreshingMenu={menu.isRefreshing}
            isSubmitting={orders.isSubmitting}
            onRefreshMenu={menu.refresh}
            onSubmit={handleSubmit}
          />
        </div>

        <MenuAdminPanel
          meals={menu.meals}
          onUpsert={menu.upsert}
          onDelete={menu.remove}
        />
      </main>

      {editing && (
        <EditDialog
          order={editing}
          meals={menu.meals}
          isClosed={deadline.isClosed}
          isSubmitting={orders.isSubmitting}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}

      <ToastTray toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
