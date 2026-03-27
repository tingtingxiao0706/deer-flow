"""
Agent Factory：按需将 AgencyAgentDefinition 实例化为 DeerFlow Agent。

利用 DeerFlow 现有的 Agent 创建机制（config.yaml + SOUL.md），
将 agency-agents 角色定义转换为 DeerFlow 可运行的 Agent 实例。
"""

from __future__ import annotations

import logging
import uuid

import yaml

from deerflow.agency.models import AgencyAgentDefinition, AgentStatus
from deerflow.agency.registry.agency_registry import get_agency_registry
from deerflow.config.paths import get_paths

logger = logging.getLogger(__name__)

DIVISION_TOOL_GROUPS: dict[str, list[str]] = {
    "engineering": ["web", "file:read", "file:write", "bash"],
    "design": ["web", "file:read", "file:write"],
    "marketing": ["web", "file:read"],
    "testing": ["web", "file:read", "file:write", "bash"],
    "product": ["web", "file:read"],
    "project-management": ["web", "file:read"],
    "sales": ["web", "file:read"],
    "support": ["web", "file:read"],
    "paid-media": ["web", "file:read"],
    "spatial-computing": ["web", "file:read", "file:write", "bash"],
    "specialized": ["web", "file:read", "file:write"],
    "game-development": ["web", "file:read", "file:write", "bash"],
    "academic": ["web", "file:read"],
    "strategy": ["web", "file:read"],
}


class AgentFactory:
    """按需实例化 Agency-Agents 角色为 DeerFlow Agent"""

    def __init__(self) -> None:
        self._active_instances: dict[str, str] = {}

    async def instantiate(self, agent_def: AgencyAgentDefinition) -> str:
        """将角色定义实例化为 DeerFlow Agent。

        在 DeerFlow 的 agents 目录下创建 config.yaml 和 SOUL.md，
        使其成为可被 Lead Agent 调度的自定义 Agent。

        Args:
            agent_def: 角色定义

        Returns:
            instance_id
        """
        registry = get_agency_registry()
        registry.set_agent_status(agent_def.id, AgentStatus.INSTANTIATING)

        try:
            instance_id = str(uuid.uuid4())[:8]
            agent_name = agent_def.id

            paths = get_paths()
            agent_dir = paths.agent_dir(agent_name)
            agent_dir.mkdir(parents=True, exist_ok=True)

            base_division = agent_def.division.split("/")[0]
            tool_groups = DIVISION_TOOL_GROUPS.get(base_division, ["web", "file:read"])

            config_data = {
                "name": agent_name,
                "description": agent_def.description,
                "tool_groups": tool_groups,
                "source": "agency",
            }

            config_file = agent_dir / "config.yaml"
            with open(config_file, "w", encoding="utf-8") as f:
                yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)

            soul_content = agent_def.to_system_prompt()
            soul_file = agent_dir / "SOUL.md"
            soul_file.write_text(soul_content, encoding="utf-8")

            self._active_instances[agent_def.id] = instance_id
            registry.set_agent_status(agent_def.id, AgentStatus.RUNNING, instance_id)

            logger.info(
                f"已实例化角色 '{agent_def.name}' (id={agent_def.id}, "
                f"instance={instance_id}, dir={agent_dir})"
            )
            return instance_id

        except Exception as e:
            registry.set_agent_status(agent_def.id, AgentStatus.ERROR)
            logger.error(f"实例化角色 '{agent_def.id}' 失败: {e}", exc_info=True)
            raise

    async def deactivate(self, agent_id: str) -> bool:
        """停用角色实例"""
        registry = get_agency_registry()
        registry.set_agent_status(agent_id, AgentStatus.DORMANT, instance_id=None)
        self._active_instances.pop(agent_id, None)
        return True

    def is_active(self, agent_id: str) -> bool:
        return agent_id in self._active_instances

    def get_instance_id(self, agent_id: str) -> str | None:
        return self._active_instances.get(agent_id)


_factory: AgentFactory | None = None


def get_agent_factory() -> AgentFactory:
    """获取全局 AgentFactory 单例"""
    global _factory
    if _factory is None:
        _factory = AgentFactory()
    return _factory
