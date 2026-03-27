import { getBackendBaseURL } from "@/core/config";

import type {
  CreateTeamRequest,
  StartTeamResponse,
  TeamDefinition,
  TeamListResponse,
  UpdateTeamRequest,
} from "./types";

const BASE = () => `${getBackendBaseURL()}/api/teams`;

export async function listTeams(params?: {
  status?: string;
  q?: string;
}): Promise<TeamListResponse> {
  const url = new URL(`${BASE()}`, window.location.origin);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.q) url.searchParams.set("q", params.q);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to load teams: ${res.statusText}`);
  return res.json() as Promise<TeamListResponse>;
}

export async function getTeam(id: string): Promise<TeamDefinition> {
  const res = await fetch(`${BASE()}/${id}`);
  if (!res.ok) throw new Error(`Team '${id}' not found`);
  return res.json() as Promise<TeamDefinition>;
}

export async function createTeam(
  data: CreateTeamRequest,
): Promise<TeamDefinition> {
  const res = await fetch(`${BASE()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Failed to create team: ${res.statusText}`);
  }
  return res.json() as Promise<TeamDefinition>;
}

export async function updateTeam(
  id: string,
  data: UpdateTeamRequest,
): Promise<TeamDefinition> {
  const res = await fetch(`${BASE()}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Failed to update team: ${res.statusText}`);
  }
  return res.json() as Promise<TeamDefinition>;
}

export async function deleteTeam(id: string): Promise<void> {
  const res = await fetch(`${BASE()}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete team: ${res.statusText}`);
}

export async function enableTeam(id: string): Promise<TeamDefinition> {
  const res = await fetch(`${BASE()}/${id}/enable`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to enable team: ${res.statusText}`);
  return res.json() as Promise<TeamDefinition>;
}

export async function disableTeam(id: string): Promise<TeamDefinition> {
  const res = await fetch(`${BASE()}/${id}/disable`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to disable team: ${res.statusText}`);
  return res.json() as Promise<TeamDefinition>;
}

export async function startTeamChat(
  id: string,
): Promise<StartTeamResponse> {
  const res = await fetch(`${BASE()}/${id}/start`, { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Failed to start team chat: ${res.statusText}`);
  }
  return res.json() as Promise<StartTeamResponse>;
}

export async function stopTeamChat(id: string): Promise<void> {
  try {
    await fetch(`${BASE()}/${id}/stop`, { method: "POST" });
  } catch {
    // best-effort cleanup, ignore network errors
  }
}

export function stopTeamChatBeacon(id: string): void {
  const base = BASE();
  const url = base.startsWith("http")
    ? `${base}/${id}/stop`
    : `${window.location.origin}${base}/${id}/stop`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    try {
      void fetch(url, { method: "POST", keepalive: true });
    } catch {
      // best-effort cleanup
    }
  }
}
