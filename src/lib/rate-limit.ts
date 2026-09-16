// Simple in-memory sliding-window limiter for a single Node process.
// Good enough to slow down credential-stuffing / brute-force attempts
// against a small shop's login and register forms; a production
// multi-instance deployment should move this to Redis or similar.

const buckets = new Map<string, { count: number; resetAt: number }>();

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (Math.random() < 0.01) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
