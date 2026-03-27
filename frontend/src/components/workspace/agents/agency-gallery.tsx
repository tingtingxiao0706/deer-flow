"use client";

import { SearchIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAgencyAgents } from "@/core/agency";

import { AgencyAgentCardComponent } from "./agency-agent-card";

export function AgencyGallery() {
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const { agents, total, divisions, isLoading } = useAgencyAgents({
    division: selectedDivision,
    q: searchQuery || undefined,
  });

  return (
    <div className="flex size-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <UsersIcon className="h-5 w-5" />
              Agency 专家团队
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {total} 个专业角色 · {divisions.length} 个部门 · 按需实例化
            </p>
          </div>
        </div>

        {/* Search + Division Filter */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="搜索角色名称、技能、部门..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedDivision === undefined ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedDivision(undefined)}
            >
              全部
            </Badge>
            {divisions.map((div) => (
              <Badge
                key={div.id}
                variant={selectedDivision === div.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedDivision(
                    selectedDivision === div.id ? undefined : div.id,
                  )
                }
              >
                {div.emoji} {div.label} ({div.count})
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            正在加载专家角色...
          </div>
        ) : agents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <UsersIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">未找到匹配的角色</p>
              <p className="text-muted-foreground mt-1 text-sm">
                请尝试调整搜索条件或选择其他部门
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {agents.map((agent) => (
              <AgencyAgentCardComponent key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
