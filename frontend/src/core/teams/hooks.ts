import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTeam,
  deleteTeam,
  disableTeam,
  enableTeam,
  getTeam,
  listTeams,
  startTeamChat,
  updateTeam,
} from "./api";
import type { CreateTeamRequest, UpdateTeamRequest } from "./types";

export function useTeams(params?: { status?: string; q?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teams", params],
    queryFn: () => listTeams(params),
  });

  return {
    teams: data?.teams ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeam(id),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamRequest }) =>
      updateTeam(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useEnableTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enableTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDisableTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disableTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useStartTeamChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startTeamChat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
