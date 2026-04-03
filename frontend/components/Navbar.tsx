"use client";

import Link from "next/link";
import { AccountPanel } from "./AccountPanel";
import { useWallet } from "@/lib/genlayer/wallet";

export function Navbar() {
  const { isConnected } = useWallet();

  return (
    <nav className="gov-navbar fixed top-0 left-0 right-0 z-30 h-14">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.svg" alt="TreasuryPilot" className="w-9 h-9 opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="font-mono text-slate-300 text-sm tracking-[0.12em] uppercase group-hover:text-slate-100 transition-colors">
            TreasuryPilot
          </span>
        </Link>

        <div className="flex items-center gap-5">
          {isConnected && (
            <Link
              href="/dashboard"
              className="hidden md:block text-xs font-mono text-cyan-500 hover:text-cyan-400 tracking-widest uppercase transition-colors"
            >
              Dashboard
            </Link>
          )}
          <span className="hidden md:block text-[10px] font-mono text-slate-700/60 tracking-widest uppercase">
            GenLayer Studio
          </span>
          <AccountPanel />
        </div>
      </div>
    </nav>
  );
}
