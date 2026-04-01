"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ProgramCard, parsePrograms } from "@/components/CouncilCard";
import { ConstitutionViewer } from "@/components/ConstitutionViewer";
import { ProposalDocket } from "@/components/ProposalDocket";
import { SubmitProposalModal } from "@/components/SubmitProposalModal";
import { useOrg, useOrgProposals } from "@/lib/hooks/useTreasuryPilot";

export default function OrgPage() {
  const { id } = useParams();
  const router = useRouter();
  const orgId = Number(id);

  const { data: org, isLoading: loadingOrg } = useOrg(isNaN(orgId) ? null : orgId);
  const { data: proposals = [], isLoading: loadingProposals, refetch } = useOrgProposals(isNaN(orgId) ? null : orgId);
  const [showSubmit, setShowSubmit] = useState(false);

  const programs = org ? parsePrograms(org.constitution) : [];

  if (loadingOrg) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-20 flex items-center justify-center">
          <span className="font-mono text-sm text-slate-600 tracking-wider">Loading...</span>
        </main>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 font-body mb-3">Organization not found</p>
            <button onClick={() => router.push("/")} className="text-xs font-mono text-cyan-500 hover:text-cyan-400">← Back to registry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-14 pb-16">
        {/* Institution header band */}
        <div className="border-b border-slate-800/80 bg-black/30">
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Registry
            </button>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-slate-600 uppercase tracking-[0.2em] mb-2">
                  Organization #{org.id}
                </div>
                <h1 className="font-display text-4xl md:text-5xl text-slate-100">{org.name}</h1>
                <p className="text-xs font-mono text-slate-700 mt-2">Owner: {org.owner}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-600 border border-slate-800 px-3 py-1.5">
                  {proposals.length} proposals
                </span>
                <button
                  onClick={() => setShowSubmit(true)}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Submit Grant Proposal
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-10">

          {/* Constitution */}
          <ConstitutionViewer constitution={org.constitution} daoName={org.name} />

          {/* Grant Programs */}
          {programs.length > 0 && (
            <section className="space-y-4 animate-fade-in">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600">
                Grant Programs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {programs.map((program) => (
                  <ProgramCard key={program.name} program={program} />
                ))}
              </div>
            </section>
          )}

          {/* Proposal Docket */}
          <section className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600">
                Grant Proposal Docket
              </h2>
              {proposals.length > 0 && (
                <button
                  onClick={() => setShowSubmit(true)}
                  className="text-xs font-mono text-cyan-600 hover:text-cyan-400 transition-colors"
                >
                  + Submit
                </button>
              )}
            </div>
            <ProposalDocket
              proposals={proposals}
              loading={loadingProposals}
              onSubmitClick={() => setShowSubmit(true)}
            />
          </section>

        </div>
      </main>

      {showSubmit && (
        <SubmitProposalModal
          orgId={orgId}
          programs={programs}
          onClose={() => setShowSubmit(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
