// Domain types — strictly mirror the Google Sheet schema:
//   Menu          (name, price)        — name is the natural key
//   OrdersSummary (timestamp, filler_name, meal, qty, subtotal, total)
//                                      — (filler_name, timestamp) composite key
//   Config        (key=截止時間, value=Date)

export interface Meal {
  name: string;
  price: number;
}

export interface DraftItem {
  // Client-side React key only; never sent to backend (backend has no item id).
  id: string;
  meal: Meal;
  quantity: number;
  subtotal: number;
}

export interface UserOrder {
  // ISO 8601 timestamp string, server-assigned. Empty = local-only draft.
  timestamp: string;
  filler_name: string;
  items: DraftItem[];
  total_price: number;
  items_summary?: string;
}

export interface Settings {
  deadline: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  deadline?: string | null;
  timestamp?: string;
  data?: T;
  items?: Meal[];
  orders?: UserOrder[];
  settings?: Settings;
  item?: Meal;
  message?: string;
}

export interface DeadlineStatus {
  deadline: string | null;
  isClosed: boolean;
  remainingMs: number;
  label: string;
}

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastEntry {
  id: string;
  kind: ToastKind;
  message: string;
}
