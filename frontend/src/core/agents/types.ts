export interface CustomSkillDef {
  id: string;
  name: string;
  description: string;
  tools: string[];
  references: string[];
  examples: string[];
}

export interface Agent {
  name: string;
  description: string;
  model: string | null;
  tool_groups: string[] | null;
  emoji: string;
  color: string;
  tags: string[];
  custom_skills: CustomSkillDef[];
  soul?: string | null;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  model?: string | null;
  tool_groups?: string[] | null;
  emoji?: string;
  color?: string;
  tags?: string[];
  custom_skills?: CustomSkillDef[];
  soul?: string;
}

export interface UpdateAgentRequest {
  description?: string | null;
  model?: string | null;
  tool_groups?: string[] | null;
  emoji?: string | null;
  color?: string | null;
  tags?: string[] | null;
  custom_skills?: CustomSkillDef[] | null;
  soul?: string | null;
}
