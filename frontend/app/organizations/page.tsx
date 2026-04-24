"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CreateDAOModal } from "@/components/CreateDAOModal";
import { OrgCard } from "@/components/OrgCard";
import { useOrgs } from "@/lib/hooks/useTreasuryPilot";

const PAGE_SIZE = 20;

export default function OrganizationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { data: orgs = [], isLoading, refetch } = useOrgs();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [orgs, query]);

  const visibleOrgs = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  const handleShowMore = () => setVisible((v) => v + PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-18 pb-20">
        {/* Header band */}
        <div className="border-b border-border-soft">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-16">
            <div className="text-[11px] font-mono tracking-[0.3em] text-text-faint mb-3">
              Registry
            </div>
            <h1 className="text-5xl md:text-6xl text-text font-medium leading-[0.95] tracking-tight">
              Organizations
            </h1>
            <p className="text-text-dim text-base mt-4 max-w-xl leading-relaxed">
              Browse every organization running grants on Treasury Pilot.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-6">
          {/* Search + Action bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-text-faint absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Search organizations…"
                className="gov-input w-full pl-11 pr-4 h-10 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-faint font-mono">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </span>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Organization
              </button>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="gov-card p-16 flex items-center justify-center">
              <span className="font-mono text-sm text-text-faint tracking-widest">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyResult query={query} onCreate={() => setShowCreate(true)} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleOrgs.map((org, i) => (
                  <OrgCard key={org.id} org={org} animationDelay={i * 40} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleShowMore}
                    className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-text-dim border border-border-soft hover:border-border hover:text-text transition-all"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateDAOModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyResult({
  query,
  onCreate,
}: {
  query: string;
  onCreate: () => void;
}) {
  if (query) {
    return (
      <div className="gov-card p-16 flex flex-col items-center gap-4 text-center">
        <p className="text-xl text-text font-medium tracking-tight">
          No matches for “{query}”.
        </p>
        <p className="text-sm text-text-dim">
          Try a different name or clear the search.
        </p>
      </div>
    );
  }
  return (
    <div className="gov-card p-20 flex flex-col items-center gap-6 text-center">
      <div className="text-6xl text-accent/50 leading-none">∅</div>
      <div className="space-y-2 max-w-md">
        <p className="text-2xl text-text font-medium tracking-tight">Start something.</p>
        <p className="text-sm text-text-dim leading-relaxed">
          No organizations yet. Create the first one and define how AI
          evaluates proposals against your mission.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
      >
        Register First Organization
      </button>
    </div>
  );
}
