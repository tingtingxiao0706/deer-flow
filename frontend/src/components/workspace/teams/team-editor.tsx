"use client";

import {
  ChevronRightIcon,
  LayoutGridIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Redo2Icon,
  SaveIcon,
  Trash2Icon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { AgencyAgentCard } from "@/core/agency/types";
import { useAgencyAgents } from "@/core/agency/hooks";
import { useAgents } from "@/core/agents";
import type { TeamDefinition, TeamMember } from "@/core/teams";
import { useUpdateTeam } from "@/core/teams";
import { cn } from "@/lib/utils";

const COLOR_GRADIENTS: Record<string, string> = {
  "#06b6d4": "linear-gradient(90deg, #06b6d4, #0891b2)",
  "#a855f7": "linear-gradient(90deg, #a855f7, #9333ea)",
  "#f97316": "linear-gradient(90deg, #f97316, #ea580c)",
  "#ef4444": "linear-gradient(90deg, #ef4444, #dc2626)",
  "#10b981": "linear-gradient(90deg, #10b981, #059669)",
  "#ec4899": "linear-gradient(90deg, #ec4899, #db2777)",
  "#6366f1": "linear-gradient(90deg, #6366f1, #4f46e5)",
  "#f59e0b": "linear-gradient(90deg, #f59e0b, #d97706)",
};

interface CanvasNode {
  id: string;
  agentId: string;
  emoji: string;
  name: string;
  role: string;
  color: string;
  x: number;
  y: number;
  skills: string[];
}

interface Connection {
  source: string;
  target: string;
}

interface CatalogDivision {
  id: string;
  label: string;
  emoji: string;
  agents: AgencyAgentCard[];
}

function buildCatalog(agents: AgencyAgentCard[], divisions: { id: string; label: string; emoji: string; count: number }[]): CatalogDivision[] {
  const byDiv = new Map<string, AgencyAgentCard[]>();
  for (const a of agents) {
    const list = byDiv.get(a.division) ?? [];
    list.push(a);
    byDiv.set(a.division, list);
  }
  return divisions
    .filter((d) => byDiv.has(d.id))
    .map((d) => ({
      id: d.id,
      label: d.label,
      emoji: d.emoji,
      agents: byDiv.get(d.id)!,
    }));
}

interface TeamEditorProps {
  team: TeamDefinition;
}

export function TeamEditor({ team }: TeamEditorProps) {
  const router = useRouter();
  const updateTeam = useUpdateTeam();

  const [agentSearch, setAgentSearch] = useState("");
  const { agents: localAgents, divisions: rawDivisions, isLoading: agentsLoading } = useAgencyAgents();
  const { agents: customAgents, isLoading: customLoading } = useAgents();

  const allAgents = useMemo(() => {
    const customAsCards: AgencyAgentCard[] = customAgents.map((a) => ({
      id: a.name,
      name: a.name,
      emoji: a.emoji || "🤖",
      color: a.color || "#6366f1",
      description: a.description,
      division: "custom",
      divisionEmoji: "✏️",
      divisionLabel: "自定义",
      vibe: "",
      tags: a.tags || [],
      status: "dormant" as const,
    }));
    return [...localAgents, ...customAsCards];
  }, [localAgents, customAgents]);

  const allDivisions = useMemo(() => {
    const customCount = customAgents.length;
    const divs = [...rawDivisions];
    if (customCount > 0) {
      divs.push({ id: "custom", label: "自定义", emoji: "✏️", count: customCount });
    }
    return divs;
  }, [rawDivisions, customAgents.length]);

  const agentCatalog = useMemo(() => {
    const q = agentSearch.toLowerCase().trim();
    const filtered = q
      ? allAgents.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q)) ||
            a.divisionLabel.toLowerCase().includes(q),
        )
      : allAgents;
    return buildCatalog(filtered, allDivisions);
  }, [allAgents, allDivisions, agentSearch]);

  // Auto-expand all divisions with results when searching
  useEffect(() => {
    if (agentSearch.trim()) {
      setExpandedDivisions(new Set(agentCatalog.map((d) => d.id)));
    }
  }, [agentSearch, agentCatalog]);
  const agentsMap = useMemo(() => {
    const m = new Map<string, AgencyAgentCard>();
    for (const a of allAgents) m.set(a.id, a);
    return m;
  }, [allAgents]);
  const findAgent = useCallback(
    (id: string): AgencyAgentCard =>
      agentsMap.get(id) ?? { id, name: id, emoji: "🤖", color: "#6366f1", description: "", division: "", divisionEmoji: "", divisionLabel: "", vibe: "", tags: [], status: "dormant" as const },
    [agentsMap],
  );

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [tag, setTag] = useState(team.tag);

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [nodesInitialized, setNodesInitialized] = useState(false);

  const isLoadingAgents = agentsLoading || customLoading;

  // Initialize nodes from team members once agents are loaded
  useEffect(() => {
    if (nodesInitialized || isLoadingAgents || allAgents.length === 0) return;
    setNodes(
      team.members.map((m, i) => {
        const info = agentsMap.get(m.agentId);
        return {
          id: `node-${i}`,
          agentId: m.agentId,
          emoji: info?.emoji ?? "🤖",
          name: info?.name ?? m.agentId,
          role: m.roleInTeam || (info?.description ?? ""),
          color: info?.color ?? "#6366f1",
          x: m.position.x,
          y: m.position.y,
          skills: info?.tags ?? [],
        };
      }),
    );
    setNodeIdCounter(team.members.length);
    setNodesInitialized(true);
    if (rawDivisions.length > 0 && rawDivisions[0]) {
      setExpandedDivisions(new Set([rawDivisions[0].id]));
    }
  }, [isLoadingAgents, allAgents, agentsMap, team.members, nodesInitialized, rawDivisions]);
  const [connections, setConnections] = useState<Connection[]>(() =>
    team.connections.map((c) => ({ source: c.fromAgent, target: c.toAgent })),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(team.members.length);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    node: CanvasNode;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Connection drawing state
  const connectingRef = useRef<{
    sourceAgentId: string;
    sourceNodeId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  // ── Drawing connections ──────────────────────────────────────────

  const drawConnections = useCallback(() => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    svg.setAttribute("width", String(rect.width));
    svg.setAttribute("height", String(rect.height));

    let paths = `<defs><marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#6366f1" opacity="0.7"/></marker></defs>`;
    connections.forEach((conn) => {
      const srcNode = nodes.find((n) => n.agentId === conn.source);
      const tgtNode = nodes.find((n) => n.agentId === conn.target);
      if (!srcNode || !tgtNode) return;
      const srcEl = document.getElementById(srcNode.id);
      const tgtEl = document.getElementById(tgtNode.id);
      if (!srcEl || !tgtEl) return;
      const x1 = srcNode.x + 220;
      const y1 = srcNode.y + srcEl.offsetHeight / 2;
      const x2 = tgtNode.x;
      const y2 = tgtNode.y + tgtEl.offsetHeight / 2;
      const cx = (x1 + x2) / 2;
      paths += `<path d="M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}" fill="none" stroke="#6366f1" stroke-width="2" opacity="0.6" marker-end="url(#ah)"/>`;
    });

    // Draw temporary connection line while dragging from a handle
    const conn = connectingRef.current;
    if (conn) {
      const srcNode = nodes.find((n) => n.id === conn.sourceNodeId);
      if (srcNode) {
        const srcEl = document.getElementById(srcNode.id);
        if (srcEl) {
          const x1 = srcNode.x + 220;
          const y1 = srcNode.y + srcEl.offsetHeight / 2;
          const x2 = conn.mouseX;
          const y2 = conn.mouseY;
          const cx = (x1 + x2) / 2;
          paths += `<path d="M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}" fill="none" stroke="#6366f1" stroke-width="2" opacity="0.4" stroke-dasharray="6 3"/>`;
        }
      }
    }

    svg.innerHTML = paths;
  }, [connections, nodes]);

  useEffect(() => {
    drawConnections();
  }, [drawConnections]);

  // ── Drag handling ────────────────────────────────────────────────

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Handle connection drawing
      if (connectingRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        connectingRef.current.mouseX = e.clientX - rect.left;
        connectingRef.current.mouseY = e.clientY - rect.top;
        drawConnections();
        return;
      }
      // Handle node dragging
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragRef.current.offsetX);
      const y = Math.max(0, e.clientY - rect.top - dragRef.current.offsetY);
      dragRef.current.node.x = x;
      dragRef.current.node.y = y;
      const el = document.getElementById(dragRef.current.node.id);
      if (el) {
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.zIndex = "100";
      }
      drawConnections();
    }
    function onMouseUp(e: MouseEvent) {
      // Handle connection completion
      const connecting = connectingRef.current;
      if (connecting) {
        const sourceAgentId = connecting.sourceAgentId;
        const target = e.target as HTMLElement;
        const inputHandle = target.closest("[data-handle-type='input']");
        if (inputHandle) {
          const targetNodeId = inputHandle.getAttribute("data-node-id");
          const targetNode = nodes.find((n) => n.id === targetNodeId);
          if (
            targetNode &&
            targetNode.agentId !== sourceAgentId &&
            !connections.some(
              (c) => c.source === sourceAgentId && c.target === targetNode.agentId,
            )
          ) {
            const newTarget = targetNode.agentId;
            setConnections((prev) => [
              ...prev,
              { source: sourceAgentId, target: newTarget },
            ]);
          }
        }
        connectingRef.current = null;
        setIsConnecting(false);
        drawConnections();
        return;
      }
      // Handle node drag end
      const drag = dragRef.current;
      if (drag) {
        const el = document.getElementById(drag.node.id);
        if (el) el.style.zIndex = "";
        const { id, x, y } = drag.node;
        setNodes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
        );
        dragRef.current = null;
      }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [drawConnections, nodes, connections]);

  // ── Keyboard shortcuts ──────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
        removeNode(selectedNodeId);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // ── Node operations ─────────────────────────────────────────────

  const addNode = useCallback(
    (agent: AgencyAgentCard) => {
      if (nodes.some((n) => n.agentId === agent.id)) {
        toast.info(`${agent.name} 已在团队中`);
        return;
      }
      const newId = `node-${nodeIdCounter + 1}`;
      setNodeIdCounter((c) => c + 1);
      const x = 100 + Math.random() * 400;
      const y = 60 + Math.random() * 300;
      const newNode: CanvasNode = {
        id: newId,
        agentId: agent.id,
        emoji: agent.emoji,
        name: agent.name,
        role: agent.description,
        color: agent.color,
        x,
        y,
        skills: agent.tags,
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newId);
    },
    [nodes, nodeIdCounter],
  );

  const removeNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      const node = nodes.find((n) => n.id === id);
      if (node) {
        setConnections((prev) =>
          prev.filter((c) => c.source !== node.agentId && c.target !== node.agentId),
        );
      }
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [nodes, selectedNodeId],
  );

  function startConnecting(e: React.MouseEvent, node: CanvasNode) {
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    connectingRef.current = {
      sourceAgentId: node.agentId,
      sourceNodeId: node.id,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    };
    setIsConnecting(true);
  }

  function startDrag(e: React.MouseEvent, node: CanvasNode) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]") || target.closest("[data-handle-type]")) return;
    const el = document.getElementById(node.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { node, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  }

  const autoLayout = useCallback(() => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    setNodes((prev) =>
      prev.map((n, i) => ({
        ...n,
        x: 80 + (i % cols) * 260,
        y: 60 + Math.floor(i / cols) * 160,
      })),
    );
    setTimeout(drawConnections, 50);
  }, [nodes.length, drawConnections]);

  // ── Save ────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const members: TeamMember[] = nodes.map((n) => ({
      agentId: n.agentId,
      agentType: "local" as const,
      roleInTeam: n.role,
      executionMode: "collaborative" as const,
      enabledSkills: n.skills,
      position: { x: n.x, y: n.y },
    }));
    try {
      await updateTeam.mutateAsync({
        id: team.id,
        data: {
          name,
          description,
          tag,
          members,
          connections: connections.map((c) => ({
            fromAgent: c.source,
            toAgent: c.target,
            label: "",
            connType: "data" as const,
          })),
        },
      });
      toast.success("团队配置已保存");
    } catch {
      toast.error("保存失败");
    }
  }, [updateTeam, team.id, name, description, tag, nodes, connections]);

  const toggleDiv = useCallback((d: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }, []);

  return (
    <div className="flex size-full">
      {/* ═══ Left: Agent Panel ═══ */}
      {leftOpen && (
        <div className="bg-card flex w-[280px] shrink-0 flex-col overflow-hidden border-r transition-all">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-1">
              <button
                className="text-muted-foreground hover:bg-accent hover:text-foreground mr-1 cursor-pointer rounded p-1 text-base transition"
                onClick={() => router.back()}
              >
                ←
              </button>
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
                📦 角色库
              </h3>
            </div>
            <button
              className="text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer rounded p-1 transition"
              onClick={() => setLeftOpen(false)}
            >
              <PanelLeftCloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="border-b p-3">
            <Input
              placeholder="搜索角色名称、技能、部门..."
              className="h-8 text-xs"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoadingAgents ? (
                <div className="text-muted-foreground py-8 text-center text-xs">加载角色中...</div>
              ) : agentCatalog.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-xs">暂无可用角色</div>
              ) : (
                agentCatalog.map((div) => (
                  <div key={div.id} className="mb-1">
                    <button
                      className="hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold transition"
                      onClick={() => toggleDiv(div.id)}
                    >
                      <span className="flex items-center gap-1">
                        <ChevronRightIcon
                          className={cn("h-2.5 w-2.5 transition-transform", expandedDivisions.has(div.id) && "rotate-90")}
                        />
                        {div.emoji} {div.label}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[10px]">
                        {div.agents.length}
                      </span>
                    </button>
                    {expandedDivisions.has(div.id) && (
                      <div className="ml-1 mt-0.5 space-y-px">
                        {div.agents.map((agent) => {
                          const inTeam = nodes.some((n) => n.agentId === agent.id);
                          return (
                            <button
                              key={agent.id}
                              className={cn(
                                "group/card hover:bg-accent flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition active:cursor-grabbing active:opacity-70",
                                inTeam && "pointer-events-none opacity-40",
                              )}
                              onClick={() => addNode(agent)}
                            >
                              <span className="shrink-0 text-base">{agent.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{agent.name}</div>
                                <div className="text-muted-foreground max-w-[160px] truncate text-[10px]">
                                  {agent.description.slice(0, 50)}
                                </div>
                              </div>
                              {!inTeam && (
                                <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm opacity-0 transition group-hover/card:opacity-100">
                                  ＋
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ═══ Center: Canvas ═══ */}
      <div className="relative flex-1 overflow-hidden" ref={canvasRef}>
        {/* Dot grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Expand tabs */}
        {!leftOpen && (
          <button
            className="bg-card hover:bg-accent text-muted-foreground absolute top-1/2 left-0 z-10 flex h-12 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border border-l-0 text-[11px] transition"
            onClick={() => setLeftOpen(true)}
          >
            <PanelLeftOpenIcon className="h-3 w-3" />
          </button>
        )}
        {!rightOpen && (
          <button
            className="bg-card hover:bg-accent text-muted-foreground absolute top-1/2 right-0 z-10 flex h-12 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-md border border-r-0 text-[11px] transition"
            onClick={() => setRightOpen(true)}
          >
            <PanelRightOpenIcon className="h-3 w-3" />
          </button>
        )}

        {/* SVG connections layer */}
        <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-0" />

        {/* Canvas content */}
        <div
          className="absolute inset-0 overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNodeId(null);
          }}
        >
          {nodes.length === 0 && (
            <div className="text-muted-foreground pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3">
              <span className="text-5xl opacity-30">🏗️</span>
              <p className="text-[13px] font-medium">从左侧面板添加角色到画布</p>
              <p className="text-[11px]">点击角色卡片或拖拽到画布中</p>
            </div>
          )}

          {nodes.map((node) => (
            <div
              key={node.id}
              id={node.id}
              className={cn(
                "bg-card absolute z-[1] w-[220px] cursor-move select-none rounded-[10px] border transition-shadow hover:shadow-lg",
                selectedNodeId === node.id
                  ? "border-primary z-10 shadow-[0_0_0_2px_rgba(99,102,241,0.15),0_4px_24px_rgba(0,0,0,0.3)]"
                  : "hover:border-white/20",
              )}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => startDrag(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
              }}
            >
              {/* Color bar */}
              <div
                className="h-[3px] rounded-t-[10px]"
                style={{ background: COLOR_GRADIENTS[node.color] ?? node.color }}
              />
              <div className="p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xl">{node.emoji}</span>
                  <span className="flex-1 truncate text-[13px] font-semibold">{node.name}</span>
                  <button
                    data-no-drag
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full text-xs opacity-0 transition group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="text-muted-foreground mb-2 line-clamp-2 text-[11px]">{node.role}</div>
                <div className="flex flex-wrap gap-[3px]">
                  {node.skills.map((s) => (
                    <span key={s} className="rounded-full border px-1.5 py-px text-[10px] text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              {/* Input handle (left) */}
              <div
                data-handle-type="input"
                data-node-id={node.id}
                className={cn(
                  "bg-muted absolute top-1/2 -left-1.5 z-20 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 transition",
                  isConnecting
                    ? "border-primary bg-primary/20 scale-150"
                    : "hover:border-primary hover:bg-primary/10",
                )}
              />
              {/* Output handle (right) */}
              <div
                data-handle-type="output"
                data-node-id={node.id}
                className="bg-muted hover:border-primary hover:bg-primary/20 absolute top-1/2 -right-1.5 z-20 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 transition hover:scale-125"
                onMouseDown={(e) => startConnecting(e, node)}
              />
            </div>
          ))}
        </div>

        {/* Canvas Toolbar */}
        <div className="bg-card absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-0.5 rounded-[10px] border p-1.5 shadow-lg">
          <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition">
            <ZoomOutIcon className="h-4 w-4" />
          </button>
          <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition">
            <ZoomInIcon className="h-4 w-4" />
          </button>
          <div className="bg-border mx-1 my-1 w-px" />
          <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition">
            <Undo2Icon className="h-4 w-4" />
          </button>
          <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition">
            <Redo2Icon className="h-4 w-4" />
          </button>
          <div className="bg-border mx-1 my-1 w-px" />
          <button
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition"
            onClick={autoLayout}
            title="自动布局"
          >
            <LayoutGridIcon className="h-4 w-4" />
          </button>
          <div className="bg-border mx-1 my-1 w-px" />
          <button
            className="text-muted-foreground hover:bg-accent hover:text-destructive flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition"
            onClick={() => selectedNodeId && removeNode(selectedNodeId)}
            title="删除选中"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ═══ Right: Config Panel ═══ */}
      {rightOpen && (
        <div className="bg-card flex w-[320px] shrink-0 flex-col overflow-hidden border-l transition-all">
          {selectedNode ? (
            <>
              {/* Node config */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-[13px] font-semibold">
                  {selectedNode.emoji} {selectedNode.name}
                </h3>
                <button
                  className="text-muted-foreground hover:bg-accent cursor-pointer rounded p-1 transition"
                  onClick={() => setSelectedNodeId(null)}
                >
                  ✕
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-0">
                  <div className="border-b p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">角色信息</h4>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[28px]">{selectedNode.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold">{selectedNode.name}</div>
                        <div className="text-muted-foreground text-[11px]">{selectedNode.role}</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-b p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">团队中的职责</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">任务描述</Label>
                        <Textarea
                          className="mt-1 text-[13px]"
                          placeholder="描述该角色在团队中的具体职责..."
                          value={selectedNode.role}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes((prev) =>
                              prev.map((n) => (n.id === selectedNode.id ? { ...n, role: val } : n)),
                            );
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">执行模式</Label>
                        <select className="bg-input mt-1 w-full rounded-md border px-2.5 py-[7px] text-[13px] outline-none focus:border-indigo-500">
                          <option>并行执行</option>
                          <option>等待依赖完成后执行</option>
                          <option>条件触发</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="border-b p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">技能配置</h4>
                    <div className="space-y-1.5">
                      {selectedNode.skills.map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-1.5 text-xs">
                          <input type="checkbox" defaultChecked className="accent-indigo-500" /> {s}
                        </label>
                      ))}
                    </div>
                    <button className="text-muted-foreground hover:text-foreground mt-2 w-full cursor-pointer rounded-md border border-dashed py-1.5 text-center text-xs transition">
                      + 添加自定义技能
                    </button>
                  </div>
                  <div className="p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">连接关系</h4>
                    <div className="text-muted-foreground space-y-1 text-xs">
                      {connections
                        .filter((c) => c.target === selectedNode.agentId)
                        .map((c) => (
                          <div key={c.source} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="text-cyan-500">←</span> 接收自:{" "}
                              <strong>{findAgent(c.source).name}</strong>
                            </span>
                            <button
                              className="hover:text-destructive cursor-pointer text-[10px] opacity-50 transition hover:opacity-100"
                              onClick={() =>
                                setConnections((prev) =>
                                  prev.filter((x) => !(x.source === c.source && x.target === c.target)),
                                )
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      {connections
                        .filter((c) => c.source === selectedNode.agentId)
                        .map((c) => (
                          <div key={c.target} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="text-indigo-500">→</span> 输出到:{" "}
                              <strong>{findAgent(c.target).name}</strong>
                            </span>
                            <button
                              className="hover:text-destructive cursor-pointer text-[10px] opacity-50 transition hover:opacity-100"
                              onClick={() =>
                                setConnections((prev) =>
                                  prev.filter((x) => !(x.source === c.source && x.target === c.target)),
                                )
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      {connections.filter(
                        (c) => c.source === selectedNode.agentId || c.target === selectedNode.agentId,
                      ).length === 0 && <span>拖拽右侧圆点到另一节点来创建连接</span>}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Team config */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-[13px] font-semibold">⚙️ 团队配置</h3>
                <button
                  className="text-muted-foreground hover:bg-accent cursor-pointer rounded p-1 transition"
                  onClick={() => setRightOpen(false)}
                >
                  <PanelRightCloseIcon className="h-4 w-4" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-0">
                  <div className="border-b p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">基本信息</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">团队名称</Label>
                        <Input className="mt-1 text-[13px]" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">团队描述</Label>
                        <Textarea
                          className="mt-1 text-[13px]"
                          placeholder="描述这个团队的目标和工作方式..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">标签</Label>
                        <Input className="mt-1 text-[13px]" placeholder="如：开发、设计" value={tag} onChange={(e) => setTag(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-muted-foreground mb-2.5 text-[11px] font-semibold uppercase tracking-wider">
                      团队成员 ({nodes.length})
                    </h4>
                    {nodes.length === 0 ? (
                      <p className="text-muted-foreground py-5 text-center text-xs">从左侧添加角色到画布</p>
                    ) : (
                      <div className="space-y-1">
                        {nodes.map((n) => (
                          <div
                            key={n.id}
                            className="bg-input flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                          >
                            <span className="text-base">{n.emoji}</span>
                            <span className="flex-1 font-medium">{n.name}</span>
                            <button
                              className="text-muted-foreground hover:text-destructive cursor-pointer text-sm opacity-0 transition hover:opacity-100"
                              onClick={() => removeNode(n.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <div className="flex flex-col gap-2 border-t p-4">
                <Button variant="outline" className="w-full" onClick={handleSave} disabled={updateTeam.isPending}>
                  <SaveIcon className="mr-1.5 h-4 w-4" />
                  {updateTeam.isPending ? "保存中..." : "💾 保存为模板"}
                </Button>
                <Button className="w-full">
                  ▶ 启动团队聊天
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
