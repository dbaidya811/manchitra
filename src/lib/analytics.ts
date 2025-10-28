import { redis } from './redis';

export class AnalyticsTracker {
  // Track active users
  static async trackUserActivity(userEmail: string): Promise<void> {
    try {
      const userKey = `user:activity:${userEmail}`;
      await redis.set(userKey, Date.now(), { ex: 300 }); // 5 minutes

      // Update concurrent users count
      await this.updateConcurrentUsers();
    } catch (error) {
      console.error('User activity tracking error:', error);
    }
  }

  // Update concurrent users count
  static async updateConcurrentUsers(): Promise<void> {
    try {
      const pattern = 'user:activity:*';
      const keys = await redis.keys(pattern);
      const concurrentUsers = keys.length;

      await redis.set('analytics:concurrent_users', concurrentUsers.toString(), { ex: 60 });
    } catch (error) {
      console.error('Concurrent users update error:', error);
    }
  }

  // Track API requests per second
  static async trackRequest(endpoint: string, responseTime: number): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000); // Current second
      const requestKey = `requests:${timestamp}`;
      const responseTimeKey = `response_times:${timestamp}`;

      // Increment request count
      await redis.incr(requestKey);
      await redis.expire(requestKey, 120); // Keep for 2 minutes

      // Track response time
      await redis.lpush(responseTimeKey, responseTime.toString());
      await redis.ltrim(responseTimeKey, 0, 99); // Keep last 100 response times
      await redis.expire(responseTimeKey, 120);

      // Update RPS
      await this.updateRequestsPerSecond();
      await this.updateAverageResponseTime();
    } catch (error) {
      console.error('Request tracking error:', error);
    }
  }

  // Update requests per second
  static async updateRequestsPerSecond(): Promise<void> {
    try {
      const currentSecond = Math.floor(Date.now() / 1000);
      const requestKey = `requests:${currentSecond}`;
      const count = await redis.get(requestKey) || 0;

      await redis.set('analytics:rps', count.toString(), { ex: 60 });
    } catch (error) {
      console.error('RPS update error:', error);
    }
  }

  // Update average response time
  static async updateAverageResponseTime(): Promise<void> {
    try {
      const currentSecond = Math.floor(Date.now() / 1000);
      const responseTimeKey = `response_times:${currentSecond}`;
      const responseTimes = await redis.lrange(responseTimeKey, 0, -1);

      if (responseTimes.length > 0) {
        const totalTime = responseTimes.reduce((sum: number, time: string) => sum + parseInt(time), 0);
        const averageTime = Math.round(totalTime / responseTimes.length);

        await redis.set('analytics:avg_response_time', averageTime.toString(), { ex: 60 });
      }
    } catch (error) {
      console.error('Average response time update error:', error);
    }
  }

  // Track errors
  static async trackError(errorType: string, endpoint: string): Promise<void> {
    try {
      const errorKey = `errors:${errorType}:${endpoint}`;
      await redis.incr(errorKey);
      await redis.expire(errorKey, 3600); // 1 hour

      // Update error rate
      await this.updateErrorRate();
    } catch (error) {
      console.error('Error tracking error:', error);
    }
  }

  // Update error rate
  static async updateErrorRate(): Promise<void> {
    try {
      const currentSecond = Math.floor(Date.now() / 1000);
      const requestKey = `requests:${currentSecond}`;
      const totalRequests = await redis.get(requestKey) || 0;

      // Count total errors in last hour
      const pattern = 'errors:*:*';
      const errorKeys = await redis.keys(pattern);
      let totalErrors = 0;

      for (const key of errorKeys) {
        const errorCount = await redis.get(key) || 0;
        totalErrors += parseInt(errorCount as string);
      }

      if (totalRequests > 0) {
        const errorRate = Math.round((totalErrors / parseInt(totalRequests as string)) * 100);
        await redis.set('analytics:error_rate', errorRate.toString(), { ex: 60 });
      }
    } catch (error) {
      console.error('Error rate update error:', error);
    }
  }

  // Clean up old analytics data
  static async cleanupAnalytics(): Promise<void> {
    try {
      // Clean up data older than 1 hour
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

      // Clean up request data
      const requestKeys = await redis.keys('requests:*');
      for (const key of requestKeys) {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp < oneHourAgo) {
          await redis.del(key);
        }
      }

      // Clean up response time data
      const responseKeys = await redis.keys('response_times:*');
      for (const key of responseKeys) {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp < oneHourAgo) {
          await redis.del(key);
        }
      }

      // Clean up user activity data
      const userKeys = await redis.keys('user:activity:*');
      for (const key of userKeys) {
        const expiry = await redis.ttl(key);
        if (expiry === -1) { // No expiry set
          await redis.expire(key, 300); // Set 5 minutes expiry
        }
      }
    } catch (error) {
      console.error('Analytics cleanup error:', error);
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(() => {
  AnalyticsTracker.cleanupAnalytics();
}, 10 * 60 * 1000);
