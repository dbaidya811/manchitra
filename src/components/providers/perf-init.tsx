"use client";

import { useEffect } from "react";
import { initializePerformanceMonitoring } from "@/lib/performance";

export function PerfInit() {
  useEffect(() => {
    try {
      initializePerformanceMonitoring();
    } catch {
      // noop
    }
  }, []);
  return null;
}
