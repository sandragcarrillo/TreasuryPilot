"use client";

import { encodeBase64 } from "./util";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface RskAccept {
  scheme: "sovereign-rsk";
  network: string;
  asset: "rBTC";
  maxAmountRequired: string;
  payTo: string;
  extra: {
    chainId: number;
    decimals: number;
    confirmations: number;
    quoteValidUntil: number;
    quotedUsd: number;
    btcUsd: number;
  };
}

function toHexBigInt(n: bigint): string {
  return "0x" + n.toString(16);
}

function toHexInt(n: number): string {
  return "0x" + n.toString(16);
}

export async function buildRskPaymentHeader(args: {
  accept: RskAccept;
  fromAddress: `0x${string}`;
}): Promise<string> {
  const provider = (typeof window !== "undefined" && window.ethereum) as
    | EthereumProvider
    | undefined;
  if (!provider) throw new Error("No wallet provider");

  const expectedChainId = toHexInt(args.accept.extra.chainId);
  const currentChainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (currentChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
    throw new Error(
      `Wallet is on chain ${currentChainId}, expected ${expectedChainId} (${args.accept.network})`
    );
  }

  const valueWei = BigInt(args.accept.maxAmountRequired);

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.fromAddress,
        to: args.accept.payTo,
        value: toHexBigInt(valueWei),
      },
    ],
  })) as `0x${string}`;

  const payload = {
    scheme: "sovereign-rsk",
    network: args.accept.network,
    txHash,
  };

  return encodeBase64(JSON.stringify(payload));
}
