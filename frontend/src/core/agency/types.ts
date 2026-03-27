export interface AgencyAgentCard {
  id: string;
  name: string;
  division: string;
  divisionEmoji: string;
  divisionLabel: string;
  emoji: string;
  color: string;
  vibe: string;
  description: string;
  tags: string[];
  status: "dormant" | "instantiating" | "running" | "idle" | "error";
}

export interface AgencyAgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface AgencyAgentDetail extends AgencyAgentCard {
  personality: string;
  role: string;
  coreMission: string;
  skills: AgencyAgentSkill[];
  workflows: string[];
  deliverables: string[];
  successMetrics: string[];
  customSkills: CustomSkill[];
}

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  tools: string[];
  references: string[];
  examples: string[];
}

export interface Division {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export interface AgencyListResponse {
  agents: AgencyAgentCard[];
  total: number;
  divisions: Division[];
}

export interface ActivateResponse {
  agentId: string;
  status: string;
  instanceId: string | null;
  a2aEndpoint: string | null;
  agentCard: Record<string, unknown> | null;
}
