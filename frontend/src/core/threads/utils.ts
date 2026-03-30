import type { Message } from "@langchain/langgraph-sdk";

import type { AgentThread } from "./types";

import { getTeamIdForThread } from "./team-thread-links";

function teamIdFromThreadValues(thread: AgentThread | null | undefined): string | undefined {
  const v = thread?.values as { team_id?: string } | undefined;
  const id = v?.team_id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

/** Open URL for a thread: team sessions go to `/workspace/teams/{teamId}/chat?thread=…`. */
export function pathOfThread(threadId: string, thread?: AgentThread | null) {
  const teamId = teamIdFromThreadValues(thread) ?? getTeamIdForThread(threadId);
  if (teamId) {
    return `/workspace/teams/${encodeURIComponent(teamId)}/chat?thread=${encodeURIComponent(threadId)}`;
  }
  return `/workspace/chats/${threadId}`;
}

export function textOfMessage(message: Message) {
  if (typeof message.content === "string") {
    return message.content;
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "text") {
        return part.text;
      }
    }
  }
  return null;
}

export function titleOfThread(thread: AgentThread) {
  return thread.values?.title ?? "Untitled";
}
