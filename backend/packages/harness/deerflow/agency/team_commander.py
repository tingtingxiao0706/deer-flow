"""Team Commander: generates a virtual agent that orchestrates team collaboration.

Given a TeamDefinition, this module:
1. Activates all team members (creates config.yaml + SOUL.md)
2. Generates a commander SOUL.md that describes the team roster and workflow
3. Creates the commander agent's config.yaml with subagent-capable tool groups
"""

from __future__ import annotations

import logging
from typing import Any

import yaml

from deerflow.agency.factory import get_agent_factory
from deerflow.agency.models import TeamDefinition, TeamMember, TeamConnection
from deerflow.agency.registry.agency_registry import get_agency_registry
from deerflow.config.paths import get_paths

logger = logging.getLogger(__name__)


def _commander_agent_name(team_id: str) -> str:
    return f"team-{team_id[:8]}"


def _build_member_description(member: TeamMember) -> dict[str, str]:
    """Build a human-readable description block for a team member."""
    from deerflow.config.agents_config import load_agent_config

    name = member.agent_id
    emoji = "🤖"
    description = member.role_in_team
    skills: list[str] = []

    if member.agent_type == "local":
        registry = get_agency_registry()
        agent_def = registry.get_agent(member.agent_id)
        if agent_def:
            name = agent_def.name
            emoji = agent_def.emoji
            description = agent_def.description[:120]
            skills = [s.name for s in agent_def.core_skills[:5]]
    else:
        try:
            cfg = load_agent_config(member.agent_id)
            if cfg:
                name = cfg.name
                emoji = cfg.emoji
                description = cfg.description[:120] if cfg.description else description
                skills = cfg.tags[:5] if cfg.tags else []
        except Exception:
            pass

    if member.enabled_skills:
        skills = member.enabled_skills

    return {
        "id": member.agent_id,
        "name": name,
        "emoji": emoji,
        "description": description,
        "role_in_team": member.role_in_team,
        "skills": skills,
    }


def _build_workflow_description(connections: list[TeamConnection], members_info: dict[str, dict]) -> str:
    """Build a human-readable workflow description from connections."""
    if not connections:
        return "团队成员之间没有明确的工作流连线，可自由协作。"

    lines = []
    for conn in connections:
        src = members_info.get(conn.from_agent, {}).get("name", conn.from_agent)
        dst = members_info.get(conn.to_agent, {}).get("name", conn.to_agent)
        label = f"（{conn.label}）" if conn.label else ""
        lines.append(f"  {src} → {dst} {label}")

    return "工作流程：\n" + "\n".join(lines)


def generate_commander_soul(team: TeamDefinition) -> str:
    """Generate the SOUL.md content for the team commander agent."""
    members_info: dict[str, dict] = {}
    for m in team.members:
        info = _build_member_description(m)
        members_info[m.agent_id] = info

    member_roster = []
    for m in team.members:
        info = members_info[m.agent_id]
        skills_str = ", ".join(info["skills"]) if info["skills"] else "通用"
        role_str = f"（团队角色：{info['role_in_team']}）" if info["role_in_team"] else ""
        member_roster.append(
            f"- {info['emoji']} **{info['name']}** (`{info['id']}`){role_str}\n"
            f"  描述：{info['description']}\n"
            f"  技能：{skills_str}"
        )

    workflow_desc = _build_workflow_description(team.connections, members_info)

    member_ids = [m.agent_id for m in team.members]

    soul = f"""# {team.icon} {team.name} — 团队指挥官

你是「{team.name}」团队的指挥官。你的职责是根据用户的任务需求，协调团队成员分工协作，完成任务。

## 团队简介
{team.description or "一支专业的协作团队。"}

## 团队成员
{chr(10).join(member_roster)}

## 协作工作流
{workflow_desc}

## 工作方式

1. **分析任务**：理解用户需求，判断需要哪些团队成员参与。
2. **分配任务**：使用 `task` 工具将子任务分配给合适的成员。在 prompt 中明确指定：
   - `请以 {{agent_id}} 角色身份完成以下任务：...`
3. **协调流转**：按照工作流连线关系，将前一个成员的输出传递给下一个成员。
4. **汇总交付**：收集所有成员的工作成果，整合为完整的交付物返回给用户。

## 重要规则

- **你是指挥官，不要自己做具体工作**，而是通过 `task` 工具委派给团队成员。
- **尊重工作流**：如果有连线关系，按照 A → B 的顺序执行。
- **并行执行**：没有依赖关系的任务可以并行分配（同一批 `task` 调用）。
- **团队成员 ID**：{", ".join(f'`{mid}`' for mid in member_ids)}
- **调用格式**：`task(description="简要描述", prompt="请以 {{member_id}} 角色身份完成以下任务：\\n{{具体任务描述}}", subagent_type="general-purpose")`
"""
    return soul


async def activate_team_members(team: TeamDefinition) -> list[str]:
    """Activate all local team members via AgentFactory.

    Returns list of activated agent IDs.
    """
    factory = get_agent_factory()
    registry = get_agency_registry()
    activated = []

    for member in team.members:
        if member.agent_type != "local":
            continue
        agent_def = registry.get_agent(member.agent_id)
        if not agent_def:
            logger.warning(f"团队成员 '{member.agent_id}' 在角色库中不存在，跳过激活")
            continue
        if factory.is_active(member.agent_id):
            activated.append(member.agent_id)
            continue
        try:
            await factory.instantiate(agent_def)
            activated.append(member.agent_id)
        except Exception as e:
            logger.error(f"激活团队成员 '{member.agent_id}' 失败: {e}")

    return activated


def create_commander_agent(team: TeamDefinition) -> str:
    """Create the commander agent's config.yaml and SOUL.md.

    Returns the commander agent name.
    """
    agent_name = _commander_agent_name(team.id)
    paths = get_paths()
    agent_dir = paths.agent_dir(agent_name)
    agent_dir.mkdir(parents=True, exist_ok=True)

    config_data: dict[str, Any] = {
        "name": agent_name,
        "description": f"团队「{team.name}」指挥官 — 协调 {len(team.members)} 个成员协作",
        "source": "team-commander",
        "emoji": team.icon,
        "color": "indigo",
        "tags": ["team", "commander"],
    }

    config_file = agent_dir / "config.yaml"
    with open(config_file, "w", encoding="utf-8") as f:
        yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)

    soul_content = generate_commander_soul(team)
    soul_file = agent_dir / "SOUL.md"
    soul_file.write_text(soul_content, encoding="utf-8")

    logger.info(f"已创建团队指挥官 agent '{agent_name}' for team '{team.name}'")
    return agent_name


def cleanup_commander_agent(team_id: str) -> bool:
    """Remove the commander agent's files and in-memory state.

    Called when the user leaves the team chat page.
    Returns True if cleanup succeeded.
    """
    import shutil

    agent_name = _commander_agent_name(team_id)
    paths = get_paths()
    agent_dir = paths.agent_dir(agent_name)

    if agent_dir.exists():
        shutil.rmtree(agent_dir, ignore_errors=True)
        logger.info(f"已清理团队指挥官 agent 文件: {agent_dir}")

    factory = get_agent_factory()
    if factory.is_active(agent_name):
        factory._active_instances.pop(agent_name, None)

    return True


async def deactivate_team_members(team: TeamDefinition) -> list[str]:
    """Deactivate team members that were activated solely for this team.

    Only deactivates members whose source is 'agency' (local agents activated
    by the team start process). Custom/remote agents are left untouched.
    Returns list of deactivated agent IDs.
    """
    factory = get_agent_factory()
    deactivated: list[str] = []

    for member in team.members:
        if member.agent_type != "local":
            continue
        if not factory.is_active(member.agent_id):
            continue
        try:
            await factory.deactivate(member.agent_id)
            deactivated.append(member.agent_id)
        except Exception as e:
            logger.warning(f"停用团队成员 '{member.agent_id}' 失败: {e}")

    return deactivated
