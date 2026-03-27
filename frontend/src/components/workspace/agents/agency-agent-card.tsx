"use client";

import { PlayIcon, PowerOffIcon, ZapIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AgencyAgentCard } from "@/core/agency";
import { useActivateAgent } from "@/core/agency";

const STATUS_CONFIG = {
  dormant: { label: "休眠", color: "bg-gray-400" },
  instantiating: { label: "启动中", color: "bg-yellow-400 animate-pulse" },
  running: { label: "运行中", color: "bg-green-400" },
  idle: { label: "空闲", color: "bg-blue-400" },
  error: { label: "错误", color: "bg-red-400" },
} as const;

const COLOR_MAP: Record<string, string> = {
  cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
  purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  red: "from-red-500/10 to-red-500/5 border-red-500/20",
  blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  green: "from-green-500/10 to-green-500/5 border-green-500/20",
  yellow: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20",
  orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
  pink: "from-pink-500/10 to-pink-500/5 border-pink-500/20",
  indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
};

interface AgencyAgentCardProps {
  agent: AgencyAgentCard;
}

export function AgencyAgentCardComponent({ agent }: AgencyAgentCardProps) {
  const router = useRouter();
  const activate = useActivateAgent();
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.dormant;
  const gradientClass = COLOR_MAP[agent.color] ?? "from-primary/10 to-primary/5 border-primary/20";

  function handleViewDetail() {
    router.push(`/workspace/agents/agency/${agent.id}`);
  }

  async function handleActivate() {
    await activate.mutateAsync(agent.id);
  }

  return (
    <Card
      className={`group flex cursor-pointer flex-col bg-gradient-to-br transition-all hover:shadow-lg hover:-translate-y-0.5 ${gradientClass}`}
      onClick={handleViewDetail}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{agent.emoji || agent.divisionEmoji}</span>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">
                {agent.name}
              </CardTitle>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                <span>{agent.divisionEmoji} {agent.divisionLabel}</span>
                <span className="flex items-center gap-1">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusCfg.color}`} />
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        {agent.vibe && (
          <CardDescription className="mt-1.5 line-clamp-2 text-xs italic">
            {agent.vibe}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-0 pb-2">
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {agent.description}
        </p>
        {agent.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-3">
        {agent.status === "running" ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={(e) => { e.stopPropagation(); handleViewDetail(); }}
          >
            <ZapIcon className="mr-1 h-3 w-3" />
            查看运行状态
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full text-xs"
            disabled={activate.isPending}
            onClick={(e) => { e.stopPropagation(); handleActivate(); }}
          >
            <PlayIcon className="mr-1 h-3 w-3" />
            {activate.isPending ? "启动中..." : "激活"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
