/**
 * Chain registry — chains Axiom accepts payments on.
 * Single source of truth for client + server.
 */

export type NetworkMode = "testnet" | "mainnet";

export const NETWORK_MODE: NetworkMode =
  (process.env.NEXT_PUBLIC_X402_NETWORK as NetworkMode) || "testnet";

export interface ChainInfo {
  id: number;
  hexId: string;
  name: string;
  shortName: string;
  nativeSymbol: string;
  paymentMode: "x402-eip3009" | "sovereign-rsk";
  paymentAsset: { symbol: string; address?: `0x${string}`; decimals: number };
  blockExplorer: string;
  rpcUrl: string;
}

const BASE_MAINNET: ChainInfo = {
  id: 8453,
  hexId: "0x2105",
  name: "Base",
  shortName: "Base",
  nativeSymbol: "ETH",
  paymentMode: "x402-eip3009",
  paymentAsset: {
    symbol: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
  blockExplorer: "https://basescan.org",
  rpcUrl: "https://mainnet.base.org",
};

const BASE_SEPOLIA: ChainInfo = {
  id: 84532,
  hexId: "0x14a34",
  name: "Base Sepolia",
  shortName: "Base Sepolia",
  nativeSymbol: "ETH",
  paymentMode: "x402-eip3009",
  paymentAsset: {
    symbol: "USDC",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6,
  },
  blockExplorer: "https://sepolia.basescan.org",
  rpcUrl: "https://sepolia.base.org",
};

const ROOTSTOCK_MAINNET: ChainInfo = {
  id: 30,
  hexId: "0x1e",
  name: "Rootstock",
  shortName: "Rootstock",
  nativeSymbol: "rBTC",
  paymentMode: "sovereign-rsk",
  paymentAsset: { symbol: "rBTC", decimals: 18 },
  blockExplorer: "https://explorer.rootstock.io",
  rpcUrl: "https://public-node.rsk.co",
};

const ROOTSTOCK_TESTNET: ChainInfo = {
  id: 31,
  hexId: "0x1f",
  name: "Rootstock Testnet",
  shortName: "RSK Testnet",
  nativeSymbol: "tRBTC",
  paymentMode: "sovereign-rsk",
  paymentAsset: { symbol: "tRBTC", decimals: 18 },
  blockExplorer: "https://explorer.testnet.rootstock.io",
  rpcUrl: "https://public-node.testnet.rsk.co",
};

// Rootstock chains are defined above and ready to re-enable once the RSK flow
// is fully tested. Keep them out of SUPPORTED_CHAINS for v1 — Base only.
void ROOTSTOCK_MAINNET;
void ROOTSTOCK_TESTNET;

export const SUPPORTED_CHAINS: ChainInfo[] =
  NETWORK_MODE === "mainnet" ? [BASE_MAINNET] : [BASE_SEPOLIA];

export function getChain(id: number): ChainInfo | null {
  return SUPPORTED_CHAINS.find((c) => c.id === id) || null;
}

export function isSupportedChain(id: number | null | undefined): boolean {
  if (id == null) return false;
  return SUPPORTED_CHAINS.some((c) => c.id === id);
}
