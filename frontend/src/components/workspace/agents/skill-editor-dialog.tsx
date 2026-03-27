"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddCustomSkill } from "@/core/agency";
import type { CustomSkill } from "@/core/agency";

interface SkillEditorDialogProps {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillEditorDialog({
  agentId,
  open,
  onOpenChange,
}: SkillEditorDialogProps) {
  const addSkill = useAddCustomSkill(agentId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examples, setExamples] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;

    const skill: CustomSkill = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: name.trim(),
      description: description.trim(),
      tools: [],
      references: [],
      examples: examples
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };

    await addSkill.mutateAsync(skill);
    setName("");
    setDescription("");
    setExamples("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加自定义技能</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="skill-name">技能名称</Label>
            <Input
              id="skill-name"
              placeholder="例如：代码审查"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="skill-desc">技能描述</Label>
            <Textarea
              id="skill-desc"
              placeholder="描述这个技能的用途和使用方式..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="skill-examples">使用示例（每行一个）</Label>
            <Textarea
              id="skill-examples"
              placeholder={"帮我审查这段代码的性能问题\n检查代码是否有安全漏洞"}
              rows={3}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || addSkill.isPending}
          >
            {addSkill.isPending ? "添加中..." : "添加技能"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
