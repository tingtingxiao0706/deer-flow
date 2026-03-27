"use client";

import { useRouter } from "next/navigation";

import type { TeamSummary } from "@/core/teams";

interface ExpertTeamCardProps {
  team: TeamSummary;
  onDisable: (id: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  primary: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
  green: "border-green-500/30 bg-green-500/10 text-green-400",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
};

export function ExpertTeamCard({ team, onDisable }: ExpertTeamCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-card group relative cursor-pointer overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg"
      onClick={() => router.push(`/workspace/teams/${team.id}/chat`)}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-green-500 to-cyan-500" />

      <div className="mb-3 flex items-start justify-between">
        <div className="text-[15px] font-semibold">
          {team.icon} {team.name}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
            ● 已启用
          </span>
          {team.tag && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TAG_COLORS[team.tagColor] ?? TAG_COLORS.primary}`}
            >
              {team.tag}
            </span>
          )}
        </div>
      </div>

      <p className="text-muted-foreground mb-4 line-clamp-2 text-xs leading-relaxed">
        {team.description || "暂无描述"}
      </p>

      <div className="text-muted-foreground mb-3 flex items-center justify-between text-[11px]">
        <span>{team.memberCount} 个成员 · {team.connCount} 条连线</span>
      </div>

      <div className="flex gap-1.5">
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/workspace/teams/${team.id}/chat`);
          }}
        >
          💬 进入聊天
        </button>
        <button
          className="hover:bg-accent cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium transition"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/workspace/teams/${team.id}`);
          }}
        >
          📐 查看详情
        </button>
        <button
          className="hover:bg-accent cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium transition"
          onClick={(e) => {
            e.stopPropagation();
            onDisable(team.id);
          }}
        >
          ⏸ 停用
        </button>
      </div>
    </div>
  );
}
