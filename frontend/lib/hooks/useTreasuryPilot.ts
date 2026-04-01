"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import TreasuryPilot from "../contracts/TreasuryPilot";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";
import type {
  Organization,
  Proposal,
  Report,
  ProgramBudgetStatus,
} from "../contracts/types";

export function useTreasuryContract(): TreasuryPilot | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();

  return useMemo(() => {
    if (!contractAddress) return null;
    return new TreasuryPilot(contractAddress, address);
  }, [contractAddress, address]);
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
    staleTime: 10000,
  });
}

export function useOrgAdmins(orgId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<string[], Error>({
    queryKey: ["orgAdmins", orgId],
    queryFn: () => contract!.getOrgAdmins(orgId!),
    enabled: !!contract && orgId !== null,
    staleTime: 10000,
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
    refetchOnWindowFocus: false,
  });
}

// ─── Report Queries ────────────────────────────────────────────────────────

export function useProposalReports(proposalId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Report[], Error>({
    queryKey: ["reports", proposalId],
    queryFn: () =>
      contract
        ? contract.getProposalReports(proposalId!)
        : Promise.resolve([]),
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
    staleTime: 10000,
  });
}

// ─── Organization Mutations ────────────────────────────────────────────────

export function useCreateOrg() {
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      constitution,
      onSubmitted,
    }: {
      name: string;
      constitution: string;
      onSubmitted?: (txHash: string) => void;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.createOrg(name, constitution, onSubmitted);
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

export function useSetAutoApprove() {
  const contract = useTreasuryContract();
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
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.setAutoApprove(
        orgId,
        enabled,
        thresholdUsd,
        vetoWindowHours
      );
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

export function useAddAdmin() {
  const contract = useTreasuryContract();
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
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.addAdmin(orgId, adminAddress);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["orgAdmins", variables.orgId],
      });
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
  const contract = useTreasuryContract();
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
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.removeAdmin(orgId, adminAddress);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["orgAdmins", variables.orgId],
      });
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
  const contract = useTreasuryContract();
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
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.transferOwnership(orgId, newOwner);
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
  const contract = useTreasuryContract();
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
      onSubmitted,
    }: {
      orgId: number;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
      onSubmitted?: (txHash: string) => void;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.submitProposal(
        orgId,
        title,
        description,
        requestedAmountUsd,
        recipient,
        targetProgram,
        rationale,
        onSubmitted
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposals", variables.orgId],
      });
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

export function useEvaluateProposal() {
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: number) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.evaluateProposal(proposalId);
    },
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposals"] });
      queryClient.invalidateQueries({ queryKey: ["programBudget"] });
      success("Evaluation complete", {
        description: "AI validators have reached consensus.",
      });
    },
    onError: (err: any) => {
      error("Evaluation failed", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useVetoProposal() {
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: number) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.vetoProposal(proposalId);
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
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      milestonesCompleted,
      fundsSpentUsd,
      deliverables,
      evidenceUrls,
      onSubmitted,
    }: {
      proposalId: number;
      milestonesCompleted: string;
      fundsSpentUsd: string;
      deliverables: string;
      evidenceUrls: string;
      onSubmitted?: (txHash: string) => void;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.submitReport(
        proposalId,
        milestonesCompleted,
        fundsSpentUsd,
        deliverables,
        evidenceUrls,
        onSubmitted
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.proposalId],
      });
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
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      reportNumber,
    }: {
      proposalId: number;
      reportNumber: number;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.evaluateReport(proposalId, reportNumber);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.proposalId],
      });
      success("Report evaluation complete", {
        description: "AI validators have assessed the progress report.",
      });
    },
    onError: (err: any) => {
      error("Report evaluation failed", {
        description: err?.message || "Please try again.",
      });
    },
  });
}
