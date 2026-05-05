"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import {
  useProposalTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from "@/lib/hooks/useTreasuryPilot";
import { AddressDisplay } from "@/components/AddressDisplay";

interface TeamMembersPanelProps {
  proposalId: number;
  submitter: string;
  isSubmitter: boolean;
}

export function TeamMembersPanel({
  proposalId,
  submitter,
  isSubmitter,
}: TeamMembersPanelProps) {
  const { data: team = [] } = useProposalTeam(proposalId);
  const [newMember, setNewMember] = useState("");
  const { mutateAsync: addMember, isPending: adding } = useAddTeamMember();
  const { mutateAsync: removeMember, isPending: removing } = useRemoveTeamMember();

  const isHexAddress = /^0x[a-fA-F0-9]{40}$/.test(newMember.trim());
  const isSubmitterAddr =
    isHexAddress && newMember.trim().toLowerCase() === submitter.toLowerCase();
  const alreadyOnTeam =
    isHexAddress &&
    team.some((a) => a.toLowerCase() === newMember.trim().toLowerCase());
  const canAdd = isHexAddress && !isSubmitterAddr && !alreadyOnTeam;

  const handleAdd = async () => {
    if (!canAdd) return;
    try {
      await addMember({ proposalId, memberAddress: newMember.trim() });
      setNewMember("");
    } catch {}
  };

  const handleRemove = async (addr: string) => {
    try {
      await removeMember({ proposalId, memberAddress: addr });
    } catch {}
  };

  return (
    <div className="gov-card p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
        <Users className="w-4 h-4 text-accent" />
        <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim">
          Reporting Team
        </h3>
      </div>

      <p className="text-xs text-text-faint leading-relaxed">
        Anyone on this list can submit progress reports for this grant. The
        submitter is always allowed.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-bg-elev-2/30 border border-border-soft">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono tracking-[0.2em] text-text-faint shrink-0">
              SUBMITTER
            </span>
            <AddressDisplay
              address={submitter}
              className="text-xs text-text-dim"
              showCopy
            />
          </div>
        </div>

        {team.map((addr) => (
          <div
            key={addr}
            className="flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-bg-elev-2/30 border border-border-soft"
          >
            <AddressDisplay
              address={addr}
              className="text-xs text-text-dim"
              showCopy
            />
            {isSubmitter && (
              <button
                onClick={() => handleRemove(addr)}
                disabled={removing}
                className="text-[10px] font-mono tracking-[0.2em] text-danger hover:text-danger/80 transition-colors shrink-0 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {team.length === 0 && (
          <p className="text-xs text-text-faint italic px-1">
            No additional team members.
          </p>
        )}
      </div>

      {isSubmitter && (
        <div className="space-y-2 pt-2 border-t border-border-soft">
          <input
            className="gov-input w-full px-3 py-2.5 text-sm font-mono"
            placeholder="0x… team wallet"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            spellCheck={false}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !canAdd}
            className="w-full px-4 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {adding ? "Adding…" : "Add Member"}
          </button>
        </div>
      )}

      {isSubmitter && newMember.trim().length > 0 && (
        <p className="text-[11px] -mt-2">
          {!isHexAddress && (
            <span className="text-danger">
              Must be a valid 0x-prefixed EVM address.
            </span>
          )}
          {isSubmitterAddr && (
            <span className="text-warning">
              This is the submitter — already on the team.
            </span>
          )}
          {alreadyOnTeam && (
            <span className="text-warning">Already on the team.</span>
          )}
        </p>
      )}
    </div>
  );
}
