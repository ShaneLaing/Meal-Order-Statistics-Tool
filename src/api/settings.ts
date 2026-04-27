import { apiGet } from './client';
import type { ApiResponse, Settings } from '../types';

export async function fetchSettings(): Promise<Settings> {
  const res = await apiGet<ApiResponse>({ action: 'getSettings' });
  return res.settings ?? { deadline: null };
}
