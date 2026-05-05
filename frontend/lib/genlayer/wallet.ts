"use client";

export { useWallet, WalletProvider } from "@/lib/wallet/provider";

/**
 * Utility function to format address for display
 * @param address - The address to format
 * @param maxLength - Maximum length before truncation (default: 12)
 */
export function formatAddress(
  address: string | null,
  maxLength: number = 12
): string {
  if (!address) return "";
  if (address.length <= maxLength) return address;

  const prefixLength = Math.floor((maxLength - 3) / 2);
  const suffixLength = Math.ceil((maxLength - 3) / 2);

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
