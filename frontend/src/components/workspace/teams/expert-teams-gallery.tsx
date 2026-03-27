"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useDisableTeam, useTeams } from "@/core/teams";

import { ExpertTeamCard } from "./expert-team-card";

export function ExpertTeamsGallery() {
  const [searchQuery, setSearchQuery] = useState("");

  const { teams, total, isLoading } = useTeams({
    status: "active",
    q: searchQuery || undefined,
  });

  const disableTeam = useDisableTeam();

  const handleDisable = useCallback(
    async (id: string) => {
      try {
        await disableTeam.mutateAsync(id);
        toast.success("团队已停用，已移回团队工作室");
      } catch {
        toast.error("停用团队失败");
      }
    },
    [disableTeam],
  );

  return (
    <div className="flex size-full flex-col">
      <div className="px-8 pt-6">
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold">
          👥 专家团队
        </h1>
        <p className="text-muted-foreground mt-1 text-[13px]">
          已启用的团队 · 点击进入聊天 · 查看详情进入编排
        </p>
      </div>

      <div className="flex items-center gap-3 px-8 py-4">
        <div className="relative max-w-[380px] flex-1">
          <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="搜索已启用的团队..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <span className="text-muted-foreground text-xs">
          {total} 个已启用团队
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            正在加载专家团队...
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-5xl opacity-30">👥</div>
            <p className="text-sm font-medium">还没有已启用的团队</p>
            <p className="text-muted-foreground mt-1.5 text-xs">
              在团队工作室中创建并启用团队
            </p>
            <Link
              href="/workspace/teams"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex cursor-pointer items-center rounded-md px-4 py-2 text-[13px] font-medium transition"
            >
              前往团队工作室
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {teams.map((team) => (
              <ExpertTeamCard
                key={team.id}
                team={team}
                onDisable={handleDisable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
