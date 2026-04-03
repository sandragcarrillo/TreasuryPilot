"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CreateDAOModal } from "@/components/CreateDAOModal";
import { useOrgs } from "@/lib/hooks/useTreasuryPilot";

export default function HomePage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: orgs = [], isLoading, refetch } = useOrgs();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Institution header */}
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 uppercase tracking-[0.25em] mb-6">
              <span className="w-8 h-px bg-slate-700" />
              GenLayer · Studio
              <span className="w-8 h-px bg-slate-700" />
            </div>
            <h1 className="font-display text-5xl md:text-6xl text-slate-100 mb-4">
              TreasuryPilot
            </h1>
            <p className="text-slate-500 text-sm font-body max-w-lg mx-auto leading-relaxed">
              AI-powered grants evaluation. Submit proposals, watch validators deliberate,
              receive impartial verdicts scored against your organization&apos;s own constitution.
            </p>
          </div>

          {/* Organization Registry */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
                  Organization Registry
                </h2>
                <span className="font-mono text-xs text-slate-700 border border-slate-800 px-2 py-0.5">
                  {orgs.length}
                </span>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Organization
              </button>
            </div>

            {isLoading ? (
              <div className="gov-card p-10 flex items-center justify-center">
                <span className="font-mono text-sm text-slate-600 tracking-wider">Loading registry...</span>
              </div>
            ) : orgs.length === 0 ? (
              <div className="gov-card p-16 flex flex-col items-center gap-5 text-center">
                <Building2 className="w-10 h-10 text-slate-800" />
                <div>
                  <p className="text-slate-400 font-body font-medium mb-1">No organizations registered</p>
                  <p className="text-xs text-slate-700 font-mono">The registry is empty. Be the first to register your organization.</p>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-2.5 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
                >
                  Register First Organization
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orgs.map((org, i) => (
                  <Link
                    key={org.id}
                    href={`/org/${org.id}`}
                    className="gov-card gov-card-hover p-6 block animate-fade-in group"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                          {org.name}
                        </h3>
                        <p className="text-xs text-slate-600 font-mono mt-1 truncate">
                          Owner: {org.owner}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-slate-600 border border-slate-800 px-2 py-1 shrink-0">
                        {org.proposal_count} proposals
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {org.constitution.slice(0, 160)}...
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="gov-card mt-12 p-8 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600 mb-6">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { n: "01", title: "Register Organization", body: "Publish your mission, grant programs, budgets, and allocation rules on-chain." },
                { n: "02", title: "Submit Grant Proposal", body: "Anyone submits a funding request targeting a specific program." },
                { n: "03", title: "AI Evaluates", body: "Multiple validators run the same LLM evaluation and must reach consensus." },
                { n: "04", title: "Verdict Issued", body: "The proposal receives a binding score, risk rating, and recommendation." },
              ].map((step) => (
                <div key={step.n} className="space-y-2">
                  <div className="font-mono text-2xl text-slate-800">{step.n}</div>
                  <div className="text-sm font-body font-medium text-slate-300">{step.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-slate-900 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs font-mono text-slate-700">
          <span>TreasuryPilot</span>
          <a href="https://github.com/sandragcarrillo/TreasuryPilot" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500 transition-colors">
            GitHub
          </a>
        </div>
      </footer>

      {showCreate && (
        <CreateDAOModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
