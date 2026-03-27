"use client";

import type { TeamConnection, TeamDefinition } from "@/core/teams";
import { cn } from "@/lib/utils";

interface AgentInfo {
  name: string;
  emoji: string;
  skills: string[];
}

interface MemberStatus {
  agentId: string;
  status: "idle" | "working" | "done";
  taskDescription?: string;
}

interface TeamCollaborationSidebarProps {
  team: TeamDefinition;
  agentInfoMap: Record<string, AgentInfo>;
  memberStatuses: MemberStatus[];
  connections: TeamConnection[];
}

const STATUS_CONFIG = {
  idle: {
    label: "待命",
    badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
    dot: "bg-zinc-400",
  },
  working: {
    label: "进行中",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    dot: "bg-blue-400 animate-pulse",
  },
  done: {
    label: "已完成",
    badge: "border-green-500/30 bg-green-500/10 text-green-400",
    dot: "bg-green-400",
  },
};

const MEMBER_COLORS = [
  "border-l-violet-500",
  "border-l-rose-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-cyan-500",
  "border-l-pink-500",
];

export function TeamCollaborationSidebar({
  team,
  agentInfoMap,
  memberStatuses,
  connections,
}: TeamCollaborationSidebarProps) {
  const doneCount = memberStatuses.filter((m) => m.status === "done").length;
  const workingCount = memberStatuses.filter((m) => m.status === "working").length;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          📋 协作详情
        </h3>
        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            {doneCount} 已完成
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            {workingCount} 进行中
          </span>
          <span>{team.members.length} 总成员</span>
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {team.members.map((member, idx) => {
            const info = agentInfoMap[member.agentId];
            const ms = memberStatuses.find((s) => s.agentId === member.agentId);
            const statusKey = ms?.status ?? "idle";
            const config = STATUS_CONFIG[statusKey];
            const borderColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];

            return (
              <div
                key={member.agentId}
                className={cn(
                  "rounded-lg border border-l-2 p-3 transition-all",
                  borderColor,
                  statusKey === "working" && "bg-blue-500/5",
                )}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {info?.emoji ?? "🤖"}
                    </span>
                    <div>
                      <div className="text-xs font-semibold">
                        {info?.name ?? member.agentId}
                      </div>
                      {member.roleInTeam && (
                        <div className="text-muted-foreground text-[10px]">
                          {member.roleInTeam}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      config.badge,
                    )}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", config.dot)} />
                    {config.label}
                  </span>
                </div>

                {/* Skills */}
                {info?.skills && info.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {info.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="text-muted-foreground rounded border px-1.5 py-0.5 text-[10px]"
                      >
                        {skill}
                      </span>
                    ))}
                    {info.skills.length > 4 && (
                      <span className="text-muted-foreground text-[10px]">
                        +{info.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {ms?.taskDescription && statusKey !== "idle" && (
                  <div className="text-muted-foreground mt-1.5 text-[10px]">
                    {statusKey === "working" ? "📝 " : "✅ "}
                    {ms.taskDescription}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Workflow */}
        {connections.length > 0 && (
          <div className="mt-4">
            <h4 className="text-muted-foreground mb-2 text-[11px] font-medium uppercase tracking-wider">
              工作流
            </h4>
            <div className="space-y-1.5">
              {connections.map((conn, idx) => {
                const fromInfo = agentInfoMap[conn.fromAgent];
                const toInfo = agentInfoMap[conn.toAgent];
                return (
                  <div
                    key={idx}
                    className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
                  >
                    <span>{fromInfo?.emoji ?? "🤖"}</span>
                    <span className="truncate">
                      {fromInfo?.name ?? conn.fromAgent}
                    </span>
                    <span className="text-muted-foreground/50">→</span>
                    <span>{toInfo?.emoji ?? "🤖"}</span>
                    <span className="truncate">
                      {toInfo?.name ?? conn.toAgent}
                    </span>
                    {conn.label && (
                      <span className="ml-auto truncate opacity-50">
                        {conn.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
