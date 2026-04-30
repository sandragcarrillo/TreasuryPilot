import "server-only";
import { Redis } from "@upstash/redis";

const SPENT_TTL_SECONDS = 30 * 24 * 60 * 60;

interface ReplayStore {
  isSpent(txHash: string): Promise<boolean>;
  markSpent(txHash: string, meta: SpentMeta): Promise<void>;
}

interface SpentMeta {
  payTo: string;
  amount: string;
  route: string;
  network: string;
}

class UpstashReplayStore implements ReplayStore {
  constructor(private redis: Redis) {}

  async isSpent(txHash: string): Promise<boolean> {
    const v = await this.redis.get(`x402:spent:${txHash.toLowerCase()}`);
    return v !== null;
  }

  async markSpent(txHash: string, meta: SpentMeta): Promise<void> {
    await this.redis.set(`x402:spent:${txHash.toLowerCase()}`, meta, {
      ex: SPENT_TTL_SECONDS,
    });
  }
}

class MemoryReplayStore implements ReplayStore {
  private map = new Map<string, { meta: SpentMeta; expiresAt: number }>();

  async isSpent(txHash: string): Promise<boolean> {
    const key = txHash.toLowerCase();
    const entry = this.map.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  async markSpent(txHash: string, meta: SpentMeta): Promise<void> {
    this.map.set(txHash.toLowerCase(), {
      meta,
      expiresAt: Date.now() + SPENT_TTL_SECONDS * 1000,
    });
  }
}

let instance: ReplayStore | null = null;

export function getReplayStore(): ReplayStore {
  if (instance) return instance;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    instance = new UpstashReplayStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Upstash credentials missing in production. Set KV_REST_API_URL and KV_REST_API_TOKEN."
      );
    }
    console.warn(
      "[replay-store] Upstash not configured — using in-memory store (dev only, NOT safe for production)"
    );
    instance = new MemoryReplayStore();
  }
  return instance;
}
