export interface TeamMember {
  agentId: string;
  agentType: "local" | "custom" | "remote";
  roleInTeam: string;
  executionMode: "autonomous" | "supervised" | "collaborative";
  enabledSkills: string[];
  position: { x: number; y: number };
}

export interface TeamConnection {
  fromAgent: string;
  toAgent: string;
  label: string;
  connType: "data" | "review" | "escalation";
}

export interface TeamDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  tagColor: string;
  status: "draft" | "active" | "running";
  members: TeamMember[];
  connections: TeamConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  tagColor: string;
  status: "draft" | "active" | "running";
  memberCount: number;
  connCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListResponse {
  teams: TeamSummary[];
  total: number;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  icon?: string;
  tag?: string;
  tagColor?: string;
  members?: TeamMember[];
  connections?: TeamConnection[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  icon?: string;
  tag?: string;
  tagColor?: string;
  members?: TeamMember[];
  connections?: TeamConnection[];
}

export interface StartTeamResponse {
  teamId: string;
  teamName: string;
  commanderAgentName: string;
  status: string;
  activatedMembers: string[];
  members: TeamMember[];
}
