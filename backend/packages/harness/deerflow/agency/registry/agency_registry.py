"""
Agency Registry：智能体注册中心

管理所有 agency-agents 角色定义的生命周期：
- 阶段一（DORMANT）：加载 Markdown 定义，生成 UI 卡片数据
- 阶段二（RUNNING）：按需实例化为 DeerFlow Agent
- 支持用户自定义技能注入和查询
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from threading import Lock
from typing import Any

from deerflow.agency.models import (
    AgencyAgentDefinition,
    AgentStatus,
    CustomSkill,
)
from deerflow.agency.parser import scan_agency_directory

logger = logging.getLogger(__name__)


class AgencyRegistry:
    """Agency-Agents 角色注册中心（单例）"""

    def __init__(self) -> None:
        self._agents: dict[str, AgencyAgentDefinition] = {}
        self._lock = Lock()
        self._loaded = False
        self._custom_skills_path: Path | None = None

    def load(
        self,
        agency_agents_path: str | Path,
        custom_skills_path: str | Path | None = None,
    ) -> int:
        """从 agency-agents 仓库加载所有角色定义。

        Args:
            agency_agents_path: agency-agents 仓库路径
            custom_skills_path: 自定义技能持久化 JSON 文件路径

        Returns:
            加载的角色数量
        """
        with self._lock:
            definitions = scan_agency_directory(agency_agents_path)
            self._agents = {d.id: d for d in definitions}
            self._loaded = True

            if custom_skills_path:
                self._custom_skills_path = Path(custom_skills_path)
                self._load_custom_skills()

            logger.info(f"AgencyRegistry 已加载 {len(self._agents)} 个角色")
            return len(self._agents)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def list_agents(
        self,
        division: str | None = None,
        status: AgentStatus | None = None,
        query: str | None = None,
    ) -> list[AgencyAgentDefinition]:
        """列出角色定义，支持按部门、状态和关键词过滤。"""
        agents = list(self._agents.values())

        if division:
            agents = [a for a in agents if a.division == division or a.division.startswith(f"{division}/")]

        if status:
            agents = [a for a in agents if a.status == status]

        if query:
            q = query.lower()
            agents = [
                a for a in agents
                if q in a.name.lower()
                or q in a.description.lower()
                or q in a.division.lower()
                or any(q in s.name.lower() for s in a.core_skills)
            ]

        return agents

    def get_agent(self, agent_id: str) -> AgencyAgentDefinition | None:
        """获取单个角色定义"""
        return self._agents.get(agent_id)

    def get_divisions(self) -> list[dict[str, Any]]:
        """获取所有部门及其角色数量"""
        division_counts: dict[str, int] = {}
        for agent in self._agents.values():
            base_div = agent.division.split("/")[0]
            division_counts[base_div] = division_counts.get(base_div, 0) + 1

        from deerflow.agency.models import DIVISION_META
        result = []
        for div, count in sorted(division_counts.items()):
            meta = DIVISION_META.get(div, {})
            result.append({
                "id": div,
                "label": meta.get("label", div),
                "emoji": meta.get("emoji", "🤖"),
                "count": count,
            })
        return result

    def set_agent_status(self, agent_id: str, status: AgentStatus, instance_id: str | None = None) -> bool:
        """更新角色状态"""
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        with self._lock:
            agent.status = status
            agent.instance_id = instance_id
        return True

    def add_custom_skill(self, agent_id: str, skill: CustomSkill) -> bool:
        """为角色添加自定义技能"""
        agent = self._agents.get(agent_id)
        if not agent:
            return False

        with self._lock:
            existing = [s for s in agent.custom_skills if s.id != skill.id]
            existing.append(skill)
            agent.custom_skills = existing
            self._persist_custom_skills()

        return True

    def remove_custom_skill(self, agent_id: str, skill_id: str) -> bool:
        """移除角色的自定义技能"""
        agent = self._agents.get(agent_id)
        if not agent:
            return False

        with self._lock:
            before = len(agent.custom_skills)
            agent.custom_skills = [s for s in agent.custom_skills if s.id != skill_id]
            if len(agent.custom_skills) < before:
                self._persist_custom_skills()
                return True
        return False

    def get_custom_skills(self, agent_id: str) -> list[CustomSkill]:
        """获取角色的自定义技能列表"""
        agent = self._agents.get(agent_id)
        if not agent:
            return []
        return list(agent.custom_skills)

    def _persist_custom_skills(self) -> None:
        """将所有自定义技能持久化到 JSON 文件"""
        if not self._custom_skills_path:
            return

        data: dict[str, list[dict]] = {}
        for agent_id, agent in self._agents.items():
            if agent.custom_skills:
                data[agent_id] = [cs.to_dict() for cs in agent.custom_skills]

        try:
            self._custom_skills_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._custom_skills_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"持久化自定义技能失败: {e}")

    def _load_custom_skills(self) -> None:
        """从 JSON 文件加载自定义技能"""
        if not self._custom_skills_path or not self._custom_skills_path.exists():
            return

        try:
            with open(self._custom_skills_path, encoding="utf-8") as f:
                data: dict[str, list[dict]] = json.load(f)

            for agent_id, skills_data in data.items():
                agent = self._agents.get(agent_id)
                if agent:
                    agent.custom_skills = [CustomSkill.from_dict(s) for s in skills_data]

            logger.info(f"已加载自定义技能配置，涉及 {len(data)} 个角色")
        except Exception as e:
            logger.warning(f"加载自定义技能失败: {e}")


_registry: AgencyRegistry | None = None


def get_agency_registry() -> AgencyRegistry:
    """获取全局 AgencyRegistry 单例"""
    global _registry
    if _registry is None:
        _registry = AgencyRegistry()
    return _registry
