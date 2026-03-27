"""团队工作室 API 路由

提供团队的增删改查、启用/停用、启动聊天等功能。
"""

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from deerflow.agency.models import TeamStatus
from deerflow.agency.registry.team_registry import get_team_registry
from deerflow.agency.team_commander import (
    activate_team_members,
    cleanup_commander_agent,
    create_commander_agent,
    deactivate_team_members,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/teams", tags=["teams"])


# ── 请求/响应模型 ─────────────────────────────────────────────────────────


class TeamMemberRequest(BaseModel):
    agentId: str
    agentType: str = "local"
    roleInTeam: str = ""
    executionMode: str = "collaborative"
    enabledSkills: list[str] = Field(default_factory=list)
    position: dict = Field(default_factory=lambda: {"x": 0, "y": 0})


class TeamConnectionRequest(BaseModel):
    fromAgent: str
    toAgent: str
    label: str = ""
    connType: str = "data"


class CreateTeamRequest(BaseModel):
    name: str = Field(..., min_length=1, description="团队名称")
    description: str = ""
    icon: str = "🚀"
    tag: str = ""
    tagColor: str = "primary"
    members: list[TeamMemberRequest] = Field(default_factory=list)
    connections: list[TeamConnectionRequest] = Field(default_factory=list)


class UpdateTeamRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    tag: str | None = None
    tagColor: str | None = None
    members: list[TeamMemberRequest] | None = None
    connections: list[TeamConnectionRequest] | None = None


class TeamResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    icon: str = "🚀"
    tag: str = ""
    tagColor: str = "primary"
    status: str = "draft"
    members: list[dict] = Field(default_factory=list)
    connections: list[dict] = Field(default_factory=list)
    createdAt: str = ""
    updatedAt: str = ""


class TeamSummaryResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    icon: str = "🚀"
    tag: str = ""
    tagColor: str = "primary"
    status: str = "draft"
    memberCount: int = 0
    connCount: int = 0
    createdAt: str = ""
    updatedAt: str = ""


class TeamListResponse(BaseModel):
    teams: list[TeamSummaryResponse]
    total: int


# ── 路由 ──────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=TeamListResponse,
    summary="列出所有团队",
)
async def list_teams(
    status: str | None = Query(None, description="按状态过滤: draft, active, running"),
    q: str | None = Query(None, description="关键词搜索"),
) -> TeamListResponse:
    registry = get_team_registry()
    team_status = TeamStatus(status) if status else None
    teams = registry.list_teams(status=team_status, query=q)
    return TeamListResponse(
        teams=[TeamSummaryResponse(**t.to_summary()) for t in teams],
        total=len(teams),
    )


@router.post(
    "",
    response_model=TeamResponse,
    status_code=201,
    summary="创建团队",
)
async def create_team(request: CreateTeamRequest) -> TeamResponse:
    registry = get_team_registry()
    data = request.model_dump(exclude_none=True)
    if "members" in data:
        data["members"] = [m if isinstance(m, dict) else m for m in data["members"]]
    if "connections" in data:
        data["connections"] = [c if isinstance(c, dict) else c for c in data["connections"]]
    team = registry.create_team(data)
    return TeamResponse(**team.to_dict())


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="获取团队详情",
)
async def get_team(team_id: str) -> TeamResponse:
    registry = get_team_registry()
    team = registry.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")
    return TeamResponse(**team.to_dict())


@router.put(
    "/{team_id}",
    response_model=TeamResponse,
    summary="更新团队",
)
async def update_team(team_id: str, request: UpdateTeamRequest) -> TeamResponse:
    registry = get_team_registry()
    data = request.model_dump(exclude_none=True)
    team = registry.update_team(team_id, data)
    if not team:
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")
    return TeamResponse(**team.to_dict())


@router.delete(
    "/{team_id}",
    status_code=204,
    summary="删除团队",
)
async def delete_team(team_id: str) -> None:
    registry = get_team_registry()
    if not registry.delete_team(team_id):
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")


@router.post(
    "/{team_id}/enable",
    response_model=TeamResponse,
    summary="启用团队",
    description="将草稿团队加入专家团队列表（draft -> active）",
)
async def enable_team(team_id: str) -> TeamResponse:
    registry = get_team_registry()
    team = registry.enable_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")
    return TeamResponse(**team.to_dict())


@router.post(
    "/{team_id}/disable",
    response_model=TeamResponse,
    summary="停用团队",
    description="将团队移回工作室草稿区（active -> draft）",
)
async def disable_team(team_id: str) -> TeamResponse:
    registry = get_team_registry()
    team = registry.disable_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")
    return TeamResponse(**team.to_dict())


@router.post(
    "/{team_id}/start",
    summary="启动团队聊天",
    description="激活团队所有成员，创建指挥官 Agent，返回指挥官 agent_name 供前端导航",
)
async def start_team_chat(team_id: str) -> dict:
    registry = get_team_registry()
    team = registry.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail=f"团队 '{team_id}' 不存在")

    if team.status == TeamStatus.DRAFT:
        raise HTTPException(status_code=400, detail="团队尚未启用，请先启用再开始聊天")

    if not team.members:
        raise HTTPException(status_code=400, detail="团队没有成员，无法启动聊天")

    activated = await activate_team_members(team)
    logger.info(f"团队 '{team.name}' 已激活 {len(activated)}/{len(team.members)} 个成员")

    commander_name = create_commander_agent(team)

    return {
        "teamId": team_id,
        "teamName": team.name,
        "commanderAgentName": commander_name,
        "status": "ready",
        "activatedMembers": activated,
        "members": [m.to_dict() for m in team.members],
    }


@router.post(
    "/{team_id}/stop",
    summary="停止团队聊天",
    description="清理指挥官 Agent 文件和成员激活状态，释放资源",
)
async def stop_team_chat(team_id: str) -> dict:
    registry = get_team_registry()
    team = registry.get_team(team_id)

    cleaned_commander = cleanup_commander_agent(team_id)

    deactivated: list[str] = []
    if team:
        deactivated = await deactivate_team_members(team)

    logger.info(
        f"团队 '{team_id}' 聊天资源已释放: "
        f"commander={'ok' if cleaned_commander else 'skip'}, "
        f"deactivated={len(deactivated)} members"
    )

    return {
        "teamId": team_id,
        "status": "stopped",
        "cleanedCommander": cleaned_commander,
        "deactivatedMembers": deactivated,
    }
