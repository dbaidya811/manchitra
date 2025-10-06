/**
 * Performance monitoring utilities
 */

/**
 * Measure component render time
 */
export function measurePerformance(name: string, callback: () => void) {
  const start = performance.now();
  callback();
  const end = performance.now();
  
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  
  // Send to analytics if too slow
  if (end - start > 1000) {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'slow_operation',
        properties: {
          operation: name,
          duration: end - start,
        },
      }),
    }).catch(() => {});
  }
}

/**
 * Monitor API response times
 */
export async function monitoredFetch(url: string, options?: RequestInit) {
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const end = performance.now();
    const duration = end - start;
    
    // Log slow API calls
    if (duration > 3000) {
      console.warn(`[Slow API] ${url}: ${duration.toFixed(2)}ms`);
    }
    
    return response;
  } catch (error) {
    const end = performance.now();
    console.error(`[API Error] ${url}: ${(end - start).toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Get page load metrics
 */
export function getPageMetrics() {
  if (typeof window === 'undefined') return null;
  
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (!navigation) return null;
  
  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    load: navigation.loadEventEnd - navigation.loadEventStart,
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

/**
 * Monitor memory usage (if available)
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null;
  
  const memory = (performance as any).memory;
  
  if (!memory) return null;
  
  return {
    usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
  };
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
