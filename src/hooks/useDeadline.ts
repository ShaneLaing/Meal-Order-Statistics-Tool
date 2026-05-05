import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSettings, setDeadline as apiSetDeadline } from '../api/settings';
import { CloudNotConfiguredError } from '../api/client';
import { DEADLINE_TICK_MS, isCloudConfigured } from '../config';
import { formatRemaining } from '../lib/format';
import type { DeadlineStatus } from '../types';

interface UseDeadlineOptions {
  onError?: (msg: string) => void;
}

export function useDeadline(opts: UseDeadlineOptions = {}) {
  const [deadline, setDeadline] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onErrorRef = useRef(opts.onError);
  onErrorRef.current = opts.onError;

  const refresh = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setDeadline(s.deadline ?? null);
    } catch (err) {
      if (!(err instanceof CloudNotConfiguredError)) {
        const msg = err instanceof Error ? err.message : String(err);
        onErrorRef.current?.('讀取截止時間失敗：' + msg);
      }
    }
  }, []);

  useEffect(() => {
    if (isCloudConfigured) refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), DEADLINE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const status: DeadlineStatus = useMemo(() => {
    if (!deadline) {
      return { deadline: null, isClosed: false, remainingMs: Number.POSITIVE_INFINITY, label: '未設定截止時間' };
    }
    const target = new Date(deadline).getTime();
    if (isNaN(target)) {
      return { deadline, isClosed: false, remainingMs: Number.POSITIVE_INFINITY, label: '截止時間格式錯誤' };
    }
    const remainingMs = target - now;
    return {
      deadline,
      isClosed: remainingMs <= 0,
      remainingMs,
      label: formatRemaining(remainingMs),
    };
  }, [deadline, now]);

  const markClosed = useCallback(() => {
    setDeadline(new Date(Date.now() - 1000).toISOString());
  }, []);

  const update = useCallback(async (iso: string | null): Promise<boolean> => {
    try {
      const next = await apiSetDeadline(iso);
      setDeadline(next.deadline ?? null);
      return true;
    } catch (err) {
      if (!(err instanceof CloudNotConfiguredError)) {
        const msg = err instanceof Error ? err.message : String(err);
        onErrorRef.current?.('更新截止時間失敗：' + msg);
      }
      return false;
    }
  }, []);

  return { ...status, refresh, markClosed, update };
}

export type DeadlineApi = ReturnType<typeof useDeadline>;
