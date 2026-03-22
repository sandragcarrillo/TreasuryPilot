"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import TreasuryPilot from "../contracts/TreasuryPilot";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";
import type { DAO, Proposal } from "../contracts/types";

export function useTreasuryContract(): TreasuryPilot | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const rpcUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) return null;
    return new TreasuryPilot(contractAddress, address, rpcUrl);
  }, [contractAddress, address, rpcUrl]);
}

export function useDaos() {
  const contract = useTreasuryContract();
  return useQuery<DAO[], Error>({
    queryKey: ["daos"],
    queryFn: () => (contract ? contract.getAllDaos() : Promise.resolve([])),
    enabled: !!contract,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
}

export function useDao(daoId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<DAO, Error>({
    queryKey: ["dao", daoId],
    queryFn: () => contract!.getDao(daoId!),
    enabled: !!contract && daoId !== null,
    staleTime: 10000,
  });
}

export function useDaoProposals(daoId: number | null) {
  const contract = useTreasuryContract();
  return useQuery<Proposal[], Error>({
    queryKey: ["proposals", daoId],
    queryFn: () => (contract ? contract.getDaoProposals(daoId!) : Promise.resolve([])),
    enabled: !!contract && daoId !== null,
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

export function useCreateDao() {
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, constitution }: { name: string; constitution: string }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.createDao(name, constitution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daos"] });
      success("DAO registered", { description: "Your DAO has been added to the registry." });
    },
    onError: (err: any) => {
      error("Failed to register DAO", { description: err?.message || "Please try again." });
    },
  });
}

export function useSubmitProposal() {
  const contract = useTreasuryContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      daoId,
      title,
      description,
      requestedAmount,
      recipient,
      targetCouncil,
      rationale,
    }: {
      daoId: number;
      title: string;
      description: string;
      requestedAmount: string;
      recipient: string;
      targetCouncil: string;
      rationale: string;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      return contract.submitProposal(daoId, title, description, requestedAmount, recipient, targetCouncil, rationale);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.daoId] });
      queryClient.invalidateQueries({ queryKey: ["daos"] });
      success("Proposal submitted", { description: "Your proposal has been added to the docket." });
    },
    onError: (err: any) => {
      error("Failed to submit proposal", { description: err?.message || "Please try again." });
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
      success("Evaluation complete", { description: "AI validators have reached consensus." });
    },
    onError: (err: any) => {
      error("Evaluation failed", { description: err?.message || "Please try again." });
    },
  });
}
