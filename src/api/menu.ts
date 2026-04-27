import { apiGet, apiPost } from './client';
import type { ApiResponse, Meal } from '../types';

export async function fetchMenu(): Promise<Meal[]> {
  const res = await apiGet<ApiResponse>({ action: 'getMenu' });
  return res.items ?? [];
}

// Add a new menu item, or update an existing one identified by `prevName`.
// Pass prevName equal to name (or omit) when only the price changes.
// Pass a different prevName to rename (backend deletes prev row, then inserts).
export async function upsertMenuItem(item: {
  name: string;
  price: number;
  prevName?: string;
}): Promise<Meal> {
  const res = await apiPost<ApiResponse>({ action: 'upsertMenu', item });
  if (!res.item) throw new Error('Backend did not return updated item');
  return res.item;
}

export async function deleteMenuItem(name: string): Promise<void> {
  await apiPost<ApiResponse>({ action: 'deleteMenu', name });
}
