"""Agency-Agents 角色管理 API 路由

提供 agency-agents 角色目录的查询、搜索、详情、激活及自定义技能管理功能。
在 DeerFlow 现有 Gateway API 基础上扩展。
"""

import logging
import os

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from deerflow.agency.models import AgentStatus, CustomSkill
from deerflow.agency.registry.agency_registry import get_agency_registry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agency", tags=["agency-agents"])


# ── 响应模型 ──────────────────────────────────────────────────────────────


class AgentCardResponse(BaseModel):
    """L0 卡片数据"""
    id: str
    name: str
    division: str
    divisionEmoji: str = ""
    divisionLabel: str = ""
    emoji: str = ""
    color: str = ""
    vibe: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    status: str = "dormant"


class AgentDetailResponse(AgentCardResponse):
    """L1 详情数据"""
    personality: str = ""
    role: str = ""
    coreMission: str = ""
    skills: list[dict] = Field(default_factory=list)
    workflows: list[str] = Field(default_factory=list)
    deliverables: list[str] = Field(default_factory=list)
    successMetrics: list[str] = Field(default_factory=list)
    customSkills: list[dict] = Field(default_factory=list)


class DivisionResponse(BaseModel):
    id: str
    label: str
    emoji: str
    count: int


class AgentListResponse(BaseModel):
    agents: list[AgentCardResponse]
    total: int
    divisions: list[DivisionResponse]


class CustomSkillRequest(BaseModel):
    id: str = Field(..., description="技能唯一 ID")
    name: str = Field(..., description="技能名称")
    description: str = Field(default="", description="技能描述")
    tools: list[str] = Field(default_factory=list, description="需要绑定的工具")
    references: list[str] = Field(default_factory=list, description="参考文档")
    examples: list[str] = Field(default_factory=list, description="使用示例")


class ActivateResponse(BaseModel):
    agentId: str
    status: str
    instanceId: str | None = None
    a2aEndpoint: str | None = None
    agentCard: dict | None = None


# ── 初始化 ────────────────────────────────────────────────────────────────


def _ensure_loaded() -> None:
    """确保 registry 已加载。首次调用时从环境变量读取 agency-agents 路径。"""
    registry = get_agency_registry()
    if registry.is_loaded:
        return

    agency_path = os.getenv("AGENCY_AGENTS_PATH", "")
    if not agency_path:
        from pathlib import Path
        candidates = [
            Path.home() / "agency-agents",
            Path(__file__).resolve().parents[5] / "agency-agents",
            Path("d:/ai/agency-agents"),
        ]
        for c in candidates:
            if c.exists():
                agency_path = str(c)
                break

    if not agency_path:
        logger.warning("未找到 agency-agents 目录，请设置 AGENCY_AGENTS_PATH 环境变量")
        return

    from deerflow.config.paths import get_paths
    custom_skills_path = get_paths().base_dir / "agency_custom_skills.json"
    registry.load(agency_path, custom_skills_path)


def _force_reload() -> int:
    """强制重新扫描并加载 agency-agents 目录。"""
    registry = get_agency_registry()
    agency_path = os.getenv("AGENCY_AGENTS_PATH", "")
    if not agency_path:
        from pathlib import Path
        candidates = [
            Path.home() / "agency-agents",
            Path(__file__).resolve().parents[5] / "agency-agents",
            Path("d:/ai/agency-agents"),
        ]
        for c in candidates:
            if c.exists():
                agency_path = str(c)
                break
    if not agency_path:
        return 0
    from deerflow.config.paths import get_paths
    custom_skills_path = get_paths().base_dir / "agency_custom_skills.json"
    return registry.load(agency_path, custom_skills_path)


# ── 路由 ──────────────────────────────────────────────────────────────────


@router.get(
    "/agents",
    response_model=AgentListResponse,
    summary="列出所有 Agency 角色",
    description="返回所有 agency-agents 角色的 L0 卡片数据，支持按部门和关键词过滤。",
)
async def list_agency_agents(
    division: str | None = Query(None, description="按部门过滤"),
    status: str | None = Query(None, description="按状态过滤：dormant, running, idle"),
    q: str | None = Query(None, description="关键词搜索"),
) -> AgentListResponse:
    _ensure_loaded()
    registry = get_agency_registry()

    agent_status = AgentStatus(status) if status else None
    agents = registry.list_agents(division=division, status=agent_status, query=q)
    divisions = registry.get_divisions()

    return AgentListResponse(
        agents=[AgentCardResponse(**a.to_ui_card()) for a in agents],
        total=len(agents),
        divisions=[DivisionResponse(**d) for d in divisions],
    )


@router.post(
    "/reload",
    summary="重新加载角色目录",
    description="重新扫描 agency-agents 目录，加载新增或修改的角色定义。",
)
async def reload_agents() -> dict:
    count = _force_reload()
    return {"reloaded": count, "message": f"已重新加载 {count} 个角色"}


@router.get(
    "/agents/{agent_id}",
    response_model=AgentDetailResponse,
    summary="获取角色详情",
    description="返回角色的 L1 详情数据，包含完整技能列表、工作流程等。",
)
async def get_agency_agent(agent_id: str) -> AgentDetailResponse:
    _ensure_loaded()
    registry = get_agency_registry()
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")
    return AgentDetailResponse(**agent.to_detail())


@router.get(
    "/divisions",
    response_model=list[DivisionResponse],
    summary="获取部门列表",
)
async def list_divisions() -> list[DivisionResponse]:
    _ensure_loaded()
    registry = get_agency_registry()
    return [DivisionResponse(**d) for d in registry.get_divisions()]


@router.post(
    "/agents/{agent_id}/activate",
    response_model=ActivateResponse,
    summary="激活角色",
    description="按需实例化角色为 DeerFlow Agent，生成 A2A 端点。",
)
async def activate_agency_agent(agent_id: str) -> ActivateResponse:
    _ensure_loaded()
    registry = get_agency_registry()
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")

    if agent.status == AgentStatus.RUNNING:
        return ActivateResponse(
            agentId=agent_id,
            status=agent.status.value,
            instanceId=agent.instance_id,
            a2aEndpoint=f"/a2a/{agent_id}",
        )

    try:
        from deerflow.agency.factory import get_agent_factory
        factory = get_agent_factory()
        instance_id = await factory.instantiate(agent)

        return ActivateResponse(
            agentId=agent_id,
            status=AgentStatus.RUNNING.value,
            instanceId=instance_id,
            a2aEndpoint=f"/a2a/{agent_id}",
            agentCard=agent.to_a2a_agent_card(),
        )
    except Exception as e:
        logger.error(f"激活角色 '{agent_id}' 失败: {e}", exc_info=True)
        registry.set_agent_status(agent_id, AgentStatus.ERROR)
        raise HTTPException(status_code=500, detail=f"激活失败: {str(e)}")


@router.post(
    "/agents/{agent_id}/deactivate",
    summary="停用角色",
)
async def deactivate_agency_agent(agent_id: str) -> dict:
    _ensure_loaded()
    registry = get_agency_registry()
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")

    registry.set_agent_status(agent_id, AgentStatus.DORMANT, instance_id=None)
    return {"agentId": agent_id, "status": "dormant"}


@router.get(
    "/agents/{agent_id}/a2a-card",
    summary="获取角色的 A2A AgentCard",
)
async def get_a2a_card(agent_id: str) -> dict:
    _ensure_loaded()
    registry = get_agency_registry()
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")
    return agent.to_a2a_agent_card()


# ── 自定义技能管理 ────────────────────────────────────────────────────────


@router.get(
    "/agents/{agent_id}/custom-skills",
    summary="获取角色的自定义技能",
)
async def list_custom_skills(agent_id: str) -> list[dict]:
    _ensure_loaded()
    registry = get_agency_registry()
    skills = registry.get_custom_skills(agent_id)
    if skills is None:
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")
    return [s.to_dict() for s in skills]


@router.post(
    "/agents/{agent_id}/custom-skills",
    status_code=201,
    summary="添加自定义技能",
)
async def add_custom_skill(agent_id: str, request: CustomSkillRequest) -> dict:
    _ensure_loaded()
    registry = get_agency_registry()

    skill = CustomSkill(
        id=request.id,
        name=request.name,
        description=request.description,
        tools=request.tools,
        references=request.references,
        examples=request.examples,
    )

    if not registry.add_custom_skill(agent_id, skill):
        raise HTTPException(status_code=404, detail=f"角色 '{agent_id}' 不存在")

    return skill.to_dict()


@router.delete(
    "/agents/{agent_id}/custom-skills/{skill_id}",
    status_code=204,
    summary="删除自定义技能",
)
async def delete_custom_skill(agent_id: str, skill_id: str) -> None:
    _ensure_loaded()
    registry = get_agency_registry()
    if not registry.remove_custom_skill(agent_id, skill_id):
        raise HTTPException(status_code=404, detail=f"技能 '{skill_id}' 不存在")
