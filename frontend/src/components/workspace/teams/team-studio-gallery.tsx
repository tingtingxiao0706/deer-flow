"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  useCreateTeam,
  useDeleteTeam,
  useEnableTeam,
  useTeams,
} from "@/core/teams";

import { CreateTeamDialog } from "./create-team-dialog";
import { DraftTeamCard } from "./draft-team-card";

export function TeamStudioGallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { teams, total, isLoading } = useTeams({
    status: "draft",
    q: searchQuery || undefined,
  });

  const createTeam = useCreateTeam();
  const enableTeam = useEnableTeam();
  const deleteTeam = useDeleteTeam();

  const handleCreate = useCallback(
    async (data: {
      name: string;
      description: string;
      icon: string;
      tag: string;
    }) => {
      try {
        await createTeam.mutateAsync(data);
        setCreateOpen(false);
        toast.success("团队创建成功");
      } catch {
        toast.error("创建团队失败");
      }
    },
    [createTeam],
  );

  const handleEnable = useCallback(
    async (id: string) => {
      try {
        await enableTeam.mutateAsync(id);
        toast.success("团队已启用，已加入专家团队列表");
      } catch {
        toast.error("启用团队失败");
      }
    },
    [enableTeam],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTeam.mutateAsync(id);
        toast.success("团队已删除");
      } catch {
        toast.error("删除团队失败");
      }
    },
    [deleteTeam],
  );

  return (
    <div className="flex size-full flex-col">
      <div className="px-8 pt-6">
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold">
          🏗️ 团队工作室
        </h1>
        <p className="text-muted-foreground mt-1 text-[13px]">
          草稿区 · 增删改查团队配置 · 启用后进入专家团队列表
        </p>
      </div>

      <div className="flex items-center gap-3 px-8 py-4">
        <div className="relative max-w-[380px] flex-1">
          <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="搜索团队名称..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <span className="text-muted-foreground text-xs">
          {total} 个草稿团队
        </span>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition hover:-translate-y-px hover:shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          新建团队
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            正在加载团队列表...
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {/* Create new team card */}
            <div
              className="text-muted-foreground flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-400"
              onClick={() => setCreateOpen(true)}
            >
              <span className="text-[32px] font-light leading-none">＋</span>
              <span className="text-[13px] font-medium">创建新团队</span>
              <span className="text-[11px]">
                从零开始组建你的智能体团队
              </span>
            </div>

            {teams.map((team) => (
              <DraftTeamCard
                key={team.id}
                team={team}
                onEnable={handleEnable}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createTeam.isPending}
      />
    </div>
  );
}
