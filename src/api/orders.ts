import { apiGet, apiPost } from './client';
import type { ApiResponse, UserOrder } from '../types';

export async function fetchOrders(): Promise<UserOrder[]> {
  const res = await apiGet<ApiResponse>({ action: 'getOrders' });
  return res.orders ?? [];
}

// Create a brand-new order. The server assigns the timestamp.
export async function createOrder(order: UserOrder): Promise<string> {
  const res = await apiPost<ApiResponse>({
    action: 'upsertOrder',
    filler_name: order.filler_name,
    items: order.items,
    total_price: order.total_price,
  });
  if (!res.timestamp) throw new Error('Backend did not return a timestamp');
  return res.timestamp;
}

// Edit an existing order. Backend deletes (prevFillerName, prevTimestamp)
// rows and inserts the new payload, returning the new timestamp.
export async function updateOrder(
  prev: { filler_name: string; timestamp: string },
  next: UserOrder,
): Promise<string> {
  const res = await apiPost<ApiResponse>({
    action: 'upsertOrder',
    prevFillerName: prev.filler_name,
    prevTimestamp: prev.timestamp,
    filler_name: next.filler_name,
    items: next.items,
    total_price: next.total_price,
  });
  if (!res.timestamp) throw new Error('Backend did not return a timestamp');
  return res.timestamp;
}

export async function deleteOrder(filler_name: string, timestamp: string): Promise<void> {
  await apiPost<ApiResponse>({ action: 'deleteOrder', filler_name, timestamp });
}
