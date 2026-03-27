"use client";

import { ArrowLeftIcon, LayoutGridIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { TeamCollaborationSidebar } from "@/components/workspace/teams/team-collaboration-sidebar";
import { TeamMessageList } from "@/components/workspace/teams/team-message-list";
import { InputBox } from "@/components/workspace/input-box";
import { ThreadContext } from "@/components/workspace/messages/context";
import { useAgencyAgents } from "@/core/agency";
import { useLocalSettings } from "@/core/settings";
import { useStartTeamChat, useTeam, stopTeamChat, stopTeamChatBeacon } from "@/core/teams";
import { useThreadStream } from "@/core/threads/hooks";
import { uuid } from "@/core/utils/uuid";
import { cn } from "@/lib/utils";

interface MemberStatus {
  agentId: string;
  status: "idle" | "working" | "done";
  taskDescription?: string;
}

export default function TeamChatPage() {
  const router = useRouter();
  const { id: teamId } = useParams<{ id: string }>();
  const [settings, setSettings] = useLocalSettings();
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { agents: agencyAgents } = useAgencyAgents();
  const startChat = useStartTeamChat();

  const [commanderName, setCommanderName] = useState<string | null>(null);
  const [threadId] = useState(() => uuid());
  const [isNewThread, setIsNewThread] = useState(true);
  const [memberStatuses, setMemberStatuses] = useState<MemberStatus[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!team) return;
    setMemberStatuses(
      team.members.map((m) => ({
        agentId: m.agentId,
        status: "idle" as const,
      })),
    );
  }, [team]);

  useEffect(() => {
    if (!teamId || commanderName) return;
    startChat
      .mutateAsync(teamId)
      .then((res) => {
        setCommanderName(res.commanderAgentName);
      })
      .catch((err) => {
        console.error("启动团队聊天失败:", err);
      });
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;

    const handleBeforeUnload = () => {
      stopTeamChatBeacon(teamId);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void stopTeamChat(teamId);
    };
  }, [teamId]);

  const [thread, sendMessage] = useThreadStream({
    threadId: isNewThread ? undefined : threadId,
    context: {
      ...settings.context,
      agent_name: commanderName ?? undefined,
    },
    onStart: () => {
      setIsNewThread(false);
    },
  });

  useEffect(() => {
    if (!thread.messages || thread.messages.length === 0) return;
    const newStatuses = memberStatuses.map((ms) => ({ ...ms }));
    for (const msg of thread.messages) {
      if (msg.type === "ai" && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.name === "task") {
            const prompt: string = tc.args?.prompt ?? "";
            const member = newStatuses.find((ms) =>
              prompt.includes(ms.agentId),
            );
            if (member) {
              member.status = "working";
              member.taskDescription = tc.args?.description ?? "";
            }
          }
        }
      }
      if (msg.type === "tool" && msg.tool_call_id) {
        const content =
          typeof msg.content === "string" ? msg.content : "";
        if (content.startsWith("Task Succeeded")) {
          const working = newStatuses.find((ms) => ms.status === "working");
          if (working) working.status = "done";
        }
      }
    }
    setMemberStatuses(newStatuses);
  }, [thread.messages]);

  const agentInfoMap = useMemo(() => {
    const map: Record<string, { name: string; emoji: string; skills: string[] }> = {};
    for (const agent of agencyAgents) {
      map[agent.id] = {
        name: agent.name,
        emoji: agent.emoji,
        skills: agent.tags ?? [],
      };
    }
    return map;
  }, [agencyAgents]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!commanderName) return;
      void sendMessage(threadId, message, {
        agent_name: commanderName,
      });
    },
    [sendMessage, threadId, commanderName],
  );

  const handleStop = useCallback(async () => {
    await thread.stop();
  }, [thread]);

  if (teamLoading || !team) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-muted-foreground text-sm">加载团队信息...</div>
      </div>
    );
  }

  return (
    <ThreadContext.Provider value={{ thread }}>
      <div className="flex size-full flex-col">
        {/* Header */}
        <header className="bg-background/80 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/workspace/teams")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-lg">{team.icon}</span>
            <div>
              <h1 className="text-sm font-semibold">{team.name}</h1>
              <p className="text-muted-foreground text-[11px]">
                {team.members.length} 个成员 · {team.connections.length} 条连线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2">
            {team.members.slice(0, 6).map((m) => {
              const info = agentInfoMap[m.agentId];
              return (
                <div
                  key={m.agentId}
                  className="bg-muted flex h-7 w-7 items-center justify-center rounded-full border text-sm"
                  title={info?.name ?? m.agentId}
                >
                  {info?.emoji ?? "🤖"}
                </div>
              );
            })}
            {team.members.length > 6 && (
              <div className="text-muted-foreground text-xs">
                +{team.members.length - 6}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/workspace/teams/${teamId}`)}
            >
              <LayoutGridIcon className="mr-1 h-3.5 w-3.5" />
              编排详情
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? "收起详情" : "协作详情"}
            </Button>
          </div>
        </header>

        {/* Body: chat + sidebar */}
        <div className="flex min-h-0 flex-1">
          {/* Chat area */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <main className="flex min-h-0 flex-1 flex-col">
              <div className="flex size-full justify-center">
                <TeamMessageList
                  className="size-full"
                  threadId={threadId}
                  thread={thread}
                  team={team}
                  agentInfoMap={agentInfoMap}
                />
              </div>

              <div className="z-30 flex justify-center px-4 pb-4">
                <div className="relative w-full max-w-(--container-width-md)">
                  <InputBox
                    className="bg-background/5 w-full"
                    isNewThread={isNewThread}
                    threadId={threadId}
                    autoFocus
                    status={
                      thread.error
                        ? "error"
                        : thread.isLoading
                          ? "streaming"
                          : "ready"
                    }
                    context={settings.context}
                    disabled={!commanderName}
                    onContextChange={(context) =>
                      setSettings("context", context)
                    }
                    onSubmit={handleSubmit}
                    onStop={handleStop}
                  />
                </div>
              </div>
            </main>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <TeamCollaborationSidebar
              team={team}
              agentInfoMap={agentInfoMap}
              memberStatuses={memberStatuses}
              connections={team.connections}
            />
          )}
        </div>
      </div>
    </ThreadContext.Provider>
  );
}
