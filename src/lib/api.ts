const RAW_BASE = (import.meta.env.VITE_API_BASE ?? '').trim();

/** Empty string means "same origin", which is what local dev and a single-server deploy use. */
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

export const isNativeApp =
  typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform);

if (isNativeApp && !API_BASE) {
  console.warn(
    '[api] This Android build has no VITE_API_BASE configured. The app is served from ' +
      'https://localhost inside the WebView, so sign-in and pandal publishing will not work.'
  );
}

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

export const isGoogleConfigured = GOOGLE_CLIENT_ID.length > 0;

/**
 * Stable GitHub Releases URL for the newest Android build. The release workflow
 * always attaches the asset under this exact name, so the link never goes stale.
 */
export const APK_DOWNLOAD_URL = (import.meta.env.VITE_APK_URL ?? '').trim();

export const isApkAvailable = APK_DOWNLOAD_URL.length > 0;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (isNativeApp && !API_BASE) {
    throw new ApiError(
      'This build has no server address configured. Please reinstall the latest app.',
      0
    );
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {})
      }
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error || `Request failed (${response.status})`,
      response.status,
      payload?.code
    );
  }

  return payload as T;
}