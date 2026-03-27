"use client";

import type { Message } from "@langchain/langgraph-sdk";
import type { BaseStream } from "@langchain/langgraph-sdk/react";
import { ArrowRightIcon } from "lucide-react";
import { memo, useMemo } from "react";
import rehypeKatex from "rehype-katex";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  extractContentFromMessage,
  extractTextFromMessage,
  groupMessages,
  hasContent,
  hasReasoning,
} from "@/core/messages/utils";
import { useRehypeSplitWordsIntoSpans } from "@/core/rehype";
import type { AgentThreadState } from "@/core/threads";
import type { TeamDefinition } from "@/core/teams";
import { cn } from "@/lib/utils";

import { StreamingIndicator } from "../streaming-indicator";
import { MessageGroup } from "../messages/message-group";
import { MarkdownContent } from "../messages/markdown-content";
import { MessageListSkeleton } from "../messages/skeleton";

interface AgentInfo {
  name: string;
  emoji: string;
  skills: string[];
}

interface TeamMessageListProps {
  className?: string;
  threadId: string;
  thread: BaseStream<AgentThreadState>;
  team: TeamDefinition;
  agentInfoMap: Record<string, AgentInfo>;
}

function extractAgentFromTask(prompt: string, memberIds: string[]): string | null {
  for (const id of memberIds) {
    if (prompt.includes(id)) return id;
  }
  return null;
}

interface ParsedTeamMessage {
  type: "user" | "commander" | "agent-task" | "agent-result" | "workflow-transition";
  message?: Message;
  agentId?: string;
  fromAgent?: string;
  toAgent?: string;
  taskDescription?: string;
  taskPrompt?: string;
  resultText?: string;
  isSuccess?: boolean;
}

function parseTeamMessages(
  messages: Message[],
  memberIds: string[],
  connections: TeamDefinition["connections"],
): ParsedTeamMessage[] {
  const result: ParsedTeamMessage[] = [];
  const taskToAgent: Record<string, string> = {};
  let lastCompletedAgent: string | null = null;

  for (const msg of messages) {
    if (msg.type === "human") {
      result.push({ type: "user", message: msg });
      continue;
    }

    if (msg.type === "ai") {
      const toolCalls = msg.tool_calls ?? [];
      const taskCalls = toolCalls.filter((tc) => tc.name === "task");

      if (taskCalls.length > 0) {
        for (const tc of taskCalls) {
          const prompt: string = tc.args?.prompt ?? "";
          const agentId = extractAgentFromTask(prompt, memberIds);
          if (agentId && tc.id) {
            taskToAgent[tc.id] = agentId;

            if (lastCompletedAgent) {
              const conn = connections.find(
                (c) => c.fromAgent === lastCompletedAgent && c.toAgent === agentId,
              );
              if (conn) {
                result.push({
                  type: "workflow-transition",
                  fromAgent: lastCompletedAgent,
                  toAgent: agentId,
                  taskDescription: conn.label || "流转",
                });
              }
            }

            result.push({
              type: "agent-task",
              message: msg,
              agentId,
              taskDescription: tc.args?.description ?? "",
              taskPrompt: prompt,
            });
          }
        }
      } else if (hasContent(msg)) {
        result.push({ type: "commander", message: msg });
      }
      continue;
    }

    if (msg.type === "tool" && msg.tool_call_id) {
      const agentId = taskToAgent[msg.tool_call_id];
      const content = typeof msg.content === "string" ? msg.content : "";
      const isSuccess = content.startsWith("Task Succeeded");

      if (agentId) {
        let resultText = content;
        if (isSuccess) {
          resultText = content.split("Task Succeeded. Result:")[1]?.trim() ?? content;
          lastCompletedAgent = agentId;
        }
        result.push({
          type: "agent-result",
          message: msg,
          agentId,
          resultText,
          isSuccess,
        });
      }
      continue;
    }
  }

  return result;
}

const AGENT_COLORS: Record<number, string> = {
  0: "border-violet-500/40 bg-violet-500/10",
  1: "border-rose-500/40 bg-rose-500/10",
  2: "border-emerald-500/40 bg-emerald-500/10",
  3: "border-amber-500/40 bg-amber-500/10",
  4: "border-cyan-500/40 bg-cyan-500/10",
  5: "border-pink-500/40 bg-pink-500/10",
};

function TeamMessageList_({
  className,
  threadId,
  thread,
  team,
  agentInfoMap,
}: TeamMessageListProps) {
  const rehypePlugins = useRehypeSplitWordsIntoSpans(thread.isLoading);
  const messages = thread.messages;
  const memberIds = useMemo(() => team.members.map((m) => m.agentId), [team.members]);
  const agentColorIndex = useMemo(() => {
    const map: Record<string, number> = {};
    team.members.forEach((m, i) => {
      map[m.agentId] = i % Object.keys(AGENT_COLORS).length;
    });
    return map;
  }, [team.members]);

  const parsed = useMemo(
    () => parseTeamMessages(messages, memberIds, team.connections),
    [messages, memberIds, team.connections],
  );

  if (thread.isThreadLoading && messages.length === 0) {
    return <MessageListSkeleton />;
  }

  return (
    <Conversation className={cn("flex size-full flex-col justify-center", className)}>
      <ConversationContent className="mx-auto w-full max-w-(--container-width-md) gap-6 px-4 pt-6">
        {/* Welcome */}
        {parsed.length === 0 && !thread.isLoading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="text-4xl">{team.icon}</div>
            <h2 className="text-lg font-semibold">{team.name}</h2>
            <p className="text-muted-foreground max-w-md text-center text-sm">
              输入任务描述，团队将根据编排分工自动协作完成
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {team.members.map((m) => {
                const info = agentInfoMap[m.agentId];
                return (
                  <div
                    key={m.agentId}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  >
                    <span>{info?.emoji ?? "🤖"}</span>
                    <span>{info?.name ?? m.agentId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {parsed.map((item, idx) => {
          if (item.type === "user" && item.message) {
            return (
              <div key={`user-${idx}`} className="flex justify-end">
                <div className="bg-primary text-primary-foreground max-w-[70%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                  <MarkdownContent
                    content={extractContentFromMessage(item.message)}
                    isLoading={false}
                    rehypePlugins={[[rehypeKatex, { output: "html" }]]}
                  />
                </div>
              </div>
            );
          }

          if (item.type === "commander" && item.message) {
            const content = extractContentFromMessage(item.message);
            if (!content) return null;
            return (
              <div key={`cmd-${idx}`} className="flex gap-3">
                <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm">
                  🎯
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground mb-1 text-[11px] font-medium">
                    Lead Agent · 指挥官
                  </div>
                  <div className="rounded-xl border p-3 text-sm">
                    <MarkdownContent
                      content={content}
                      isLoading={thread.isLoading && idx === parsed.length - 1}
                      rehypePlugins={[...rehypePlugins, [rehypeKatex, { output: "html" }]]}
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === "workflow-transition") {
            const fromInfo = agentInfoMap[item.fromAgent ?? ""];
            const toInfo = agentInfoMap[item.toAgent ?? ""];
            return (
              <div
                key={`wf-${idx}`}
                className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
              >
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="flex items-center gap-1.5 rounded-full border px-3 py-1">
                  {fromInfo?.emoji ?? "🤖"}{" "}
                  <span className="font-medium">{fromInfo?.name ?? item.fromAgent}</span>
                  <ArrowRightIcon className="h-3 w-3" />
                  {toInfo?.emoji ?? "🤖"}{" "}
                  <span className="font-medium">{toInfo?.name ?? item.toAgent}</span>
                  {item.taskDescription && (
                    <span className="ml-1 opacity-70">
                      {item.taskDescription}
                    </span>
                  )}
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            );
          }

          if (item.type === "agent-task" && item.agentId) {
            const info = agentInfoMap[item.agentId];
            const colorIdx = agentColorIndex[item.agentId] ?? 0;
            const colorClass = AGENT_COLORS[colorIdx] ?? AGENT_COLORS[0];
            return (
              <div key={`task-${idx}`} className="flex gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
                    colorClass,
                  )}
                >
                  {info?.emoji ?? "🤖"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold">
                      {info?.name ?? item.agentId}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {item.taskDescription}
                    </span>
                  </div>
                  <div className={cn("rounded-xl border p-3 text-sm", colorClass)}>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      正在处理任务...
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === "agent-result" && item.agentId) {
            const info = agentInfoMap[item.agentId];
            const colorIdx = agentColorIndex[item.agentId] ?? 0;
            const colorClass = AGENT_COLORS[colorIdx] ?? AGENT_COLORS[0];
            return (
              <div key={`result-${idx}`} className="flex gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
                    colorClass,
                  )}
                >
                  {info?.emoji ?? "🤖"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold">
                      {info?.name ?? item.agentId}
                    </span>
                    {item.isSuccess && (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                        已完成
                      </span>
                    )}
                  </div>
                  <div className={cn("rounded-xl border p-3 text-sm", colorClass)}>
                    <MarkdownContent
                      content={item.resultText ?? ""}
                      isLoading={false}
                      rehypePlugins={[...rehypePlugins, [rehypeKatex, { output: "html" }]]}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {thread.isLoading && <StreamingIndicator className="my-4" />}
        <div style={{ height: "120px" }} />
      </ConversationContent>
    </Conversation>
  );
}

export const TeamMessageList = memo(TeamMessageList_);
