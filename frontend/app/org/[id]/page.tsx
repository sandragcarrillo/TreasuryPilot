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
        <main className="grow pt-24 flex items-center justify-center">
          <span className="font-mono text-xs text-text-faint tracking-widest">Loading…</span>
        </main>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-24 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-2xl text-text font-medium tracking-tight">Organization not found.</p>
            <button
              onClick={() => router.push("/")}
              className="text-[11px] font-mono text-accent hover:text-accent/80 tracking-widest"
            >
              ← Back to registry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-18 pb-20">
        {/* Header band */}
        <div className="border-b border-border-soft">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-16">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-faint hover:text-text-dim tracking-[0.2em] transition-colors mb-8"
            >
              <ArrowLeft className="w-3 h-3" />
              Registry
            </button>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono text-text-faint tracking-[0.3em] mb-3">
                  Organization № {org.id}
                </div>
                <h1 className="font-display text-5xl md:text-6xl text-text leading-[0.95] tracking-tight">
                  {org.name}
                </h1>
                <p className="text-[11px] font-mono text-text-faint mt-4 truncate" title={org.owner}>
                  Owner <span className="text-text-dim">· {org.owner}</span>
                </p>
              </div>
              <ActionCluster
                proposalCount={proposals.length}
                canManage={!!canManage}
                onToggleSettings={() => setShowSettings((v) => !v)}
                onSubmit={() => setShowSubmit(true)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 space-y-14">
          {/* Settings Panel (owner/admin only) */}
          {showSettings && canManage && (
            <div className="space-y-4 animate-fade-in">
              {isOwner && <AutoApprovePanel orgId={orgId} org={org} />}
              {isOwner && <AdminPanel orgId={orgId} admins={admins} />}
            </div>
          )}

          {/* Constitution */}
          <ConstitutionViewer constitution={org.constitution} daoName={org.name} />

          {/* Grant Programs + Budget */}
          {programs.length > 0 && (
            <section className="space-y-6 animate-fade-in">
              <div className="flex items-end justify-between border-b border-border-soft pb-4">
                <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
                  Grant Programs
                </h2>
                <span className="font-mono text-[11px] text-text-faint">
                  {programs.length.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                {programs.map((program) => {
                  const spent = parseFloat(budgetStatus[program.name] || "0");
                  return (
                    <div key={program.name} className="flex flex-col gap-1.5">
                      <ProgramCard program={program} />
                      <div className="text-[11px] text-text-faint px-1">
                        ${spent.toLocaleString()} approved
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Auto-approve callout */}
          {org.auto_approve_enabled && (
            <div className="gov-card p-5 flex items-start gap-3 border-accent/25 bg-accent-bg">
              <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-sm font-medium text-accent">
                  Auto-approval enabled
                </span>
                <p className="text-xs text-text-dim leading-relaxed">
                  Grants up to{" "}
                  <span className="text-text font-medium">
                    ${parseFloat(org.auto_approve_threshold_usd).toLocaleString()} USD
                  </span>{" "}
                  with high alignment and low risk are auto-approved. Veto window:{" "}
                  <span className="text-text font-medium">{org.veto_window_hours}h</span>.
                </p>
              </div>
            </div>
          )}

          {/* Proposal Docket */}
          <section className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-end justify-between border-b border-border-soft pb-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
                  Grant Proposal Docket
                </h2>
                <span className="font-mono text-[11px] text-text-faint">
                  {proposals.length.toString().padStart(2, "0")}
                </span>
              </div>
              {proposals.length > 0 && (
                <button
                  onClick={() => setShowSubmit(true)}
                  className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
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

// ─── Action Cluster ──────────────────────────────────────────────────────────

function ActionCluster({
  proposalCount,
  canManage,
  onToggleSettings,
  onSubmit,
}: {
  proposalCount: number;
  canManage: boolean;
  onToggleSettings: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center h-9 px-3 rounded-xl text-[11px] text-text-dim border border-border">
        {proposalCount} {proposalCount === 1 ? "proposal" : "proposals"}
      </span>
      {canManage && (
        <button
          onClick={onToggleSettings}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-[11px] font-mono tracking-[0.2em] text-text border border-border-strong bg-bg-elev-2 hover:border-text-dim hover:bg-bg-elev transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      )}
      <button
        onClick={onSubmit}
        className="flex items-center gap-2 h-9 px-4 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Submit Proposal
      </button>
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
    <div className="gov-card p-8 space-y-6">
      <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
        <Shield className="w-4 h-4 text-accent" />
        <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim">
          Auto-Approval Settings
        </h3>
      </div>

      <div className="space-y-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-[var(--accent)]"
          />
          <span className="text-sm text-text font-body">
            Enable auto-approval for small grants
          </span>
        </label>

        {enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pl-7">
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
                Max Amount (USD)
              </label>
              <input
                className="gov-input w-full px-3 py-2.5 text-sm font-mono"
                placeholder="e.g. 1500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-[11px] text-text-faint leading-relaxed">
                Proposals at or below this amount can be auto-approved
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
                Veto Window (hours)
              </label>
              <input
                className="gov-input w-full px-3 py-2.5 text-sm font-mono"
                placeholder="24"
                value={vetoHours}
                onChange={(e) => setVetoHours(e.target.value)}
              />
              <p className="text-[11px] text-text-faint leading-relaxed">
                Time for owner/admins to veto after auto-approval
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] bg-accent text-bg hover:bg-accent/90 disabled:opacity-40 transition-colors"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
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
    <div className="gov-card p-8 space-y-6">
      <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
        <Users className="w-4 h-4 text-accent" />
        <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim">
          Admin Management
        </h3>
      </div>

      {admins.length > 0 ? (
        <div className="space-y-2">
          {admins.map((addr) => (
            <div
              key={addr}
              className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-bg-elev-2/40 border border-border-soft"
            >
              <span className="text-xs font-mono text-text-dim truncate">{addr}</span>
              <button
                onClick={() => handleRemove(addr)}
                disabled={removing}
                className="text-[10px] font-mono tracking-[0.2em] text-danger hover:text-danger/80 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-dim leading-relaxed">
          No admins yet. Invite a trusted collaborator to help manage this organization.
        </p>
      )}

      <div className="flex gap-2">
        <input
          className="gov-input flex-1 px-3 py-2.5 text-sm font-mono"
          placeholder="0x… admin address"
          value={newAdmin}
          onChange={(e) => setNewAdmin(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newAdmin}
          className="px-4 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 transition-all shrink-0"
        >
          {adding ? "Adding…" : "Add Admin"}
        </button>
      </div>
    </div>
  );
}
