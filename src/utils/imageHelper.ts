/**
 * Safe Image Helper for Manchitra
 * Ensures all local and remote images resolve correctly in root and GitHub Pages subpaths.
 * Replaces any broken third-party icon URLs (like Flaticon) with guaranteed local assets.
 */

export const FALLBACK_PANDAL_IMAGE = './logo.png';

export function getSafeImageUrl(imgUrl?: string): string {
  if (!imgUrl || typeof imgUrl !== 'string') {
    return FALLBACK_PANDAL_IMAGE;
  }

  const trimmed = imgUrl.trim();

  // Map navigation arrow icon to local public asset
  if (trimmed.includes('10324799') || trimmed.includes('nav-arrow')) {
    return './nav-arrow.png';
  }

  // If pointing to flaticon pandal icons (which blocks browsers with 403 Forbidden)
  if (trimmed.includes('flaticon.com') || trimmed.includes('14025686')) {
    return FALLBACK_PANDAL_IMAGE;
  }

  // Full external URL or data URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Local image path
  const cleanPath = trimmed.replace(/^\/+/, '');
  return `./${cleanPath}`;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  target.onerror = null;
  if (!target.src.includes('logo.png')) {
    target.src = FALLBACK_PANDAL_IMAGE;
  }
}

