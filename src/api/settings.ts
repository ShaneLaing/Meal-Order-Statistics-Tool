import { apiGet, apiPost } from './client';
import type { ApiResponse, Settings } from '../types';

export async function fetchSettings(): Promise<Settings> {
  const res = await apiGet<ApiResponse>({ action: 'getSettings' });
  return res.settings ?? { deadline: null };
}

// Update the 截止時間 cell in the Config sheet.
// Pass an ISO 8601 string to set a deadline, or null/empty to clear it.
export async function setDeadline(deadline: string | null): Promise<Settings> {
  const res = await apiPost<ApiResponse>({ action: 'setDeadline', deadline });
  return res.settings ?? { deadline };
}
