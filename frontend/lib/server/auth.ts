import "server-only";
import { verifyMessage, isAddress, getAddress } from "viem";
import { Redis } from "@upstash/redis";

const NONCE_TTL_SECONDS = 5 * 60;
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

export interface AuthClaim {
  action: string;
  address: `0x${string}`;
  nonce: string;
  timestamp: number;
}

interface NonceStore {
  isUsed(nonce: string): Promise<boolean>;
  markUsed(nonce: string, address: string, action: string): Promise<void>;
}

class UpstashNonceStore implements NonceStore {
  constructor(private redis: Redis) {}

  async isUsed(nonce: string): Promise<boolean> {
    return (await this.redis.get(`tp:auth:nonce:${nonce}`)) !== null;
  }

  async markUsed(nonce: string, address: string, action: string): Promise<void> {
    await this.redis.set(
      `tp:auth:nonce:${nonce}`,
      { address, action, used_at: new Date().toISOString() },
      { ex: NONCE_TTL_SECONDS }
    );
  }
}

class MemoryNonceStore implements NonceStore {
  private map = new Map<string, number>();
  async isUsed(nonce: string): Promise<boolean> {
    const exp = this.map.get(nonce);
    if (!exp) return false;
    if (exp < Date.now()) {
      this.map.delete(nonce);
      return false;
    }
    return true;
  }
  async markUsed(nonce: string): Promise<void> {
    this.map.set(nonce, Date.now() + NONCE_TTL_SECONDS * 1000);
  }
}

let nonceStore: NonceStore | null = null;
function getNonceStore(): NonceStore {
  if (nonceStore) return nonceStore;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    nonceStore = new UpstashNonceStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Upstash credentials missing in production");
    }
    nonceStore = new MemoryNonceStore();
  }
  return nonceStore;
}

export function buildAuthMessage(claim: AuthClaim): string {
  return [
    "Axiom Pilot Authorization",
    `Action: ${claim.action}`,
    `Address: ${claim.address}`,
    `Nonce: ${claim.nonce}`,
    `Timestamp: ${claim.timestamp}`,
  ].join("\n");
}

export interface VerifiedAuth {
  actorAddress: `0x${string}`;
  action: string;
  nonce: string;
}

export async function verifyAuth(args: {
  expectedAction: string;
  claim: AuthClaim;
  signature: `0x${string}`;
}): Promise<{ ok: true; data: VerifiedAuth } | { ok: false; code: string; message: string }> {
  const { claim, signature, expectedAction } = args;

  if (claim.action !== expectedAction) {
    return { ok: false, code: "action_mismatch", message: `Action ${claim.action} ≠ ${expectedAction}` };
  }
  if (!isAddress(claim.address)) {
    return { ok: false, code: "invalid_address", message: "Claimed address is not a valid EVM address" };
  }
  if (typeof claim.timestamp !== "number" || !Number.isFinite(claim.timestamp)) {
    return { ok: false, code: "invalid_timestamp", message: "Timestamp must be a finite number" };
  }

  const now = Math.floor(Date.now() / 1000);
  const skew = Math.abs(now - claim.timestamp);
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
    return { ok: false, code: "timestamp_skew", message: `Timestamp out of window (${skew}s skew)` };
  }

  if (typeof claim.nonce !== "string" || claim.nonce.length < 8) {
    return { ok: false, code: "invalid_nonce", message: "Nonce missing or too short" };
  }

  const store = getNonceStore();
  if (await store.isUsed(claim.nonce)) {
    return { ok: false, code: "nonce_replay", message: "Nonce already used" };
  }

  const message = buildAuthMessage(claim);
  let valid: boolean;
  try {
    valid = await verifyMessage({
      address: claim.address,
      message,
      signature,
    });
  } catch (err) {
    console.error("[auth] verifyMessage threw", err);
    return { ok: false, code: "signature_invalid", message: "Could not verify signature" };
  }

  if (!valid) {
    return { ok: false, code: "signature_invalid", message: "Signature does not match claimed address" };
  }

  return {
    ok: true,
    data: {
      actorAddress: getAddress(claim.address),
      action: claim.action,
      nonce: claim.nonce,
    },
  };
}

export async function markAuthConsumed(
  nonce: string,
  address: string,
  action: string
): Promise<void> {
  await getNonceStore().markUsed(nonce, address, action);
}
