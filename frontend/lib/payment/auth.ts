"use client";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function generateNonce(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface AuthClaim {
  action: string;
  address: `0x${string}`;
  nonce: string;
  timestamp: number;
}

export interface AuthEnvelope {
  claim: AuthClaim;
  signature: `0x${string}`;
}

function buildMessage(claim: AuthClaim): string {
  return [
    "TreasuryPilot Authorization",
    `Action: ${claim.action}`,
    `Address: ${claim.address}`,
    `Nonce: ${claim.nonce}`,
    `Timestamp: ${claim.timestamp}`,
  ].join("\n");
}

export async function signAuth(args: {
  action: string;
  address: `0x${string}`;
}): Promise<AuthEnvelope> {
  const provider = (typeof window !== "undefined" && window.ethereum) as
    | EthereumProvider
    | undefined;
  if (!provider) throw new Error("No wallet provider");

  const claim: AuthClaim = {
    action: args.action,
    address: args.address,
    nonce: generateNonce(),
    timestamp: Math.floor(Date.now() / 1000),
  };

  const message = buildMessage(claim);
  const signature = (await provider.request({
    method: "personal_sign",
    params: [message, args.address],
  })) as `0x${string}`;

  return { claim, signature };
}
