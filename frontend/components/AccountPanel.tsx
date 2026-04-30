"use client";

import { useState } from "react";
import { User, LogOut, AlertCircle, ExternalLink, Check } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, userRejected } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const METAMASK_INSTALL_URL = "https://metamask.io/download/";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isMetaMaskInstalled,
    isOnSupportedChain,
    currentChain,
    supportedChains,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
    switchToChain,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) return;
    try {
      setIsConnecting(true);
      setConnectionError("");
      await connectWallet();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setConnectionError(err.message || "Failed to connect to MetaMask");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalOpen(false);
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSwitching(true);
      setConnectionError("");
      await switchWalletAccount();
    } catch (err: any) {
      if (!err.message?.includes("rejected")) {
        setConnectionError(err.message || "Failed to switch account");
        error("Failed to switch account", { description: err.message || "Try again." });
      } else {
        userRejected("Account switch cancelled");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSwitchChain = async (chainId: number) => {
    try {
      setSwitchingChainId(chainId);
      setConnectionError("");
      await switchToChain(chainId);
    } catch (err: any) {
      if (!err.message?.includes("rejected") && err?.code !== 4001) {
        setConnectionError(err.message || "Failed to switch chain");
        error("Failed to switch chain", { description: err.message || "Try again." });
      } else {
        userRejected("Chain switch cancelled");
      }
    } finally {
      setSwitchingChainId(null);
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button variant="gradient" disabled={isLoading}>
            <User className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="brand-card border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Connect Wallet</DialogTitle>
            <DialogDescription>
              TreasuryPilot accepts payments on multiple chains. Connect your wallet on
              any of them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {!isMetaMaskInstalled ? (
              <>
                <Alert variant="default" className="bg-accent/10 border-accent/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>MetaMask Not Detected</AlertTitle>
                  <AlertDescription>
                    Install MetaMask to continue. It&apos;s a crypto wallet that lets you
                    interact with blockchain applications.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => window.open(METAMASK_INSTALL_URL, "_blank")}
                  variant="gradient"
                  className="w-full h-14 text-lg"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Install MetaMask
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleConnect}
                  variant="gradient"
                  className="w-full h-14 text-lg"
                  disabled={isConnecting}
                >
                  <User className="w-5 h-5 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect MetaMask"}
                </Button>

                {connectionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>{connectionError}</AlertDescription>
                  </Alert>
                )}

                <div className="p-4 rounded-xl bg-bg-elev-2 border border-border-soft">
                  <p className="text-xs font-mono text-text-faint mb-2">Supported chains</p>
                  <ul className="space-y-1.5">
                    {supportedChains.map((c) => (
                      <li key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-text-dim">{c.name}</span>
                        <span className="text-text-faint font-mono">
                          pay with {c.paymentAsset.symbol}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="flex items-center gap-4">
        <div className="brand-card px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <AddressDisplay address={address} maxLength={12} />
          </div>
        </div>

        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="brand-card border-2">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Wallet Details</DialogTitle>
          <DialogDescription>Your connected wallet and payment chain</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="brand-card p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Your Address</p>
            <code className="text-sm font-mono break-all">{address}</code>
          </div>

          <div className="brand-card p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Payment Chain</p>
            {isOnSupportedChain && currentChain ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm">
                  {currentChain.name} — pay with {currentChain.paymentAsset.symbol}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-sm">Unsupported chain — pick one below</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {supportedChains.map((c) => {
                const active = currentChain?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSwitchChain(c.id)}
                    disabled={switchingChainId !== null}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                      active
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border-soft text-text-dim hover:border-accent/40 hover:text-text"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {c.shortName}
                    {switchingChainId === c.id && " ..."}
                  </button>
                );
              })}
            </div>
          </div>

          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
            <Button
              onClick={handleSwitchAccount}
              variant="outline"
              className="w-full"
              disabled={isSwitching || isLoading}
            >
              <User className="w-4 h-4 mr-2" />
              {isSwitching ? "Switching..." : "Switch Account"}
            </Button>

            <Button
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive"
              variant="outline"
              disabled={isSwitching || isLoading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
