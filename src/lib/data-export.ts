/**
 * Data export and backup utilities
 */

/**
 * Export user data as JSON
 */
export function exportUserData(): string {
  const data = {
    visitHistory: localStorage.getItem('visit-history'),
    searchHistory: localStorage.getItem('search-history'),
    seenPlaces: localStorage.getItem('seen-places'),
    user: localStorage.getItem('user'),
    exportDate: new Date().toISOString(),
    version: '1.0',
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Download data as file
 */
export function downloadData(filename: string = 'manchitra-backup.json') {
  const data = exportUserData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import user data from JSON
 */
export function importUserData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.visitHistory) {
      localStorage.setItem('visit-history', data.visitHistory);
    }
    if (data.searchHistory) {
      localStorage.setItem('search-history', data.searchHistory);
    }
    if (data.seenPlaces) {
      localStorage.setItem('seen-places', data.seenPlaces);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

/**
 * Auto-backup to cloud (if user is logged in)
 */
export async function backupToCloud(userEmail: string) {
  try {
    const data = exportUserData();
    
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        data,
        timestamp: Date.now(),
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Cloud backup failed:', error);
    return false;
  }
}

/**
 * Restore from cloud backup
 */
export async function restoreFromCloud(userEmail: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/backup?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) return false;
    
    const { data } = await response.json();
    return importUserData(data);
  } catch (error) {
    console.error('Cloud restore failed:', error);
    return false;
  }
}
