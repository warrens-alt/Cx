import { Request, Response, NextFunction } from 'express';
import { serverQueryCache } from './cache';

/**
 * Express middleware to cache GET endpoints by URL and query parameters.
 * Supports TTL override in seconds.
 */
export function cacheResponse(ttlSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}`;
    const cached = serverQueryCache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
        serverQueryCache.set(cacheKey, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}
