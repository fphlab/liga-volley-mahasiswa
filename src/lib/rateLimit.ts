import { NextRequest } from 'next/server';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

// In-memory sliding window store
const ipHits = new Map<string, number[]>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Memeriksa apakah request dari IP tertentu masih dalam batas rate limit.
 */
export function checkRateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  // Pembersihan berkala memori untuk IP yang sudah tidak aktif
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    const expiry = now - options.windowMs;
    for (const [key, timestamps] of ipHits.entries()) {
      const valid = timestamps.filter(t => t > expiry);
      if (valid.length === 0) {
        ipHits.delete(key);
      } else {
        ipHits.set(key, valid);
      }
    }
  }

  const windowStart = now - options.windowMs;
  const currentHits = (ipHits.get(ip) || []).filter(t => t > windowStart);
  const resetTime = Math.ceil((now + options.windowMs) / 1000);

  if (currentHits.length >= options.limit) {
    const oldest = currentHits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetTime,
      retryAfterSeconds,
    };
  }

  currentHits.push(now);
  ipHits.set(ip, currentHits);

  return {
    allowed: true,
    limit: options.limit,
    remaining: options.limit - currentHits.length,
    resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Ekstrak IP klien secara aman dari request Next.js.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
