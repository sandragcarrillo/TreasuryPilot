"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Settings, Users, Shield } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ProgramCard, parsePrograms } from "@/components/CouncilCard";
import { ConstitutionViewer } from "@/components/ConstitutionViewer";
import { ProposalDocket } from "@/components/ProposalDocket";
import { SubmitProposalModal } from "@/components/SubmitProposalModal";
import {
  useOrg,
  useOrgProposals,
  useOrgAdmins,
  useProgramBudgetStatus,
  useSetAutoApprove,
  useAddAdmin,
  useRemoveAdmin,
} from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";

export default function OrgPage() {
  const { id } = useParams();
  const router = useRouter();
  const orgId = Number(id);
  const { address } = useWallet();

  const { data: org, isLoading: loadingOrg } = useOrg(isNaN(orgId) ? null : orgId);
  const { data: proposals = [], isLoading: loadingProposals, refetch } = useOrgProposals(isNaN(orgId) ? null : orgId);
  const { data: admins = [] } = useOrgAdmins(isNaN(orgId) ? null : orgId);
  const { data: budgetStatus = {} } = useProgramBudgetStatus(isNaN(orgId) ? null : orgId);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const programs = org ? parsePrograms(org.constitution) : [];
  const isOwner = org && address && org.owner.toLowerCase() === address.toLowerCase();
  const isAdmin = admins.some((a) => a.toLowerCase() === address?.toLowerCase());
  const canManage = isOwner || isAdmin;

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
        {/* Header band */}
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
                {canManage && (
                  <button
                    onClick={() => setShowSettings((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </button>
                )}
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

          {/* Settings Panel (owner/admin only) */}
          {showSettings && canManage && (
            <div className="space-y-6 animate-fade-in">
              {isOwner && <AutoApprovePanel orgId={orgId} org={org} />}
              {isOwner && <AdminPanel orgId={orgId} admins={admins} />}
            </div>
          )}

          {/* Constitution */}
          <ConstitutionViewer constitution={org.constitution} daoName={org.name} />

          {/* Grant Programs + Budget */}
          {programs.length > 0 && (
            <section className="space-y-4 animate-fade-in">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600">
                Grant Programs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {programs.map((program) => {
                  const spent = budgetStatus[program.name] || "0";
                  return (
                    <div key={program.name} className="space-y-1">
                      <ProgramCard program={program} />
                      {parseFloat(spent) > 0 && (
                        <div className="text-[10px] font-mono text-slate-600 px-1">
                          ${parseFloat(spent).toLocaleString()} USD approved
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Auto-approve badge */}
          {org.auto_approve_enabled && (
            <div className="gov-card p-4 flex items-center gap-3 border-cyan-800/30 bg-cyan-950/10">
              <Shield className="w-4 h-4 text-cyan-500 shrink-0" />
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Auto-Approval Enabled</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grants up to ${parseFloat(org.auto_approve_threshold_usd).toLocaleString()} USD with high alignment and low risk are auto-approved.
                  Veto window: {org.veto_window_hours}h.
                </p>
              </div>
            </div>
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

// ─── Auto-Approve Settings Panel ─────────────────────────────────────────────

function AutoApprovePanel({ orgId, org }: { orgId: number; org: any }) {
  const [enabled, setEnabled] = useState(org.auto_approve_enabled);
  const [threshold, setThreshold] = useState(org.auto_approve_threshold_usd || "0");
  const [vetoHours, setVetoHours] = useState(String(org.veto_window_hours || 24));
  const { mutateAsync, isPending } = useSetAutoApprove();

  const handleSave = async () => {
    try {
      await mutateAsync({
        orgId,
        enabled,
        thresholdUsd: threshold,
        vetoWindowHours: parseInt(vetoHours) || 24,
      });
    } catch {}
  };

  return (
    <div className="gov-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-cyan-500" />
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Auto-Approval Settings</h3>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-sm text-slate-300 font-body">Enable auto-approval for small grants</span>
        </label>

        {enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Max Amount (USD)</label>
              <input
                className="gov-input w-full px-3 py-2 text-sm font-mono"
                placeholder="e.g. 1500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-[10px] text-slate-700">Proposals at or below this amount can be auto-approved</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Veto Window (hours)</label>
              <input
                className="gov-input w-full px-3 py-2 text-sm font-mono"
                placeholder="24"
                value={vetoHours}
                onChange={(e) => setVetoHours(e.target.value)}
              />
              <p className="text-[10px] text-slate-700">Time for owner/admins to veto after auto-approval</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Admin Management Panel ──────────────────────────────────────────────────

function AdminPanel({ orgId, admins }: { orgId: number; admins: string[] }) {
  const [newAdmin, setNewAdmin] = useState("");
  const { mutateAsync: addAdmin, isPending: adding } = useAddAdmin();
  const { mutateAsync: removeAdmin, isPending: removing } = useRemoveAdmin();

  const handleAdd = async () => {
    if (!newAdmin.startsWith("0x")) return;
    try {
      await addAdmin({ orgId, adminAddress: newAdmin });
      setNewAdmin("");
    } catch {}
  };

  const handleRemove = async (addr: string) => {
    try {
      await removeAdmin({ orgId, adminAddress: addr });
    } catch {}
  };

  return (
    <div className="gov-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-cyan-500" />
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Admin Management</h3>
      </div>

      {admins.length > 0 ? (
        <div className="space-y-2">
          {admins.map((addr) => (
            <div key={addr} className="flex items-center justify-between gap-3 py-2 px-3 bg-black/20 border border-slate-800/50">
              <span className="text-xs font-mono text-slate-400 truncate">{addr}</span>
              <button
                onClick={() => handleRemove(addr)}
                disabled={removing}
                className="text-[10px] font-mono uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600 font-mono">No admins added yet. Only you (the owner) can manage this organization.</p>
      )}

      <div className="flex gap-2">
        <input
          className="gov-input flex-1 px-3 py-2 text-sm font-mono"
          placeholder="0x... admin address"
          value={newAdmin}
          onChange={(e) => setNewAdmin(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newAdmin}
          className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40 transition-colors shrink-0"
        >
          {adding ? "Adding..." : "Add Admin"}
        </button>
      </div>
    </div>
  );
}
