"use client";

import { encodeBase64 } from "./util";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface BaseAccept {
  scheme: "exact";
  network: string;
  asset: `0x${string}`;
  maxAmountRequired: string;
  payTo: `0x${string}`;
  maxTimeoutSeconds: number;
  extra?: { name?: string; version?: string };
}

const BASE_CHAIN_IDS: Record<string, number> = {
  base: 8453,
  "base-sepolia": 84532,
};

function toHex(n: bigint | number): string {
  return "0x" + (typeof n === "bigint" ? n.toString(16) : n.toString(16));
}

function randomNonceBytes32(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ("0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
}

export async function buildBasePaymentHeader(args: {
  accept: BaseAccept;
  fromAddress: `0x${string}`;
}): Promise<string> {
  const provider = (typeof window !== "undefined" && window.ethereum) as
    | EthereumProvider
    | undefined;
  if (!provider) throw new Error("No wallet provider");

  const chainId = BASE_CHAIN_IDS[args.accept.network];
  if (!chainId) throw new Error(`Unknown Base network: ${args.accept.network}`);

  const currentChainHex = (await provider.request({ method: "eth_chainId" })) as string;
  if (parseInt(currentChainHex, 16) !== chainId) {
    throw new Error(
      `Wallet on chain ${currentChainHex} but payment requires ${args.accept.network}`
    );
  }

  const now = Math.floor(Date.now() / 1000);
  // Generous window: 60s past (clock skew) → 5min future (signing UX + facilitator latency).
  const validAfter = (now - 60).toString();
  const validBefore = (now + 300).toString();
  const nonce = randomNonceBytes32();

  const domain = {
    name: args.accept.extra?.name || "USD Coin",
    version: args.accept.extra?.version || "2",
    chainId,
    verifyingContract: args.accept.asset,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: args.fromAddress,
    to: args.accept.payTo,
    value: args.accept.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  };

  const typedData = {
    domain,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...types,
    },
    primaryType: "TransferWithAuthorization",
    message,
  };

  const signature = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [args.fromAddress, JSON.stringify(typedData)],
  })) as `0x${string}`;

  const payload = {
    x402Version: 1,
    scheme: "exact",
    network: args.accept.network,
    payload: {
      signature,
      authorization: {
        from: args.fromAddress,
        to: args.accept.payTo,
        value: args.accept.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      },
    },
  };

  return encodeBase64(JSON.stringify(payload));
}

export type { BaseAccept };
