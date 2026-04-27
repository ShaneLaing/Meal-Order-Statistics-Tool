import { APP_SCRIPT_WEB_APP_URL, isCloudConfigured } from '../config';
import type { ApiResponse } from '../types';

export class ApiError extends Error {
  code?: string;
  deadline?: string | null;
  constructor(message: string, opts?: { code?: string; deadline?: string | null }) {
    super(message);
    this.name = 'ApiError';
    this.code = opts?.code;
    this.deadline = opts?.deadline ?? null;
  }
}

export class CloudNotConfiguredError extends ApiError {
  constructor() {
    super('Cloud backend not configured', { code: 'NO_CLOUD' });
    this.name = 'CloudNotConfiguredError';
  }
}

function ensureCloud(): void {
  if (!isCloudConfigured) throw new CloudNotConfiguredError();
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length ? `?${entries.join('&')}` : '';
}

async function parseResponse<T extends ApiResponse>(res: Response): Promise<T> {
  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    throw new ApiError(`Invalid JSON response (HTTP ${res.status})`);
  }
  if (!body || body.success === false) {
    throw new ApiError(body?.error || 'Unknown backend error', {
      code: body?.error,
      deadline: body?.deadline ?? null,
    });
  }
  return body;
}

export async function apiGet<T extends ApiResponse>(
  params: Record<string, string | number | undefined>
): Promise<T> {
  ensureCloud();
  const url = APP_SCRIPT_WEB_APP_URL + buildQuery(params);
  const res = await fetch(url);
  return parseResponse<T>(res);
}

export async function apiPost<T extends ApiResponse>(body: unknown): Promise<T> {
  ensureCloud();
  const res = await fetch(APP_SCRIPT_WEB_APP_URL, {
    method: 'POST',
    // text/plain 避免 Apps Script 觸發 CORS preflight
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}
