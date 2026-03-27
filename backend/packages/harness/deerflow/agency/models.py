"""
Agency-Agents 数据模型

从 agency-agents Markdown 文件解析出的角色定义，
支持三层渐进式披露（L0 卡片 / L1 详情 / L2 运行态）。
团队工作室的团队定义和编排配置。
"""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


class AgentStatus(str, enum.Enum):
    DORMANT = "dormant"
    INSTANTIATING = "instantiating"
    RUNNING = "running"
    IDLE = "idle"
    ERROR = "error"


DIVISION_META: dict[str, dict[str, str]] = {
    "engineering": {"emoji": "💻", "label": "工程部"},
    "design": {"emoji": "🎨", "label": "设计部"},
    "marketing": {"emoji": "📢", "label": "市场部"},
    "testing": {"emoji": "🧪", "label": "测试部"},
    "product": {"emoji": "📊", "label": "产品部"},
    "project-management": {"emoji": "🎬", "label": "项目管理部"},
    "sales": {"emoji": "💼", "label": "销售部"},
    "support": {"emoji": "🛟", "label": "支持部"},
    "paid-media": {"emoji": "💰", "label": "付费媒体部"},
    "spatial-computing": {"emoji": "🥽", "label": "空间计算部"},
    "specialized": {"emoji": "🎯", "label": "专业部"},
    "game-development": {"emoji": "🎮", "label": "游戏开发部"},
    "academic": {"emoji": "📚", "label": "学术部"},
    "strategy": {"emoji": "🧭", "label": "战略部"},
}


@dataclass
class AgentSkill:
    """从 Markdown 中提取的技能"""
    id: str
    name: str
    description: str
    tags: list[str] = field(default_factory=list)
    examples: list[str] = field(default_factory=list)


@dataclass
class CustomSkill:
    """用户注入的自定义技能"""
    id: str
    name: str
    description: str
    tools: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    examples: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "tools": self.tools,
            "references": self.references,
            "examples": self.examples,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CustomSkill:
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            tools=data.get("tools", []),
            references=data.get("references", []),
            examples=data.get("examples", []),
        )


@dataclass
class AgencyAgentDefinition:
    """从 agency-agents Markdown 文件解析出的完整角色定义"""

    id: str
    name: str
    division: str
    description: str
    color: str = ""
    emoji: str = ""
    vibe: str = ""

    personality: str = ""
    role: str = ""
    core_mission: str = ""
    critical_rules: str = ""

    core_skills: list[AgentSkill] = field(default_factory=list)
    workflows: list[str] = field(default_factory=list)
    deliverables: list[str] = field(default_factory=list)
    success_metrics: list[str] = field(default_factory=list)

    custom_skills: list[CustomSkill] = field(default_factory=list)

    source_path: str = ""
    raw_content: str = ""

    status: AgentStatus = AgentStatus.DORMANT
    instance_id: str | None = None

    @property
    def division_emoji(self) -> str:
        return DIVISION_META.get(self.division, {}).get("emoji", "🤖")

    @property
    def division_label(self) -> str:
        return DIVISION_META.get(self.division, {}).get("label", self.division)

    def to_ui_card(self) -> dict[str, Any]:
        """L0 卡片数据"""
        return {
            "id": self.id,
            "name": self.name,
            "division": self.division,
            "divisionEmoji": self.division_emoji,
            "divisionLabel": self.division_label,
            "emoji": self.emoji,
            "color": self.color,
            "vibe": self.vibe,
            "description": self.description[:200],
            "tags": [s.name for s in self.core_skills[:5]],
            "status": self.status.value,
        }

    def to_detail(self) -> dict[str, Any]:
        """L1 详情数据"""
        return {
            **self.to_ui_card(),
            "description": self.description,
            "personality": self.personality,
            "role": self.role,
            "coreMission": self.core_mission,
            "skills": [
                {"id": s.id, "name": s.name, "description": s.description, "tags": s.tags}
                for s in self.core_skills
            ],
            "workflows": self.workflows,
            "deliverables": self.deliverables,
            "successMetrics": self.success_metrics,
            "customSkills": [cs.to_dict() for cs in self.custom_skills],
        }

    def to_a2a_agent_card(self, base_url: str = "http://localhost:8001") -> dict[str, Any]:
        """生成 A2A AgentCard JSON"""
        skills = []
        for skill in self.core_skills:
            skills.append({
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "tags": skill.tags,
                "examples": skill.examples[:3],
            })
        for cs in self.custom_skills:
            skills.append({
                "id": f"custom-{cs.id}",
                "name": cs.name,
                "description": cs.description,
                "tags": ["custom"],
                "examples": cs.examples[:3],
            })

        base_url = base_url.rstrip("/")
        return {
            "name": self.name,
            "description": self.description,
            "version": "1.0.0",
            "url": f"{base_url}/a2a/{self.id}",
            "provider": {
                "organization": "Flux Guild",
                "url": base_url,
            },
            "capabilities": {
                "streaming": True,
                "pushNotifications": False,
                "stateTransitionHistory": True,
            },
            "defaultInputModes": ["text/plain"],
            "defaultOutputModes": ["text/plain", "application/json"],
            "skills": skills,
        }

    def to_system_prompt(self) -> str:
        """L2 运行态：生成完整的 system prompt"""
        parts = [self.raw_content]
        if self.custom_skills:
            parts.append("\n\n## 用户自定义技能\n")
            for cs in self.custom_skills:
                parts.append(f"### {cs.name}\n{cs.description}\n")
                if cs.examples:
                    parts.append("示例：\n" + "\n".join(f"- {e}" for e in cs.examples) + "\n")
        return "\n".join(parts)


# ── 团队工作室数据模型 ───────────────────────────────────────────────────


class TeamStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    RUNNING = "running"


@dataclass
class TeamMember:
    """团队中的一个智能体成员"""
    agent_id: str
    agent_type: str = "local"
    role_in_team: str = ""
    execution_mode: str = "collaborative"
    enabled_skills: list[str] = field(default_factory=list)
    position: dict[str, float] = field(default_factory=lambda: {"x": 0.0, "y": 0.0})

    def to_dict(self) -> dict[str, Any]:
        return {
            "agentId": self.agent_id,
            "agentType": self.agent_type,
            "roleInTeam": self.role_in_team,
            "executionMode": self.execution_mode,
            "enabledSkills": self.enabled_skills,
            "position": self.position,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TeamMember:
        return cls(
            agent_id=data["agentId"],
            agent_type=data.get("agentType", "local"),
            role_in_team=data.get("roleInTeam", ""),
            execution_mode=data.get("executionMode", "collaborative"),
            enabled_skills=data.get("enabledSkills", []),
            position=data.get("position", {"x": 0.0, "y": 0.0}),
        )


@dataclass
class TeamConnection:
    """团队成员之间的连线关系"""
    from_agent: str
    to_agent: str
    label: str = ""
    conn_type: str = "data"

    def to_dict(self) -> dict[str, Any]:
        return {
            "fromAgent": self.from_agent,
            "toAgent": self.to_agent,
            "label": self.label,
            "connType": self.conn_type,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TeamConnection:
        return cls(
            from_agent=data["fromAgent"],
            to_agent=data["toAgent"],
            label=data.get("label", ""),
            conn_type=data.get("connType", "data"),
        )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class TeamDefinition:
    """团队完整定义，包含成员和编排连线"""
    id: str
    name: str
    description: str = ""
    icon: str = "🚀"
    tag: str = ""
    tag_color: str = "primary"
    status: TeamStatus = TeamStatus.DRAFT

    members: list[TeamMember] = field(default_factory=list)
    connections: list[TeamConnection] = field(default_factory=list)

    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    @staticmethod
    def new_id() -> str:
        return str(uuid.uuid4())

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "tag": self.tag,
            "tagColor": self.tag_color,
            "status": self.status.value,
            "members": [m.to_dict() for m in self.members],
            "connections": [c.to_dict() for c in self.connections],
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    def to_summary(self) -> dict[str, Any]:
        """列表页用的精简数据"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "tag": self.tag,
            "tagColor": self.tag_color,
            "status": self.status.value,
            "memberCount": len(self.members),
            "connCount": len(self.connections),
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TeamDefinition:
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            icon=data.get("icon", "🚀"),
            tag=data.get("tag", ""),
            tag_color=data.get("tagColor", "primary"),
            status=TeamStatus(data.get("status", "draft")),
            members=[TeamMember.from_dict(m) for m in data.get("members", [])],
            connections=[TeamConnection.from_dict(c) for c in data.get("connections", [])],
            created_at=data.get("createdAt", _now_iso()),
            updated_at=data.get("updatedAt", _now_iso()),
        )
