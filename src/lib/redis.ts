// Fallback Redis implementation if package not available
let redis: any;

const buildInMemoryRedis = () => {
  console.warn('Upstash Redis not configured. Falling back to in-memory cache.');
  const inMemoryCache = new Map<string, { data: any; expiry: number | null }>();
  return {
    get: async (key: string) => {
      const item = inMemoryCache.get(key);
      if (!item) return null;
      const expired = item.expiry !== null && Date.now() > item.expiry;
      if (expired) {
        inMemoryCache.delete(key);
        return null;
      }
      return item.data;
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
      const expiry = options?.ex ? Date.now() + (options.ex * 1000) : Date.now() + 3600000;
      inMemoryCache.set(key, { data: value, expiry });
    },
    incr: async (key: string) => {
      const current = (await (async () => {
        const item = inMemoryCache.get(key);
        if (!item) return 0;
        const expired = item.expiry !== null && Date.now() > item.expiry;
        if (expired) return 0;
        return item.data || 0;
      })());
      const newValue = current + 1;
      await (async () => {
        const expiry = Date.now() + 3600000;
        inMemoryCache.set(key, { data: newValue, expiry });
      })();
      return newValue;
    },
    expire: async (key: string, seconds: number) => {
      const item = inMemoryCache.get(key);
      if (item) {
        inMemoryCache.set(key, { data: item.data, expiry: Date.now() + seconds * 1000 });
      }
    },
    ttl: async (key: string) => {
      const item = inMemoryCache.get(key);
      if (!item) return -2; // key does not exist
      if (item.expiry === null) return -1; // no expiry
      const diff = Math.ceil((item.expiry - Date.now()) / 1000);
      return diff > 0 ? diff : -2;
    },
    del: async (key: string) => {
      return inMemoryCache.delete(key) ? 1 : 0;
    },
    ping: async () => 'PONG',
    keys: async (pattern: string) => {
      // very basic glob: * wildcard only
      const regex = new RegExp('^' + pattern.replace(/[.+^${}()|\[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      const keys: string[] = [];
      for (const k of inMemoryCache.keys()) {
        if (regex.test(k)) keys.push(k);
      }
      return keys;
    },
    lpush: async (key: string, value: any) => {
      const item = inMemoryCache.get(key);
      const arr = Array.isArray(item?.data) ? item!.data as any[] : [];
      arr.unshift(value);
      const expiry = item?.expiry ?? (Date.now() + 120000);
      inMemoryCache.set(key, { data: arr, expiry });
      return arr.length;
    },
    ltrim: async (key: string, start: number, end: number) => {
      const item = inMemoryCache.get(key);
      if (!item || !Array.isArray(item.data)) return;
      const arr = item.data as any[];
      const to = end === -1 ? arr.length - 1 : end;
      const sliced = arr.slice(start, to + 1);
      inMemoryCache.set(key, { data: sliced, expiry: item.expiry });
    },
    lrange: async (key: string, start: number, end: number) => {
      const item = inMemoryCache.get(key);
      if (!item || !Array.isArray(item.data)) return [] as any[];
      const arr = item.data as any[];
      const to = end === -1 ? arr.length - 1 : end;
      return arr.slice(start, to + 1);
    },
    multi: () => {
      const chain: any = {
        incr: (_k: string) => chain,
        pexpire: (_k: string, _ms: number) => chain,
        exec: async () => ([] as any[]),
      };
      return chain;
    },
  };
};

try {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) {
    redis = buildInMemoryRedis();
  } else {
    const { Redis: UpstashRedis } = require('@upstash/redis');
    redis = new UpstashRedis({ url, token });
  }
} catch (error) {
  redis = buildInMemoryRedis();
}

export { redis };

// Cache configuration for 100k users
const CACHE_TTL = {
  PLACES: 300,      // 5 minutes
  USER_DATA: 600,   // 10 minutes
  ROUTE_DATA: 180,  // 3 minutes
  ANALYTICS: 3600,  // 1 hour
};

export class CacheManager {
  // Places cache with user-specific filtering
  static async getPlacesCache(userEmail?: string, limit: number = 500): Promise<any[] | null> {
    try {
      const cacheKey = userEmail ? `places:${userEmail}:${limit}` : `places:public:${limit}`;
      const cached = await redis.get(cacheKey);
      return cached;
    } catch (error) {
      console.error('Redis cache error:', error);
      return null;
    }
  }

  static async setPlacesCache(places: any[], userEmail?: string, limit: number = 500): Promise<void> {
    try {
      const cacheKey = userEmail ? `places:${userEmail}:${limit}` : `places:public:${limit}`;
      await redis.set(cacheKey, places, { ex: 300 }); // 5 minutes
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // User session cache
  static async getUserCache(email: string): Promise<any | null> {
    try {
      const cached = await redis.get(`user:${email}`);
      return cached;
    } catch (error) {
      console.error('Redis user cache error:', error);
      return null;
    }
  }

  static async setUserCache(email: string, userData: any): Promise<void> {
    try {
      await redis.set(`user:${email}`, userData, { ex: 600 }); // 10 minutes
    } catch (error) {
      console.error('Redis user set error:', error);
    }
  }

  // Route cache
  static async getRouteCache(from: string, to: string): Promise<any | null> {
    try {
      const cacheKey = `route:${from}:${to}`;
      const cached = await redis.get(cacheKey);
      return cached;
    } catch (error) {
      console.error('Redis route cache error:', error);
      return null;
    }
  }

  static async setRouteCache(from: string, to: string, routeData: any): Promise<void> {
    try {
      const cacheKey = `route:${from}:${to}`;
      await redis.set(cacheKey, routeData, { ex: 180 }); // 3 minutes
    } catch (error) {
      console.error('Redis route set error:', error);
    }
  }

  // Rate limiting for 100k users
  static async checkRateLimit(identifier: string, limit: number = 1000, windowMs: number = 1000): Promise<boolean> {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await redis.get(key) || 0;

      if (current >= limit) {
        return false;
      }

      // Increment counter with expiry
      await redis.multi()
        .incr(key)
        .pexpire(key, windowMs)
        .exec();

      return true;
    } catch (error) {
      console.error('Rate limit error:', error);
      return true; // Fail open for rate limiting
    }
  }

  // Analytics cache
  static async incrementAnalytics(key: string): Promise<void> {
    try {
      await redis.incr(key);
      await redis.expire(key, 3600); // 1 hour
    } catch (error) {
      console.error('Analytics increment error:', error);
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Clear user cache on logout
  static async clearUserCache(email: string): Promise<void> {
    try {
      await redis.del(`user:${email}`);
    } catch (error) {
      console.error('Clear cache error:', error);
    }
  }
}
