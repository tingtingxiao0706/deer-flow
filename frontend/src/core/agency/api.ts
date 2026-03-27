import { getBackendBaseURL } from "@/core/config";

import type {
  ActivateResponse,
  AgencyAgentDetail,
  AgencyListResponse,
  CustomSkill,
  Division,
} from "./types";

const BASE = () => `${getBackendBaseURL()}/api/agency`;

export async function listAgencyAgents(params?: {
  division?: string;
  status?: string;
  q?: string;
}): Promise<AgencyListResponse> {
  const url = new URL(`${BASE()}/agents`, window.location.origin);
  if (params?.division) url.searchParams.set("division", params.division);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.q) url.searchParams.set("q", params.q);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to load agency agents: ${res.statusText}`);
  return res.json() as Promise<AgencyListResponse>;
}

export async function getAgencyAgent(id: string): Promise<AgencyAgentDetail> {
  const res = await fetch(`${BASE()}/agents/${id}`);
  if (!res.ok) throw new Error(`Agent '${id}' not found`);
  return res.json() as Promise<AgencyAgentDetail>;
}

export async function listDivisions(): Promise<Division[]> {
  const res = await fetch(`${BASE()}/divisions`);
  if (!res.ok) throw new Error(`Failed to load divisions: ${res.statusText}`);
  return res.json() as Promise<Division[]>;
}

export async function activateAgent(id: string): Promise<ActivateResponse> {
  const res = await fetch(`${BASE()}/agents/${id}/activate`, { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Failed to activate agent: ${res.statusText}`);
  }
  return res.json() as Promise<ActivateResponse>;
}

export async function deactivateAgent(id: string): Promise<void> {
  const res = await fetch(`${BASE()}/agents/${id}/deactivate`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to deactivate agent: ${res.statusText}`);
}

export async function listCustomSkills(agentId: string): Promise<CustomSkill[]> {
  const res = await fetch(`${BASE()}/agents/${agentId}/custom-skills`);
  if (!res.ok) throw new Error(`Failed to load custom skills: ${res.statusText}`);
  return res.json() as Promise<CustomSkill[]>;
}

export async function addCustomSkill(
  agentId: string,
  skill: CustomSkill,
): Promise<CustomSkill> {
  const res = await fetch(`${BASE()}/agents/${agentId}/custom-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
  if (!res.ok) throw new Error(`Failed to add custom skill: ${res.statusText}`);
  return res.json() as Promise<CustomSkill>;
}

export async function deleteCustomSkill(
  agentId: string,
  skillId: string,
): Promise<void> {
  const res = await fetch(`${BASE()}/agents/${agentId}/custom-skills/${skillId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete custom skill: ${res.statusText}`);
}
