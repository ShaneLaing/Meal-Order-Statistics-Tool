import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchOrders,
  createOrder as apiCreateOrder,
  updateOrder as apiUpdateOrder,
  deleteOrder as apiDeleteOrder,
} from '../api/orders';
import { ApiError, CloudNotConfiguredError } from '../api/client';
import { isCloudConfigured } from '../config';
import type { UserOrder } from '../types';

interface UseOrdersOptions {
  onError?: (msg: string) => void;
  onPastDeadline?: () => void;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'PAST_DEADLINE') {
    return '已超過截止時限，無法異動訂單。';
  }
  return err instanceof Error ? err.message : String(err);
}

// Composite key — orders with the same (filler_name, timestamp) are equal.
function sameKey(a: UserOrder, fillerName: string, timestamp: string): boolean {
  return a.filler_name === fillerName && a.timestamp === timestamp;
}

export function useOrders(opts: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isLoading, setIsLoading] = useState(isCloudConfigured);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const onErrorRef = useRef(opts.onError);
  const onPastDeadlineRef = useRef(opts.onPastDeadline);
  onErrorRef.current = opts.onError;
  onPastDeadlineRef.current = opts.onPastDeadline;

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.code === 'PAST_DEADLINE') {
      onPastDeadlineRef.current?.();
    }
    onErrorRef.current?.(describeError(err));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      if (!(err instanceof CloudNotConfiguredError)) handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    if (isCloudConfigured) refresh();
    else setIsLoading(false);
  }, [refresh]);

  // create — backend assigns timestamp.
  const create = useCallback(async (draft: Omit<UserOrder, 'timestamp'>): Promise<boolean> => {
    if (!isCloudConfigured) {
      const localTs = new Date().toISOString();
      setOrders(prev => [...prev, { ...draft, timestamp: localTs }]);
      return true;
    }
    setIsSubmitting(true);
    try {
      const ts = await apiCreateOrder({ ...draft, timestamp: '' });
      setOrders(prev => [...prev, { ...draft, timestamp: ts }]);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [handleError]);

  // update — uses (prevFillerName, prevTimestamp) to delete server-side, returns new timestamp.
  const update = useCallback(async (
    prev: { filler_name: string; timestamp: string },
    next: UserOrder,
  ): Promise<boolean> => {
    if (!isCloudConfigured) {
      setOrders(orders => orders.map(o =>
        sameKey(o, prev.filler_name, prev.timestamp)
          ? { ...next, timestamp: new Date().toISOString() }
          : o
      ));
      return true;
    }
    setIsSubmitting(true);
    try {
      const newTs = await apiUpdateOrder(prev, next);
      setOrders(orders => orders.map(o =>
        sameKey(o, prev.filler_name, prev.timestamp)
          ? { ...next, timestamp: newTs }
          : o
      ));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [handleError]);

  const remove = useCallback(async (filler_name: string, timestamp: string): Promise<boolean> => {
    let snapshot: UserOrder[] = [];
    setOrders(prev => {
      snapshot = prev;
      return prev.filter(o => !sameKey(o, filler_name, timestamp));
    });
    if (!isCloudConfigured) return true;
    const key = filler_name + '|' + timestamp;
    setDeletingKey(key);
    try {
      await apiDeleteOrder(filler_name, timestamp);
      return true;
    } catch (err) {
      setOrders(snapshot);
      handleError(err);
      return false;
    } finally {
      setDeletingKey(null);
    }
  }, [handleError]);

  return { orders, isLoading, isSubmitting, deletingKey, refresh, create, update, remove };
}

export type OrdersApi = ReturnType<typeof useOrders>;
