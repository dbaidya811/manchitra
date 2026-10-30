/** Official deployed Render backend URL for Manchitra */
export const RENDER_BACKEND_URL = 'https://manchitra-d0sd.onrender.com';

const RAW_ENV_BASE = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  RENDER_BACKEND_URL
).trim();

export function getCustomBackendUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('manchitra_backend_url');
      if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
    } catch {
      // ignore
    }
  }
  return '';
}

export function setCustomBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (url && url.trim()) {
        localStorage.setItem('manchitra_backend_url', url.trim());
      } else {
        localStorage.removeItem('manchitra_backend_url');
      }
    } catch {
      // ignore
    }
  }
}

export function getApiBase(): string {
  const custom = getCustomBackendUrl();
  if (custom) return custom;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '';
  }
  if (RAW_ENV_BASE) return RAW_ENV_BASE.replace(/\/+$/, '');
  return RENDER_BACKEND_URL;
}

/** Base API URL. Connected to deployed Render backend. */
export const API_BASE = getApiBase();

export const isNativeApp =
  typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform);

if (isNativeApp && !getApiBase()) {
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
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
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