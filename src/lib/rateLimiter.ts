export type RateLimiter = {
  isAllowed: (key: string) => boolean;
};

type Bucket = {
  tokens: number;
  lastRefill: number;
};

type RateLimiterOptions = {
  capacity: number;
  refillPerSecond: number;
};

const clampPositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  const capacity = clampPositive(options.capacity, 60);
  const refillPerSecond = clampPositive(options.refillPerSecond, capacity / 60);
  const buckets = new Map<string, Bucket>();

  const refillBucket = (bucket: Bucket, now: number) => {
    const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
    if (elapsedSeconds === 0) {
      return;
    }
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
    bucket.lastRefill = now;
  };

  return {
    isAllowed: (key: string) => {
      const now = Date.now();
      const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };
      refillBucket(bucket, now);

      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        return false;
      }

      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return true;
    },
  };
};
