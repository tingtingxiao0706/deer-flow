import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateAgent,
  addCustomSkill,
  deactivateAgent,
  deleteCustomSkill,
  getAgencyAgent,
  listAgencyAgents,
  listDivisions,
} from "./api";
import type { CustomSkill } from "./types";

export function useAgencyAgents(params?: {
  division?: string;
  status?: string;
  q?: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["agency-agents", params],
    queryFn: () => {
      console.log("[useAgencyAgents] fetching agents...", params);
      return listAgencyAgents(params);
    },
  });

  if (error) {
    console.error("[useAgencyAgents] error:", error);
  }

  return {
    agents: data?.agents ?? [],
    total: data?.total ?? 0,
    divisions: data?.divisions ?? [],
    isLoading,
    error,
  };
}

export function useAgencyAgent(id: string) {
  return useQuery({
    queryKey: ["agency-agent", id],
    queryFn: () => getAgencyAgent(id),
    enabled: !!id,
  });
}

export function useDivisions() {
  return useQuery({
    queryKey: ["agency-divisions"],
    queryFn: listDivisions,
  });
}

export function useActivateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => activateAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-agents"] });
    },
  });
}

export function useDeactivateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => deactivateAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-agents"] });
    },
  });
}

export function useAddCustomSkill(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skill: CustomSkill) => addCustomSkill(agentId, skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-agent", agentId] });
    },
  });
}

export function useDeleteCustomSkill(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => deleteCustomSkill(agentId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-agent", agentId] });
    },
  });
}
