"use client";

import { signAuth, type AuthEnvelope } from "./auth";
import { buildBasePaymentHeader } from "./payment-base";
import { buildRskPaymentHeader } from "./payment-rsk";

interface PaymentChallenge {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    [k: string]: unknown;
  }>;
  error?: string;
}

export interface RelayCallOptions {
  action: string;
  address: `0x${string}`;
  data: unknown;
  paid?: boolean;
  preferredChainId?: number;
}

export interface RelayResult {
  ok: true;
  data: Record<string, unknown>;
}

const PATH_BY_ACTION: Record<string, string> = {
  "create-org": "/api/relay/create-org",
  "update-constitution": "/api/relay/update-constitution",
  "set-auto-approve": "/api/relay/set-auto-approve",
  "add-admin": "/api/relay/add-admin",
  "remove-admin": "/api/relay/remove-admin",
  "transfer-ownership": "/api/relay/transfer-ownership",
  "submit-proposal": "/api/relay/submit-proposal",
  "evaluate-proposal": "/api/relay/evaluate-proposal",
  "veto-proposal": "/api/relay/veto-proposal",
  "submit-report": "/api/relay/submit-report",
  "evaluate-report": "/api/relay/evaluate-report",
};

const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  base: 8453,
  "base-sepolia": 84532,
  "rootstock-mainnet": 30,
  "rootstock-testnet": 31,
};

function pickAccept(
  accepts: PaymentChallenge["accepts"],
  preferredChainId?: number
): { idx: number; chainId: number } | null {
  if (preferredChainId) {
    const i = accepts.findIndex(
      (a) => NETWORK_TO_CHAIN_ID[a.network] === preferredChainId
    );
    if (i >= 0) return { idx: i, chainId: preferredChainId };
  }
  // fallback: first accept
  const first = accepts[0];
  if (!first) return null;
  return { idx: 0, chainId: NETWORK_TO_CHAIN_ID[first.network] };
}

async function buildPaymentHeader(args: {
  accept: PaymentChallenge["accepts"][number];
  fromAddress: `0x${string}`;
}): Promise<string> {
  const { accept, fromAddress } = args;
  if (accept.scheme === "exact") {
    return buildBasePaymentHeader({ accept: accept as any, fromAddress });
  }
  if (accept.scheme === "sovereign-rsk") {
    return buildRskPaymentHeader({ accept: accept as any, fromAddress });
  }
  throw new Error(`Unsupported payment scheme: ${accept.scheme}`);
}

export async function relayCall(opts: RelayCallOptions): Promise<RelayResult> {
  const path = PATH_BY_ACTION[opts.action];
  if (!path) throw new Error(`Unknown action: ${opts.action}`);

  const auth: AuthEnvelope = await signAuth({
    action: opts.action,
    address: opts.address,
  });

  const requestBody = JSON.stringify({ auth, data: opts.data });

  // First request — no payment header
  let res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });

  if (res.status === 402 && opts.paid) {
    const challenge = (await res.json()) as PaymentChallenge;
    const picked = pickAccept(challenge.accepts, opts.preferredChainId);
    if (!picked) throw new Error("No supported payment option");
    const accept = challenge.accepts[picked.idx];

    const xPayment = await buildPaymentHeader({
      accept,
      fromAddress: opts.address,
    });

    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment": xPayment,
      },
      body: requestBody,
    });
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof errBody.error === "string" ? errBody.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return { ok: true, data };
}
