import { AnalyticsTracker } from './analytics';

/**
 * Enhanced Performance monitoring utilities for 100k concurrent users
 */
export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();

  static startTiming(label: string): void {
    this.metrics.set(label, {
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      label
    });
  }

  static endTiming(label: string): number {
    const metric = this.metrics.get(label);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      this.metrics.set(label, metric);

      // Track slow operations (>100ms)
      if (metric.duration > 100) {
        console.warn(`🐌 Slow operation detected: ${label} took ${metric.duration.toFixed(2)}ms`);
        // Send to analytics
        AnalyticsTracker.trackError('slow_operation', label).catch(() => {});
      }

      return metric.duration;
    }
    return 0;
  }

  static getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }

  static async trackApiCall(endpoint: string, method: string): Promise<void> {
    const startTime = performance.now();
    const metricKey = `${method.toUpperCase()} ${endpoint}`;

    this.startTiming(metricKey);

    try {
      // Track successful API call
      const duration = this.endTiming(metricKey);
      await AnalyticsTracker.trackRequest(endpoint, duration);

      console.log(`✅ API Call: ${metricKey} - ${duration.toFixed(2)}ms`);
    } catch (error) {
      const duration = this.endTiming(metricKey);
      await AnalyticsTracker.trackError('api_error', endpoint);

      console.error(`❌ API Error: ${metricKey} - ${duration.toFixed(2)}ms`, error);
    }
  }
}

/**
 * Web Vitals monitoring for Core Web Vitals
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    const lcp = lastEntry.startTime;

    if (lcp > 2500) {
      console.warn('🐌 LCP is slow:', lcp);
      AnalyticsTracker.trackError('slow_lcp', 'page_load').catch(() => {});
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      const fid = (entry as any).processingStart - entry.startTime;
      if (fid > 100) {
        console.warn('🐌 FID is slow:', fid);
        AnalyticsTracker.trackError('slow_fid', 'page_interaction').catch(() => {});
      }
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  new PerformanceObserver((list) => {
    let clsValue = 0;
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }

    if (clsValue > 0.1) {
      console.warn('🐌 CLS is poor:', clsValue);
      AnalyticsTracker.trackError('poor_cls', 'page_layout').catch(() => {});
    }
  }).observe({ entryTypes: ['layout-shift'] });
}

/**
 * Memory usage monitoring for 100k users
 */
export function monitorMemoryUsage() {
  if (typeof window === 'undefined') return;

  const logMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1048576;
      const totalMB = memory.totalJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;

      // Warn if using more than 50MB
      if (usedMB > 50) {
        console.warn('🐌 High memory usage:', {
          used: `${usedMB.toFixed(2)}MB`,
          total: `${totalMB.toFixed(2)}MB`,
          limit: `${limitMB.toFixed(2)}MB`
        });

        AnalyticsTracker.trackError('high_memory', 'memory_usage').catch(() => {});
      }
    }
  };

  // Log memory usage every 30 seconds
  setInterval(logMemoryUsage, 30000);
}

/**
 * Network performance monitoring
 */
export function monitorNetworkPerformance() {
  if (typeof window === 'undefined') return;

  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;

      // Monitor slow resources (>1s)
      if (resourceEntry.duration > 1000) {
        console.warn('🐌 Slow resource:', {
          name: resourceEntry.name,
          duration: `${resourceEntry.duration.toFixed(2)}ms`,
          size: `${(resourceEntry.transferSize / 1024).toFixed(2)}KB`
        });

        AnalyticsTracker.trackError('slow_resource', resourceEntry.name).catch(() => {});
      }
    });
  }).observe({ entryTypes: ['resource'] });
}

interface PerformanceMetric {
  label: string;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Bundle analyzer for development
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Bundle Analysis:');

    // Analyze main chunks
    if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
      const buildManifest = (window as any).__NEXT_DATA__.buildManifest;
      if (buildManifest) {
        Object.keys(buildManifest).forEach(chunk => {
          console.log(`  ${chunk}:`, buildManifest[chunk]);
        });
      }
    }
  }
}

/**
 * Performance budget checker
 */
export function checkPerformanceBudget() {
  const budgets = {
    maxBundleSize: 500 * 1024, // 500KB
    maxImageSize: 100 * 1024,  // 100KB per image
    maxFontSize: 50 * 1024,    // 50KB total fonts
    maxCSSSize: 100 * 1024,    // 100KB CSS
  };

  if (typeof window === 'undefined') return;

  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;

      // Check bundle size budget
      if (resourceEntry.name.includes('.js') && resourceEntry.transferSize > budgets.maxBundleSize) {
        console.warn('📦 Bundle size exceeded:', {
          file: resourceEntry.name,
          size: `${(resourceEntry.transferSize / 1024).toFixed(2)}KB`,
          budget: `${(budgets.maxBundleSize / 1024).toFixed(2)}KB`
        });
      }

      // Check image size budget
      if (resourceEntry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) &&
          resourceEntry.transferSize > budgets.maxImageSize) {
        console.warn('🖼️ Image size exceeded:', {
          image: resourceEntry.name,
          size: `${(resourceEntry.transferSize / 1024).toFixed(2)}KB`,
          budget: `${(budgets.maxImageSize / 1024).toFixed(2)}KB`
        });
      }
    });
  }).observe({ entryTypes: ['resource'] });
}

/**
 * Initialize all performance monitoring
 */
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Start all monitoring systems
  trackWebVitals();
  monitorMemoryUsage();
  monitorNetworkPerformance();
  checkPerformanceBudget();

  console.log('🚀 Performance monitoring initialized');
}
