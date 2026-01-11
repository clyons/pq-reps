export type RateLimiter = {
  isAllowed: (key: string) => boolean;
};

type Bucket = {
  tokens: number;
  lastRefill: number;
  lastSeen: number;
};

type RateLimiterOptions = {
  capacity: number;
  refillPerSecond: number;
  bucketTtlMs?: number;
  cleanupIntervalMs?: number;
  maxBuckets?: number;
};

const clampPositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;
const clampNonNegative = (value: number, fallback: number) =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  const capacity = clampPositive(options.capacity, 60);
  const refillPerSecond = clampPositive(options.refillPerSecond, capacity / 60);
  const bucketTtlMs = clampNonNegative(options.bucketTtlMs ?? 10 * 60 * 1000, 10 * 60 * 1000);
  const cleanupIntervalMs = clampNonNegative(options.cleanupIntervalMs ?? 60 * 1000, 60 * 1000);
  const maxBuckets = clampNonNegative(options.maxBuckets ?? 0, 0);
  const buckets = new Map<string, Bucket>();
  let lastCleanup = 0;

  const refillBucket = (bucket: Bucket, now: number) => {
    const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
    if (elapsedSeconds === 0) {
      return;
    }
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
    bucket.lastRefill = now;
  };

  const cleanupBuckets = (now: number) => {
    if (bucketTtlMs === 0 || cleanupIntervalMs === 0) {
      return;
    }
    if (now - lastCleanup < cleanupIntervalMs) {
      return;
    }
    lastCleanup = now;
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastSeen > bucketTtlMs) {
        buckets.delete(key);
      }
    }
  };

  const touchBucket = (key: string, bucket: Bucket, now: number) => {
    bucket.lastSeen = now;
    buckets.delete(key);
    buckets.set(key, bucket);
  };

  const enforceMaxBuckets = () => {
    if (maxBuckets === 0) {
      return;
    }
    while (buckets.size > maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (!oldestKey) {
        return;
      }
      buckets.delete(oldestKey);
    }
  };

  return {
    isAllowed: (key: string) => {
      const now = Date.now();
      cleanupBuckets(now);
      const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now, lastSeen: now };
      refillBucket(bucket, now);
      bucket.lastSeen = now;

      if (bucket.tokens < 1) {
        touchBucket(key, bucket, now);
        enforceMaxBuckets();
        return false;
      }

      bucket.tokens -= 1;
      touchBucket(key, bucket, now);
      enforceMaxBuckets();
      return true;
    },
  };
};
