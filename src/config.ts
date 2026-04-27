// Runtime configuration. Reads Vite-injected env vars at build time.
// Set VITE_APP_SCRIPT_WEB_APP_URL in .env.local before `pnpm dev`.

export const APP_SCRIPT_WEB_APP_URL: string =
  (import.meta.env.VITE_APP_SCRIPT_WEB_APP_URL as string | undefined) ?? '';

export const isCloudConfigured: boolean =
  Boolean(APP_SCRIPT_WEB_APP_URL) &&
  !APP_SCRIPT_WEB_APP_URL.includes('YOUR_APP_SCRIPT');

// 菜單自動刷新節奏：60 秒一次，再加 window focus 觸發
export const MENU_REFRESH_INTERVAL_MS = 60_000;

// Deadline 倒數每秒 tick
export const DEADLINE_TICK_MS = 1_000;
