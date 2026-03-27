"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { TeamEditor } from "@/components/workspace/teams/team-editor";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/core/teams";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: team, isLoading, error } = useTeam(id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">团队不存在</p>
        <Button variant="outline" onClick={() => router.push("/workspace/teams")}>
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          返回团队工作室
        </Button>
      </div>
    );
  }

  return <TeamEditor team={team} />;
}
