const STORAGE_KEY = "deer-flow:team-thread-map";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Remember that a LangGraph thread was opened from a team chat so Recent Chats can link back. */
export function registerTeamThread(threadId: string, teamId: string): void {
  const map = readMap();
  map[threadId] = teamId;
  writeMap(map);
}

export function getTeamIdForThread(threadId: string): string | undefined {
  return readMap()[threadId];
}

export function unregisterTeamThread(threadId: string): void {
  const map = readMap();
  if (!(threadId in map)) return;
  delete map[threadId];
  writeMap(map);
}
