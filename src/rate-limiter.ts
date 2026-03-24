// Simple in-memory rate limiter per user per skill
// Sliding window counter approach

interface RateWindow {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private windows = new Map<string, RateWindow>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 60, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  // Returns true if request is allowed, false if rate limited
  check(userId: string, skillId: string): boolean {
    const key = `${userId}:${skillId}`;
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || now - window.windowStart >= this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (window.count >= this.maxRequests) {
      return false;
    }

    window.count++;
    return true;
  }

  // Get remaining requests in current window
  remaining(userId: string, skillId: string): number {
    const key = `${userId}:${skillId}`;
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || now - window.windowStart >= this.windowMs) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - window.count);
  }

  reset(): void {
    this.windows.clear();
  }
}

export const rateLimiter = new RateLimiter();
