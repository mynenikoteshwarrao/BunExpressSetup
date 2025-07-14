import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class InMemoryStore {
  private store: Map<string, RateLimitInfo> = new Map();

  incr(key: string, windowMs: number): { totalHits: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const current = this.store.get(key);
    
    if (!current || current.resetTime <= now) {
      // Reset or create new entry
      this.store.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime };
    }
    
    // Increment existing entry
    current.count++;
    this.store.set(key, current);
    
    return { totalHits: current.count, resetTime: current.resetTime };
  }

  decrement(key: string): void {
    const current = this.store.get(key);
    if (current && current.count > 0) {
      current.count--;
      this.store.set(key, current);
    }
  }

  resetKey(key: string): void {
    this.store.delete(key);
  }
}

const store = new InMemoryStore();

export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    
    const { totalHits, resetTime } = store.incr(key, windowMs);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - totalHits).toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    });

    if (totalHits > max) {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
      return;
    }

    // Handle response for decrementing on success/failure
    const originalSend = res.send;
    res.send = function(body) {
      const statusCode = res.statusCode;
      
      if (
        (skipSuccessfulRequests && statusCode < 400) ||
        (skipFailedRequests && statusCode >= 400)
      ) {
        store.decrement(key);
      }
      
      return originalSend.call(this, body);
    };

    next();
  };
};

export default rateLimit;