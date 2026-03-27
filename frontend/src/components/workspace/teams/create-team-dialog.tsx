"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    icon: string;
    tag: string;
  }) => void;
  isPending?: boolean;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [tag, setTag] = useState("");

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description, icon, tag });
    setName("");
    setDescription("");
    setIcon("🚀");
    setTag("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建团队</DialogTitle>
          <DialogDescription>
            创建一个新的团队草稿，添加成员并配置编排后再启用。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="team-icon">图标</Label>
              <Input
                id="team-icon"
                className="w-16 text-center text-xl"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="team-name">团队名称 *</Label>
              <Input
                id="team-name"
                placeholder="如：全栈开发团队"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-tag">标签</Label>
            <Input
              id="team-tag"
              placeholder="如：开发、设计、营销"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-desc">描述</Label>
            <Textarea
              id="team-desc"
              placeholder="描述该团队的目标和职责..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? "创建中..." : "创建团队"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
