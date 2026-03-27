"""
Markdown 解析器：从 agency-agents 的角色定义文件中提取结构化数据。

支持的 Markdown 格式（agency-agents 标准结构）：
---
name: Frontend Developer
description: Expert frontend developer ...
color: cyan
emoji: 🖥️
vibe: Builds responsive, accessible web apps ...
---

# Agent Personality
## 🧠 Your Identity & Memory
## 🎯 Your Core Mission
## 🚨 Critical Rules You Must Follow
## 📋 Your Technical Deliverables
## 🔄 Your Workflow Process
## 📊 Success Metrics
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import yaml

from deerflow.agency.models import AgencyAgentDefinition, AgentSkill

logger = logging.getLogger(__name__)


class AgentMarkdownParser:
    """解析 agency-agents Markdown 文件为 AgencyAgentDefinition"""

    FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
    SECTION_RE = re.compile(r"^##\s+.+$", re.MULTILINE)

    def parse_file(self, filepath: Path, division: str) -> AgencyAgentDefinition | None:
        """解析单个角色 Markdown 文件"""
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning(f"无法读取文件 {filepath}: {e}")
            return None

        frontmatter = self._extract_frontmatter(content)
        if not frontmatter:
            logger.warning(f"文件 {filepath} 缺少 frontmatter")
            return None

        body = self.FRONTMATTER_RE.sub("", content).strip()
        sections = self._split_sections(body)

        agent_id = self._make_agent_id(filepath, division)
        name = frontmatter.get("name", filepath.stem)

        identity = sections.get("identity", "")
        role_match = re.search(r"\*\*Role\*\*:\s*(.+)", identity)
        personality_match = re.search(r"\*\*Personality\*\*:\s*(.+)", identity)

        core_skills = self._extract_skills(sections, agent_id)
        workflows = self._extract_list_items(sections.get("workflow", ""))
        deliverables = self._extract_deliverable_names(sections.get("deliverables", ""))
        success_metrics = self._extract_list_items(sections.get("metrics", ""))

        return AgencyAgentDefinition(
            id=agent_id,
            name=name,
            division=division,
            description=frontmatter.get("description", ""),
            color=frontmatter.get("color", ""),
            emoji=frontmatter.get("emoji", ""),
            vibe=frontmatter.get("vibe", ""),
            personality=personality_match.group(1).strip() if personality_match else "",
            role=role_match.group(1).strip() if role_match else "",
            core_mission=sections.get("mission", ""),
            critical_rules=sections.get("rules", ""),
            core_skills=core_skills,
            workflows=workflows,
            deliverables=deliverables,
            success_metrics=success_metrics,
            source_path=str(filepath),
            raw_content=content,
        )

    def _extract_frontmatter(self, content: str) -> dict[str, Any] | None:
        match = self.FRONTMATTER_RE.match(content)
        if not match:
            return None
        try:
            return yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError as e:
            logger.warning(f"Frontmatter YAML 解析失败: {e}")
            return None

    def _split_sections(self, body: str) -> dict[str, str]:
        """将 Markdown body 按 ## 标题分割为命名段落"""
        sections: dict[str, str] = {}
        parts = self.SECTION_RE.split(body)
        headers = self.SECTION_RE.findall(body)

        for header, content in zip(headers, parts[1:] if len(parts) > 1 else []):
            key = self._classify_section(header)
            if key:
                sections[key] = content.strip()

        return sections

    def _classify_section(self, header: str) -> str | None:
        """根据标题文本识别段落类型"""
        h = header.lower()
        if "identity" in h or "memory" in h:
            return "identity"
        if "mission" in h:
            return "mission"
        if "critical" in h or "rules" in h or "mandatory" in h:
            return "rules"
        if "deliverable" in h or "technical" in h:
            return "deliverables"
        if "workflow" in h or "process" in h:
            return "workflow"
        if "success" in h or "metric" in h or "kpi" in h:
            return "metrics"
        if "communication" in h or "style" in h:
            return "style"
        return None

    def _extract_skills(self, sections: dict[str, str], agent_id: str) -> list[AgentSkill]:
        """从 mission 和 deliverables 段落提取技能"""
        skills: list[AgentSkill] = []

        mission = sections.get("mission", "")
        skill_headers = re.findall(r"###\s+(.+)", mission)
        for i, header in enumerate(skill_headers):
            clean = re.sub(r"[^\w\s-]", "", header).strip()
            skill_id = f"{agent_id}-skill-{i}"
            skills.append(AgentSkill(
                id=skill_id,
                name=clean,
                description=self._get_subsection_content(mission, header),
                tags=self._extract_tags_from_text(clean),
            ))

        if not skills:
            for line in mission.split("\n"):
                line = line.strip()
                if line.startswith("- ") and len(line) > 10:
                    clean = line[2:].strip()
                    skill_id = f"{agent_id}-skill-{len(skills)}"
                    skills.append(AgentSkill(
                        id=skill_id,
                        name=clean[:80],
                        description=clean,
                        tags=self._extract_tags_from_text(clean),
                    ))
                    if len(skills) >= 8:
                        break

        return skills

    def _get_subsection_content(self, text: str, header: str) -> str:
        """获取 ### 标题下的内容直到下一个 ### 或 ##"""
        pattern = re.escape(header) + r"\s*\n(.*?)(?=\n###\s|\n##\s|\Z)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            content = match.group(1).strip()
            lines = [l.strip("- ").strip() for l in content.split("\n") if l.strip() and not l.strip().startswith("```")]
            return "; ".join(lines[:3])
        return ""

    def _extract_list_items(self, text: str) -> list[str]:
        """提取 Markdown 列表项"""
        items = []
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                item = line[2:].strip()
                if item and len(item) > 3:
                    items.append(item)
        return items[:20]

    def _extract_deliverable_names(self, text: str) -> list[str]:
        """从 deliverables 段落提取交付物名称"""
        names = []
        for match in re.finditer(r"###\s+(.+)", text):
            name = re.sub(r"[^\w\s-]", "", match.group(1)).strip()
            if name:
                names.append(name)
        if not names:
            names = self._extract_list_items(text)
        return names[:10]

    def _extract_tags_from_text(self, text: str) -> list[str]:
        """从文本中提取关键词标签"""
        keywords = [
            "React", "Vue", "Angular", "TypeScript", "Python", "Node.js",
            "API", "UI", "UX", "CSS", "HTML", "Docker", "K8s", "CI/CD",
            "SEO", "Performance", "Security", "Testing", "Database",
            "Mobile", "iOS", "Android", "Flutter", "ML", "AI",
            "Design", "Brand", "Content", "Marketing", "Analytics",
        ]
        tags = []
        text_lower = text.lower()
        for kw in keywords:
            if kw.lower() in text_lower:
                tags.append(kw)
        return tags[:5]

    def _make_agent_id(self, filepath: Path, division: str) -> str:
        """生成 agent ID"""
        stem = filepath.stem
        if stem.startswith(f"{division}-"):
            return stem
        return f"{division}-{stem}"
