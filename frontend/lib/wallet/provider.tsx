"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { SUPPORTED_CHAINS, getChain, isSupportedChain, type ChainInfo } from "./chains";
import { error, userRejected } from "../utils/toast";

const DISCONNECT_FLAG = "wallet_disconnected";

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window.ethereum as unknown as EthereumProvider) || null;
}

function isMetaMaskAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum?.isMetaMask;
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
}

interface WalletContextValue extends WalletState {
  currentChain: ChainInfo | null;
  isOnSupportedChain: boolean;
  supportedChains: ChainInfo[];
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string>;
  switchToChain: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

async function readChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) return null;
  try {
    const hex = (await provider.request({ method: "eth_chainId" })) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

async function readAccounts(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) return [];
  try {
    return ((await provider.request({ method: "eth_accounts" })) as string[]) || [];
  } catch {
    return [];
  }
}

async function requestSwitchChain(chainId: number, chain: ChainInfo): Promise<void> {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet provider");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.hexId }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chain.hexId,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.nativeSymbol,
              symbol: chain.nativeSymbol,
              decimals: 18,
            },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.blockExplorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
  });

  // Initial mount — restore session if user didn't disconnect
  useEffect(() => {
    (async () => {
      const installed = isMetaMaskAvailable();
      if (!installed) {
        setState((s) => ({ ...s, isLoading: false, isMetaMaskInstalled: false }));
        return;
      }
      const wasDisconnected =
        typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true";
      if (wasDisconnected) {
        setState((s) => ({ ...s, isLoading: false, isMetaMaskInstalled: true }));
        return;
      }
      const accounts = await readAccounts();
      const chainId = await readChainId();
      setState({
        address: accounts[0] || null,
        chainId,
        isConnected: accounts.length > 0,
        isLoading: false,
        isMetaMaskInstalled: true,
      });
    })();
  }, []);

  // Wallet event subscriptions
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const onAccounts = async (accounts: unknown) => {
      const addrs = (accounts as string[]) || [];
      if (addrs.length > 0 && typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }
      const chainId = await readChainId();
      setState((s) => ({
        ...s,
        address: addrs[0] || null,
        chainId,
        isConnected: addrs.length > 0,
      }));
    };

    const onChain = async (chainHex: unknown) => {
      const chainId = parseInt(chainHex as string, 16);
      const accounts = await readAccounts();
      setState((s) => ({
        ...s,
        chainId,
        address: accounts[0] || null,
        isConnected: accounts.length > 0,
      }));
    };

    const onDisconnect = () => {
      setState((s) => ({ ...s, address: null, isConnected: false }));
    };

    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    provider.on("disconnect", onDisconnect);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
      provider.removeListener("disconnect", onDisconnect);
    };
  }, []);

  const connectWallet = useCallback(async (): Promise<string> => {
    const provider = getProvider();
    if (!provider) {
      error("MetaMask not found", {
        description: "Install MetaMask to connect your wallet.",
        action: {
          label: "Install MetaMask",
          onClick: () => window.open("https://metamask.io/download/", "_blank"),
        },
      });
      throw new Error("MetaMask is not installed");
    }
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const accounts = ((await provider.request({
        method: "eth_requestAccounts",
      })) as string[]) || [];
      if (accounts.length === 0) throw new Error("No accounts returned");
      const chainId = await readChainId();
      if (typeof window !== "undefined") localStorage.removeItem(DISCONNECT_FLAG);
      setState({
        address: accounts[0],
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
      });
      return accounts[0];
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false }));
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", { description: err?.message || "Try again." });
      }
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") localStorage.setItem(DISCONNECT_FLAG, "true");
    setState((s) => ({ ...s, address: null, isConnected: false }));
  }, []);

  const switchWalletAccount = useCallback(async (): Promise<string> => {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask is not installed");
    setState((s) => ({ ...s, isLoading: true }));
    try {
      await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = ((await provider.request({ method: "eth_accounts" })) as string[]) || [];
      if (accounts.length === 0) throw new Error("No account selected");
      const chainId = await readChainId();
      if (typeof window !== "undefined") localStorage.removeItem(DISCONNECT_FLAG);
      setState({
        address: accounts[0],
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
      });
      return accounts[0];
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false }));
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        userRejected("Account switch cancelled");
      } else {
        error("Failed to switch account", { description: err?.message || "Try again." });
      }
      throw err;
    }
  }, []);

  const switchToChain = useCallback(async (chainId: number) => {
    const chain = getChain(chainId);
    if (!chain) throw new Error(`Chain ${chainId} not supported`);
    await requestSwitchChain(chainId, chain);
    setState((s) => ({ ...s, chainId }));
  }, []);

  const currentChain = state.chainId != null ? getChain(state.chainId) : null;
  const isOnSupportedChain = isSupportedChain(state.chainId);

  const value: WalletContextValue = {
    ...state,
    currentChain,
    isOnSupportedChain,
    supportedChains: SUPPORTED_CHAINS,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
    switchToChain,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
