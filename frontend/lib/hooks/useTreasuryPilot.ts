"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import TreasuryPilot from "../contracts/TreasuryPilot";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";
import { relayCall } from "../payment/relay-call";
import type {
  Organization,
  Proposal,
  Report,
  ProgramBudgetStatus,
} from "../contracts/types";

// ─── Read client ───────────────────────────────────────────────────────────

export function useTreasuryContract(): TreasuryPilot | null {
  const contractAddress = getContractAddress();
  return useMemo(() => {
    if (!contractAddress) return null;
    return new TreasuryPilot(contractAddress);
  }, [contractAddress]);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function requireAddress(addr: string | null): `0x${string}` {
  if (!addr) throw new Error("Wallet not connected");
  return addr as `0x${string}`;
}

// ─── Organization Queries ──────────────────────────────────────────────────

export function useOrgs() {
  const contract = useTreasuryContract();
  return useQuery<Organization[], Error>({
    queryKey: ["orgs"],
    queryFn: () => (contract ? contract.getAllOrgs() : Promise.resolve([])),
    enabled: !!contract,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

export function useOrg(orgId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Organization, Error>({
    queryKey: ["org", orgId],
    queryFn: () => contract!.getOrg(orgId!),
    enabled: !!contract && orgId !== null,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

export function useOrgAdmins(orgId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<string[], Error>({
    queryKey: ["orgAdmins", orgId],
    queryFn: () => contract!.getOrgAdmins(orgId!),
    enabled: !!contract && orgId !== null,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useProposalTeam(proposalId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<string[], Error>({
    queryKey: ["proposalTeam", proposalId],
    queryFn: () => contract!.getProposalTeam(proposalId!),
    enabled: !!contract && proposalId !== null,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

// ─── Proposal Queries ──────────────────────────────────────────────────────

export function useOrgProposals(orgId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Proposal[], Error>({
    queryKey: ["proposals", orgId],
    queryFn: () =>
      contract ? contract.getOrgProposals(orgId!) : Promise.resolve([]),
    enabled: !!contract && orgId !== null,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

export function useAllProposals() {
  const contract = useTreasuryContract();
  return useQuery<Proposal[], Error>({
    queryKey: ["allProposals"],
    queryFn: () =>
      contract ? contract.getAllProposals() : Promise.resolve([]),
    enabled: !!contract,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

export function useProposal(proposalId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Proposal, Error>({
    queryKey: ["proposal", proposalId],
    queryFn: () => contract!.getProposal(proposalId!),
    enabled: !!contract && proposalId !== null,
    staleTime: 5000,
    // Poll while a tx may be in flight on GenLayer (consensus takes 5–15 min)
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

// ─── Report Queries ────────────────────────────────────────────────────────

export function useProposalReports(proposalId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Report[], Error>({
    queryKey: ["reports", proposalId],
    queryFn: () =>
      contract ? contract.getProposalReports(proposalId!) : Promise.resolve([]),
    enabled: !!contract && proposalId !== null,
    staleTime: 5000,
    refetchInterval: 8000,
  });
}

// ─── Budget Queries ────────────────────────────────────────────────────────

export function useProgramBudgetStatus(orgId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<ProgramBudgetStatus, Error>({
    queryKey: ["programBudget", orgId],
    queryFn: () => contract!.getProgramBudgetStatus(orgId!),
    enabled: !!contract && orgId !== null,
    staleTime: 5000,
    refetchInterval: 8000,
  });
}

// ─── Organization Mutations ────────────────────────────────────────────────

export function useCreateOrg() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      constitution,
    }: {
      name: string;
      constitution: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "create-org",
        address: actor,
        data: { name, constitution },
        paid: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      success("Organization registered", {
        description: "Your organization has been added to the registry.",
      });
    },
    onError: (err: any) => {
      error("Failed to register organization", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useUpdateConstitution() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      newConstitution,
    }: {
      orgId: number;
      newConstitution: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "update-constitution",
        address: actor,
        data: { orgId, newConstitution },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Constitution updated");
    },
    onError: (err: any) => {
      error("Failed to update constitution", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetAutoApprove() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      enabled,
      thresholdUsd,
      vetoWindowHours,
    }: {
      orgId: number;
      enabled: boolean;
      thresholdUsd: string;
      vetoWindowHours: number;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-auto-approve",
        address: actor,
        data: { orgId, enabled, thresholdUsd, vetoWindowHours },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Auto-approval updated");
    },
    onError: (err: any) => {
      error("Failed to update auto-approval", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetModificationWindow() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      hours,
    }: {
      orgId: number;
      hours: number;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-modification-window",
        address: actor,
        data: { orgId, hours },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Modification window updated");
    },
    onError: (err: any) => {
      error("Failed to update modification window", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetAppeals() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      enabled,
      windowHours,
    }: {
      orgId: number;
      enabled: boolean;
      windowHours: number;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-appeals",
        address: actor,
        data: { orgId, enabled, windowHours },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Appeals settings updated");
    },
    onError: (err: any) => {
      error("Failed to update appeals", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useFileAppeal() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      proposalId: number;
      appealText: string;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "file-appeal",
        address: actor,
        data: args,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      success("Appeal filed", {
        description: "The org owner will review your appeal.",
      });
    },
    onError: (err: any) => {
      error("Failed to file appeal", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetHumanDecision() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      verdict,
      reason,
    }: {
      proposalId: number;
      verdict: "" | "approved" | "rejected" | "modify";
      reason: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-human-decision",
        address: actor,
        data: { proposalId, verdict, reason },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      success(variables.verdict ? "Human decision recorded" : "Human decision cleared");
    },
    onError: (err: any) => {
      error("Failed to set human decision", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetReportHumanDecision() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      reportNumber,
      action,
      reason,
    }: {
      proposalId: number;
      reportNumber: number;
      action:
        | ""
        | "continue_funding"
        | "pause_pending_clarification"
        | "claw_back"
        | "terminate";
      reason: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-report-human-decision",
        address: actor,
        data: { proposalId, reportNumber, action, reason },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", variables.proposalId] });
      success(variables.action ? "Human decision recorded" : "Human decision cleared");
    },
    onError: (err: any) => {
      error("Failed to set human decision", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useSetHistoricalBaseline() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      enabled,
    }: {
      orgId: number;
      enabled: boolean;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "set-historical-baseline",
        address: actor,
        data: { orgId, enabled },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Historical baseline updated");
    },
    onError: (err: any) => {
      error("Failed to update historical baseline", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useAddAdmin() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      adminAddress,
    }: {
      orgId: number;
      adminAddress: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "add-admin",
        address: actor,
        data: { orgId, adminAddress: adminAddress as `0x${string}` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orgAdmins", variables.orgId] });
      success("Admin added");
    },
    onError: (err: any) => {
      error("Failed to add admin", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useRemoveAdmin() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      adminAddress,
    }: {
      orgId: number;
      adminAddress: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "remove-admin",
        address: actor,
        data: { orgId, adminAddress: adminAddress as `0x${string}` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orgAdmins", variables.orgId] });
      success("Admin removed");
    },
    onError: (err: any) => {
      error("Failed to remove admin", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useTransferOwnership() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      newOwner,
    }: {
      orgId: number;
      newOwner: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "transfer-ownership",
        address: actor,
        data: { orgId, newOwner: newOwner as `0x${string}` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["org", variables.orgId] });
      success("Ownership transferred");
    },
    onError: (err: any) => {
      error("Failed to transfer ownership", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

// ─── Proposal Mutations ────────────────────────────────────────────────────

export function useSubmitProposal() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      title,
      description,
      requestedAmountUsd,
      recipient,
      targetProgram,
      rationale,
    }: {
      orgId: number;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "submit-proposal",
        address: actor,
        data: {
          orgId,
          title,
          description,
          requestedAmountUsd,
          recipient,
          targetProgram,
          rationale,
        },
        paid: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.orgId] });
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      success("Proposal submitted", {
        description: "Your grant proposal has been submitted.",
      });
    },
    onError: (err: any) => {
      error("Failed to submit proposal", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useUpdateProposal() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      title,
      description,
      requestedAmountUsd,
      recipient,
      targetProgram,
      rationale,
    }: {
      proposalId: number;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "update-proposal",
        address: actor,
        data: {
          proposalId,
          title,
          description,
          requestedAmountUsd,
          recipient,
          targetProgram,
          rationale,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      success("Proposal revised", {
        description: "Request a new AI evaluation when you're ready.",
      });
    },
    onError: (err: any) => {
      error("Failed to revise proposal", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useAddTeamMember() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      memberAddress,
    }: {
      proposalId: number;
      memberAddress: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "add-team-member",
        address: actor,
        data: { proposalId, memberAddress: memberAddress as `0x${string}` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposalTeam", variables.proposalId] });
      success("Team member added");
    },
    onError: (err: any) => {
      error("Failed to add team member", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useRemoveTeamMember() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      memberAddress,
    }: {
      proposalId: number;
      memberAddress: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "remove-team-member",
        address: actor,
        data: { proposalId, memberAddress: memberAddress as `0x${string}` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposalTeam", variables.proposalId] });
      success("Team member removed");
    },
    onError: (err: any) => {
      error("Failed to remove team member", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useEvaluateProposal() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { proposalId: number; retryOfTxHash?: string }) => {
      const actor = requireAddress(address);
      const data: Record<string, unknown> = { proposalId: args.proposalId };
      if (args.retryOfTxHash) data.retryOfTxHash = args.retryOfTxHash;
      return relayCall({
        action: "evaluate-proposal",
        address: actor,
        data,
        // When retrying an UNDETERMINED tx, the server skips the payment
        // step. Don't trigger the client-side x402 flow in that case.
        paid: !args.retryOfTxHash,
        // Consensus takes 5–15 min — don't block the mutation. The pending
        // UI handles the wait and surfaces preliminary verdicts on
        // UNDETERMINED.
        waitForAccepted: false,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", vars.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      queryClient.invalidateQueries({ queryKey: ["programBudget"] });
      success(
        vars.retryOfTxHash ? "Retry submitted" : "Evaluation submitted",
        {
          description:
            "AI validators are deliberating. Result will appear once consensus is reached.",
        }
      );
    },
    onError: (err: any) => {
      error("Evaluation failed", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useVetoProposal() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: number) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "veto-proposal",
        address: actor,
        data: { proposalId },
      });
    },
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      queryClient.invalidateQueries({ queryKey: ["programBudget"] });
      success("Proposal vetoed");
    },
    onError: (err: any) => {
      error("Failed to veto proposal", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

// ─── Report Mutations ──────────────────────────────────────────────────────

export function useSubmitReport() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      milestonesCompleted,
      fundsSpentUsd,
      deliverables,
      evidenceUrls,
    }: {
      proposalId: number;
      milestonesCompleted: string;
      fundsSpentUsd: string;
      deliverables: string;
      evidenceUrls: string;
    }) => {
      const actor = requireAddress(address);
      return relayCall({
        action: "submit-report",
        address: actor,
        data: {
          proposalId,
          milestonesCompleted,
          fundsSpentUsd,
          deliverables,
          evidenceUrls,
        },
        paid: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", variables.proposalId] });
      success("Report submitted", {
        description: "Your progress report has been recorded.",
      });
    },
    onError: (err: any) => {
      error("Failed to submit report", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useEvaluateReport() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      reportNumber,
      retryOfTxHash,
    }: {
      proposalId: number;
      reportNumber: number;
      retryOfTxHash?: string;
    }) => {
      const actor = requireAddress(address);
      const data: Record<string, unknown> = { proposalId, reportNumber };
      if (retryOfTxHash) data.retryOfTxHash = retryOfTxHash;
      return relayCall({
        action: "evaluate-report",
        address: actor,
        data,
        paid: !retryOfTxHash,
        // Consensus takes 5–15 min — handled by the pending UI.
        waitForAccepted: false,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", variables.proposalId] });
      success(
        variables.retryOfTxHash ? "Retry submitted" : "Report evaluation submitted",
        {
          description:
            "AI validators are deliberating. Result will appear once consensus is reached.",
        }
      );
    },
    onError: (err: any) => {
      error("Report evaluation failed", {
        description: err?.message || "Please try again.",
      });
    },
  });
}
