import "server-only";

export type NetworkMode = "testnet" | "mainnet";

export const NETWORK_MODE: NetworkMode =
  (process.env.NEXT_PUBLIC_X402_NETWORK as NetworkMode) || "testnet";

// Defer the missing-env error to first use rather than module import time.
// Next.js evaluates route modules during the build's "Collecting page data"
// phase; throwing at the top level would crash the build when env vars
// aren't yet set (e.g. fresh Vercel deploy before vars are configured).
export function getProjectPaymentAddress(): `0x${string}` {
  const v = process.env.PROJECT_PAYMENT_ADDRESS;
  if (!v) {
    throw new Error("PROJECT_PAYMENT_ADDRESS env var is required");
  }
  return v as `0x${string}`;
}

export type RouteId =
  | "evaluate-proposal"
  | "evaluate-report"
  | "submit-proposal"
  | "submit-report"
  | "create-org";

export const ROUTE_PRICE_USD: Record<RouteId, number> = {
  "evaluate-proposal": 1.5,
  "evaluate-report": 0.75,
  "submit-proposal": 1.0,
  "submit-report": 0.25,
  "create-org": 2.0,
};

const USDC_DECIMALS = 6;

export const BASE_CONFIG = {
  network: NETWORK_MODE === "mainnet" ? "base" : "base-sepolia",
  chainId: NETWORK_MODE === "mainnet" ? 8453 : 84532,
  usdcAddress: (NETWORK_MODE === "mainnet"
    ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    : "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`,
  usdcDecimals: USDC_DECIMALS,
  // EIP-712 domain values from the USDC contract's name()/version().
  // These differ between Base mainnet ("USD Coin") and Base Sepolia ("USDC").
  usdcDomainName: NETWORK_MODE === "mainnet" ? "USD Coin" : "USDC",
  usdcDomainVersion: "2",
} as const;

export const ROOTSTOCK_CONFIG = {
  network: NETWORK_MODE === "mainnet" ? "rootstock-mainnet" : "rootstock-testnet",
  chainId: NETWORK_MODE === "mainnet" ? 30 : 31,
  rpcUrl:
    NETWORK_MODE === "mainnet"
      ? process.env.ROOTSTOCK_MAINNET_RPC_URL!
      : process.env.ROOTSTOCK_TESTNET_RPC_URL!,
  asset: "rBTC" as const,
  decimals: 18,
  confirmations: NETWORK_MODE === "mainnet" ? 3 : 1,
  quoteValiditySeconds: 5 * 60,
} as const;

export function usdToUsdcAtomic(usd: number): bigint {
  return BigInt(Math.round(usd * 10 ** USDC_DECIMALS));
}

export function usdToWeiAtBtcPrice(usd: number, btcUsd: number): bigint {
  const rbtc = usd / btcUsd;
  const wei = BigInt(Math.round(rbtc * 1e18));
  return wei;
}
