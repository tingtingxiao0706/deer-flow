"use client";

import {
  BotIcon,
  GlobeIcon,
  MessageSquareIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgencyAgents, useActivateAgent } from "@/core/agency";
import type { AgencyAgentCard } from "@/core/agency";
import { useAgents, useCreateAgent, useDeleteAgent } from "@/core/agents";
import type { Agent, CreateAgentRequest } from "@/core/agents";

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

type TabId = "local" | "custom" | "remote";

export function AgentManagement() {
  const [activeTab, setActiveTab] = useState<TabId>("local");

  return (
    <div className="flex size-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">🤖 智能体管理</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          管理本地角色 · 创建自定义智能体 · 连接远程 A2A 服务
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b px-6 pt-2">
        <TabButton
          active={activeTab === "local"}
          onClick={() => setActiveTab("local")}
          icon={<PackageIcon className="h-3.5 w-3.5" />}
          label="本地角色"
        />
        <TabButton
          active={activeTab === "custom"}
          onClick={() => setActiveTab("custom")}
          icon={<PencilIcon className="h-3.5 w-3.5" />}
          label="自定义"
        />
        <TabButton
          active={activeTab === "remote"}
          onClick={() => setActiveTab("remote")}
          icon={<GlobeIcon className="h-3.5 w-3.5" />}
          label="远程"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "local" && <LocalAgentsTab />}
        {activeTab === "custom" && <CustomAgentsTab />}
        {activeTab === "remote" && <RemoteAgentsTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "text-muted-foreground hover:text-foreground border-transparent"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

/* ═══════════════ Local Agents Tab ═══════════════ */

function LocalAgentsTab() {
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const activate = useActivateAgent();

  const { agents, divisions, isLoading } = useAgencyAgents({
    division: selectedDivision,
    q: searchQuery || undefined,
  });

  const handleActivateAndChat = useCallback(
    async (agent: AgencyAgentCard) => {
      try {
        const result = await activate.mutateAsync(agent.id);
        if (result.status === "running" || result.instanceId) {
          router.push(`/workspace/agents/${agent.id}/chats/new`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "激活失败");
      }
    },
    [activate, router],
  );

  return (
    <div className="p-6">
      {/* Search + Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

      {/* Grid */}
      {isLoading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          正在加载角色...
        </div>
      ) : agents.length === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          未找到匹配的角色
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {agents.map((agent) => (
            <LocalAgentCard
              key={agent.id}
              agent={agent}
              onChat={() => handleActivateAndChat(agent)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocalAgentCard({
  agent,
  onChat,
}: {
  agent: AgencyAgentCard;
  onChat: () => void;
}) {
  const gradientClass =
    COLOR_MAP[agent.color] ?? "from-primary/10 to-primary/5 border-primary/20";

  return (
    <Card
      className={`group flex flex-col overflow-hidden bg-gradient-to-br transition-all hover:shadow-lg hover:-translate-y-0.5 ${gradientClass}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {agent.emoji || agent.divisionEmoji}
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold">
              {agent.name}
            </CardTitle>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <span>{agent.divisionEmoji} {agent.divisionLabel}</span>
            </div>
          </div>
        </div>
        {agent.vibe && (
          <CardDescription className="mt-1.5 line-clamp-1 text-xs italic">
            {agent.vibe}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-0 pb-2">
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {agent.description}
        </p>
        {agent.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: 44 }}>
            {agent.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-3">
        <Button size="sm" className="w-full text-xs" onClick={onChat}>
          <MessageSquareIcon className="mr-1 h-3 w-3" />
          对话
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ═══════════════ Custom Agents Tab ═══════════════ */

function CustomAgentsTab() {
  const { agents, isLoading } = useAgents();
  const router = useRouter();
  const deleteAgent = useDeleteAgent();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleDelete(name: string) {
    try {
      await deleteAgent.mutateAsync(name);
      toast.success("已删除智能体");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          创建自定义智能体
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          加载中...
        </div>
      ) : agents.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2">
          <BotIcon className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            暂无自定义智能体，点击上方按钮创建
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <CustomAgentCard
              key={agent.name}
              agent={agent}
              onChat={() =>
                router.push(`/workspace/agents/${agent.name}/chats/new`)
              }
              onDelete={() => setDeleteTarget(agent.name)}
            />
          ))}
        </div>
      )}

      <CreateCustomAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除智能体</DialogTitle>
            <DialogDescription>
              确定要删除 &quot;{deleteTarget}&quot;
              吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAgent.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleteAgent.isPending ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomAgentCard({
  agent,
  onChat,
  onDelete,
}: {
  agent: Agent;
  onChat: () => void;
  onDelete: () => void;
}) {
  const gradientClass =
    COLOR_MAP[agent.color] ?? "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20";

  return (
    <Card
      className={`group flex flex-col overflow-hidden bg-gradient-to-br transition-all hover:shadow-lg hover:-translate-y-0.5 ${gradientClass}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji || "🤖"}</span>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold">
              {agent.name}
            </CardTitle>
            {agent.model && (
              <Badge variant="secondary" className="mt-0.5 text-[10px]">
                {agent.model}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 pb-2">
        {agent.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {agent.description}
          </p>
        )}
        {agent.tags && agent.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: 44 }}>
            {agent.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-0 pb-3">
        <Button size="sm" className="flex-1 text-xs" onClick={onChat}>
          <MessageSquareIcon className="mr-1 h-3 w-3" />
          对话
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive h-8 w-8"
          onClick={onDelete}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ═══════════════ Create Custom Agent Dialog ═══════════════ */

function CreateCustomAgentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createAgent = useCreateAgent();
  const [form, setForm] = useState({
    name: "",
    emoji: "🚀",
    description: "",
    soul: "",
    tags: "",
    model: "",
  });

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("请填写名称和描述");
      return;
    }
    const request: CreateAgentRequest = {
      name: form.name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: form.description.trim(),
      emoji: form.emoji || "🤖",
      soul: form.soul || "",
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      model: form.model || undefined,
    };
    try {
      await createAgent.mutateAsync(request);
      toast.success("智能体创建成功");
      onOpenChange(false);
      setForm({ name: "", emoji: "🚀", description: "", soul: "", tags: "", model: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    }
  }, [form, createAgent, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>✏️ 创建自定义智能体</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-3">
            <div className="w-16">
              <Label>Emoji</Label>
              <Input
                className="mt-1 text-center text-xl"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label>角色名称 *</Label>
              <Input
                className="mt-1"
                placeholder="如：nextjs-expert"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>描述 *</Label>
            <Textarea
              className="mt-1"
              placeholder="描述该智能体的核心能力和擅长领域..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div>
            <Label>System Prompt（可选）</Label>
            <Textarea
              className="mt-1 font-mono text-xs"
              placeholder="自定义 system prompt，定义角色的行为和规则..."
              rows={4}
              value={form.soul}
              onChange={(e) => setForm({ ...form, soul: e.target.value })}
            />
          </div>
          <div>
            <Label>技能标签</Label>
            <Input
              className="mt-1"
              placeholder="用逗号分隔，如：Next.js, React, TypeScript"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          <div>
            <Label>模型（可选）</Label>
            <Input
              className="mt-1"
              placeholder="留空使用默认模型"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={createAgent.isPending}>
            {createAgent.isPending ? "创建中..." : "创建智能体"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════ Remote Agents Tab ═══════════════ */

function RemoteAgentsTab() {
  const [url, setUrl] = useState("");
  const [remoteAgents, setRemoteAgents] = useState<
    { name: string; endpoint: string; description: string; status: string }[]
  >([]);
  const router = useRouter();

  const handleConnect = useCallback(async () => {
    if (!url.trim()) {
      toast.error("请输入 A2A 端点 URL");
      return;
    }
    try {
      let agentName = "remote-agent";
      let agentDesc = "";

      try {
        const cardUrl =
          url.replace(/\/+$/, "") + "/.well-known/agent-card.json";
        const res = await fetch(cardUrl);
        if (res.ok) {
          const card = (await res.json()) as {
            name?: string;
            description?: string;
          };
          agentName = card.name || agentName;
          agentDesc = card.description || "";
        }
      } catch {
        // AgentCard fetch is best-effort
      }

      // Create proxy agent on backend
      const { getBackendBaseURL } = await import("@/core/config");
      const proxyRes = await fetch(
        `${getBackendBaseURL()}/api/agents/remote-proxy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: url.trim(),
            agent_name: "",
            description: agentDesc,
          }),
        },
      );
      if (!proxyRes.ok) {
        const err = (await proxyRes.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(err.detail ?? "创建代理失败");
      }
      const proxy = (await proxyRes.json()) as {
        name: string;
        endpoint: string;
        description: string;
        status: string;
      };

      setRemoteAgents((prev) => {
        if (prev.some((a) => a.name === proxy.name)) return prev;
        return [
          ...prev,
          {
            name: proxy.name,
            endpoint: proxy.endpoint,
            description: proxy.description,
            status: proxy.status,
          },
        ];
      });
      toast.success(`已连接远程智能体: ${proxy.name}`);
      setUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "连接失败");
    }
  }, [url]);

  const handleChat = useCallback(
    (agent: { name: string }) => {
      router.push(`/workspace/agents/${agent.name}/chats/new`);
    },
    [router],
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <Input
          className="flex-1"
          placeholder="输入 A2A Agent 端点 URL，如 https://agent.example.com/a2a"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <Button onClick={handleConnect}>
          <GlobeIcon className="mr-1.5 h-4 w-4" />
          连接
        </Button>
      </div>

      {remoteAgents.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2">
          <GlobeIcon className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            暂无远程智能体，请输入 A2A 端点 URL 进行连接
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {remoteAgents.map((agent, i) => (
            <Card
              key={`${agent.endpoint}-${i}`}
              className="group flex flex-col bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌐</span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-semibold">
                      {agent.name}
                    </CardTitle>
                    <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                      {agent.endpoint}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0 pb-2">
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {agent.description || "远程 A2A 智能体"}
                </p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {agent.status}
                </Badge>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleChat(agent)}
                >
                  <MessageSquareIcon className="mr-1 h-3 w-3" />
                  对话
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
