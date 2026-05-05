import "server-only";
import { Redis } from "@upstash/redis";

// Free-retry tokens last 30 days. After that, the user has to pay again.
const RETRY_TTL_SECONDS = 30 * 24 * 60 * 60;

interface RetryStore {
  // Atomically claim the free retry slot for `txHash`. Returns true if the
  // caller is the first to claim (so the retry is free); false if it was
  // already consumed.
  claim(txHash: string): Promise<boolean>;
}

class UpstashRetryStore implements RetryStore {
  constructor(private redis: Redis) {}

  async claim(txHash: string): Promise<boolean> {
    const key = `eval:freeretry:${txHash.toLowerCase()}`;
    // Upstash's `set` with `nx: true` returns null if the key already existed.
    const res = await this.redis.set(key, "1", {
      nx: true,
      ex: RETRY_TTL_SECONDS,
    });
    return res !== null;
  }
}

class MemoryRetryStore implements RetryStore {
  private map = new Map<string, number>();

  async claim(txHash: string): Promise<boolean> {
    const key = txHash.toLowerCase();
    const now = Date.now();
    const expiresAt = this.map.get(key);
    if (expiresAt && expiresAt > now) return false;
    this.map.set(key, now + RETRY_TTL_SECONDS * 1000);
    return true;
  }
}

let instance: RetryStore | null = null;

export function getRetryStore(): RetryStore {
  if (instance) return instance;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    instance = new UpstashRetryStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Upstash credentials missing in production. Set KV_REST_API_URL and KV_REST_API_TOKEN."
      );
    }
    console.warn(
      "[retry-store] Upstash not configured — using in-memory store (dev only)"
    );
    instance = new MemoryRetryStore();
  }
  return instance;
}
