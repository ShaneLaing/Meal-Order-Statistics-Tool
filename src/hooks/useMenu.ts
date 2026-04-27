import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMenu, upsertMenuItem, deleteMenuItem } from '../api/menu';
import { CloudNotConfiguredError } from '../api/client';
import { MENU_REFRESH_INTERVAL_MS, isCloudConfigured } from '../config';
import type { Meal } from '../types';

interface UseMenuOptions {
  onError?: (msg: string) => void;
}

export function useMenu(opts: UseMenuOptions = {}) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(isCloudConfigured);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onErrorRef = useRef(opts.onError);
  onErrorRef.current = opts.onError;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const items = await fetchMenu();
      setMeals(items);
    } catch (err) {
      if (!(err instanceof CloudNotConfiguredError)) {
        const msg = err instanceof Error ? err.message : String(err);
        onErrorRef.current?.('菜單載入失敗：' + msg);
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCloudConfigured) refresh();
    else setIsLoading(false);
  }, [refresh]);

  useEffect(() => {
    if (!isCloudConfigured) return;
    const handleFocus = () => { refresh(); };
    const id = window.setInterval(refresh, MENU_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  // upsert (key = name).  Pass prevName when renaming an existing item.
  const upsert = useCallback(async (item: {
    name: string; price: number; prevName?: string;
  }): Promise<Meal | null> => {
    try {
      const saved = await upsertMenuItem(item);
      setMeals(prev => {
        const without = item.prevName && item.prevName !== saved.name
          ? prev.filter(m => m.name !== item.prevName)
          : prev;
        const i = without.findIndex(m => m.name === saved.name);
        if (i >= 0) {
          const next = without.slice();
          next[i] = saved;
          return next;
        }
        return [...without, saved];
      });
      return saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onErrorRef.current?.('儲存菜單失敗：' + msg);
      return null;
    }
  }, []);

  const remove = useCallback(async (name: string): Promise<boolean> => {
    let snapshot: Meal[] = [];
    setMeals(prev => {
      snapshot = prev;
      return prev.filter(m => m.name !== name);
    });
    try {
      await deleteMenuItem(name);
      return true;
    } catch (err) {
      setMeals(snapshot);
      const msg = err instanceof Error ? err.message : String(err);
      onErrorRef.current?.('刪除菜單失敗：' + msg);
      return false;
    }
  }, []);

  return { meals, isLoading, isRefreshing, refresh, upsert, remove };
}

export type MenuApi = ReturnType<typeof useMenu>;
