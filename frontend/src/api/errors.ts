import type { AxiosError } from 'axios';

/**
 * Extract a user-friendly error message from an Axios error or unknown throw.
 * Falls back to `fallback` when no server-provided message is available.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ detail?: string | Array<{ msg: string }> }>;
  const detail = axiosErr?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (Array.isArray(detail) && detail.length > 0) return detail[0].msg;
  return fallback;
}
