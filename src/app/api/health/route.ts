import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { CacheManager, redis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: { status: false, responseTime: 0 },
      cache: { status: false, responseTime: 0 },
      memory: { status: true, usage: 0, limit: 512 },
    },
    metrics: {
      concurrentUsers: 0,
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
    }
  };

  const startTime = Date.now();

  try {
    // Check database connectivity with response time
    const dbStartTime = Date.now();
    const db = await getDb();
    await db.admin().ping();
    const dbEndTime = Date.now();

    healthCheck.services.database.status = true;
    healthCheck.services.database.responseTime = dbEndTime - dbStartTime;
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.services.database.status = false;
    console.error('Database health check failed:', error);
  }

  try {
    // Check Redis connectivity with response time
    const cacheStartTime = Date.now();
    await CacheManager.healthCheck();
    const cacheEndTime = Date.now();

    healthCheck.services.cache.status = true;
    healthCheck.services.cache.responseTime = cacheEndTime - cacheStartTime;
  } catch (error) {
    healthCheck.status = healthCheck.status === 'error' ? 'error' : 'warning';
    healthCheck.services.cache.status = false;
    console.error('Cache health check failed:', error);
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryMB = memUsage.heapUsed / 1024 / 1024;
  healthCheck.services.memory.usage = Math.round(memoryMB);

  if (memoryMB > 400) { // Warning at 400MB
    healthCheck.services.memory.status = false;
    healthCheck.status = healthCheck.status === 'error' ? 'error' : 'warning';
  }

  // Get real-time metrics from cache
  try {
    const concurrentUsers = await redis.get('analytics:concurrent_users') || 0;
    const requestsPerSecond = await redis.get('analytics:rps') || 0;
    const avgResponseTime = await redis.get('analytics:avg_response_time') || 0;

    healthCheck.metrics.concurrentUsers = parseInt(concurrentUsers as string) || 0;
    healthCheck.metrics.requestsPerSecond = parseInt(requestsPerSecond as string) || 0;
    healthCheck.metrics.averageResponseTime = parseInt(avgResponseTime as string) || 0;
  } catch (error) {
    console.error('Metrics fetch error:', error);
  }

  const totalResponseTime = Date.now() - startTime;
  const statusCode = healthCheck.status === 'ok' ? 200 : (healthCheck.status === 'warning' ? 200 : 503);

  return NextResponse.json(healthCheck, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'X-Response-Time': totalResponseTime.toString()
    }
  });
}
