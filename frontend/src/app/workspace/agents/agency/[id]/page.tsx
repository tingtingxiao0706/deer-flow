"use client";

import {
  ArrowLeftIcon,
  PlayIcon,
  PlusIcon,
  PowerOffIcon,
  ZapIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { SkillEditorDialog } from "@/components/workspace/agents/skill-editor-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useActivateAgent,
  useAgencyAgent,
  useDeactivateAgent,
} from "@/core/agency";

export default function AgencyAgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: agent, isLoading, error } = useAgencyAgent(id);
  const activate = useActivateAgent();
  const deactivate = useDeactivateAgent();
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">角色不存在</p>
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const isRunning = agent.status === "running";

  return (
    <div className="flex size-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={() => router.push("/workspace/agents/agency")}
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          返回专家团队
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{agent.emoji || agent.divisionEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {agent.divisionEmoji} {agent.divisionLabel} · {agent.role || agent.vibe}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isRunning ? (
              <Button
                variant="outline"
                onClick={() => deactivate.mutateAsync(agent.id)}
                disabled={deactivate.isPending}
              >
                <PowerOffIcon className="mr-1.5 h-4 w-4" />
                停用
              </Button>
            ) : (
              <Button
                onClick={() => activate.mutateAsync(agent.id)}
                disabled={activate.isPending}
              >
                <PlayIcon className="mr-1.5 h-4 w-4" />
                {activate.isPending ? "启动中..." : "激活角色"}
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950">
            <ZapIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              运行中 · A2A 端点: /a2a/{agent.id}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid gap-4 p-6 lg:grid-cols-2">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">角色描述</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {agent.description}
            </p>
            {agent.personality && (
              <div className="mt-3">
                <p className="text-xs font-medium">人设特征</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {agent.personality}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">核心技能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agent.skills.map((skill) => (
                <div key={skill.id} className="rounded-md border p-2.5">
                  <p className="text-sm font-medium">{skill.name}</p>
                  {skill.description && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {skill.description}
                    </p>
                  )}
                  {skill.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {skill.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflows */}
        {agent.workflows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">工作流程</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
                {agent.workflows.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Deliverables */}
        {agent.deliverables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">交付物</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                {agent.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Custom Skills */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">自定义技能</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSkillEditorOpen(true)}
              >
                <PlusIcon className="mr-1 h-3 w-3" />
                添加技能
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {agent.customSkills.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm py-6">
                尚未添加自定义技能。点击"添加技能"为该角色扩展能力。
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {agent.customSkills.map((cs) => (
                  <div
                    key={cs.id}
                    className="rounded-md border border-dashed p-2.5"
                  >
                    <p className="text-sm font-medium">{cs.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {cs.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <SkillEditorDialog
        agentId={agent.id}
        open={skillEditorOpen}
        onOpenChange={setSkillEditorOpen}
      />
    </div>
  );
}
