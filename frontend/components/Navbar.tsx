"use client";

import Link from "next/link";
import { AccountPanel } from "./AccountPanel";
import { useWallet } from "@/lib/genlayer/wallet";

export function Navbar() {
  const { isConnected } = useWallet();

  return (
    <nav className="gov-navbar fixed top-0 left-0 right-0 z-30 h-14">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-500/70 transition-colors">
              <span className="font-mono text-cyan-500 text-xs font-bold">T</span>
            </div>
            <span className="font-mono text-slate-300 text-sm tracking-[0.12em] uppercase group-hover:text-slate-100 transition-colors">
              TreasuryPilot
            </span>
          </Link>
          {isConnected && (
            <Link
              href="/dashboard"
              className="hidden md:block text-xs font-mono text-slate-600 hover:text-slate-300 tracking-widest uppercase transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:block text-xs font-mono text-slate-700 tracking-widest uppercase">
            GenLayer Studio
          </span>
          <AccountPanel />
        </div>
      </div>
    </nav>
  );
}
