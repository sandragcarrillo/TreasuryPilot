"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

let cached: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cached) return cached;
  cached = createClient({ chain: studionet, endpoint: RPC_URL } as any);
  return cached;
}

/**
 * Wait until the GenLayer tx reaches `ACCEPTED` so a follow-up read returns
 * fresh state. Used after submit-style mutations (create-org, submit-proposal,
 * submit-report, etc.) so the UI reflects the new entity once the modal
 * closes.
 *
 * Caps the wait at `timeoutMs` (default 60s). On timeout we resolve silently
 * — the polling layer will eventually pick up the change.
 */
export async function waitForAcceptedTx(
  hash: string | undefined,
  timeoutMs = 60_000
): Promise<void> {
  if (!hash || typeof hash !== "string") return;
  const client = getClient();
  // The SDK retries internally — give it a sensible upper bound.
  const retries = Math.max(20, Math.floor(timeoutMs / 1500));
  try {
    await Promise.race([
      (client as any).waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        status: TransactionStatus.ACCEPTED,
        retries,
      }),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Swallow — the polling layer will catch up later.
  }
}
