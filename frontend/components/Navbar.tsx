"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountPanel } from "./AccountPanel";
import { useWallet } from "@/lib/genlayer/wallet";

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
}

function NavLink({ href, label, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`text-[11px] font-mono tracking-[0.2em] transition-colors ${
        isActive
          ? "text-accent"
          : "text-text-dim hover:text-text"
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const { isConnected } = useWallet();
  const pathname = usePathname() ?? "/";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="gov-navbar fixed top-0 left-0 right-0 z-30 h-18">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 h-full grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        {/* Left — Logo */}
        <div className="justify-self-start">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.svg"
              alt="Treasury Pilot"
              className="w-9 h-9 opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-base font-medium text-text group-hover:text-accent transition-colors tracking-tight">
              Treasury Pilot
            </span>
          </Link>
        </div>

        {/* Center — Page links */}
        <div className="hidden md:flex items-center gap-8 justify-self-center">
          <NavLink
            href="/organizations"
            label="Organizations"
            isActive={isActive("/organizations")}
          />
          {isConnected && (
            <NavLink
              href="/dashboard"
              label="Dashboard"
              isActive={isActive("/dashboard")}
            />
          )}
        </div>

        {/* Right — Account */}
        <div className="justify-self-end">
          <AccountPanel />
        </div>
      </div>
    </nav>
  );
}
