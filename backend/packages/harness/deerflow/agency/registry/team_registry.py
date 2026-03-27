"""
Team Registry：团队注册中心

管理团队工作室中的团队配置生命周期：
- 草稿团队（DRAFT）：在团队工作室中编辑
- 已启用团队（ACTIVE）：进入专家团队列表
- 运行中团队（RUNNING）：正在执行聊天任务

存储方案：每个团队一个 JSON 文件，存放在 {base_dir}/teams/{team_id}/team.json
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from threading import Lock
from typing import Any

from deerflow.agency.models import TeamDefinition, TeamStatus, _now_iso

logger = logging.getLogger(__name__)


class TeamRegistry:
    """团队注册中心（单例）"""

    def __init__(self) -> None:
        self._teams: dict[str, TeamDefinition] = {}
        self._lock = Lock()
        self._loaded = False
        self._teams_dir: Path | None = None

    def load(self, teams_dir: str | Path) -> int:
        """从磁盘加载所有团队配置。

        Args:
            teams_dir: 团队存储根目录

        Returns:
            加载的团队数量
        """
        self._teams_dir = Path(teams_dir)
        self._teams_dir.mkdir(parents=True, exist_ok=True)

        with self._lock:
            self._teams.clear()
            for team_dir in self._teams_dir.iterdir():
                if not team_dir.is_dir():
                    continue
                team_file = team_dir / "team.json"
                if not team_file.exists():
                    continue
                try:
                    with open(team_file, encoding="utf-8") as f:
                        data = json.load(f)
                    team = TeamDefinition.from_dict(data)
                    self._teams[team.id] = team
                except Exception as e:
                    logger.warning(f"加载团队配置失败 {team_file}: {e}")

            self._loaded = True
            logger.info(f"TeamRegistry 已加载 {len(self._teams)} 个团队")
            return len(self._teams)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def list_teams(
        self,
        status: TeamStatus | None = None,
        query: str | None = None,
    ) -> list[TeamDefinition]:
        """列出团队，支持按状态和关键词过滤。"""
        teams = list(self._teams.values())

        if status:
            teams = [t for t in teams if t.status == status]

        if query:
            q = query.lower()
            teams = [
                t for t in teams
                if q in t.name.lower()
                or q in t.description.lower()
                or q in t.tag.lower()
            ]

        teams.sort(key=lambda t: t.updated_at, reverse=True)
        return teams

    def get_team(self, team_id: str) -> TeamDefinition | None:
        """获取单个团队定义"""
        return self._teams.get(team_id)

    def create_team(self, data: dict[str, Any]) -> TeamDefinition:
        """创建新团队"""
        team_id = TeamDefinition.new_id()
        now = _now_iso()

        team = TeamDefinition(
            id=team_id,
            name=data.get("name", "未命名团队"),
            description=data.get("description", ""),
            icon=data.get("icon", "🚀"),
            tag=data.get("tag", ""),
            tag_color=data.get("tagColor", "primary"),
            status=TeamStatus.DRAFT,
            created_at=now,
            updated_at=now,
        )

        if "members" in data:
            from deerflow.agency.models import TeamMember
            team.members = [TeamMember.from_dict(m) for m in data["members"]]
        if "connections" in data:
            from deerflow.agency.models import TeamConnection
            team.connections = [TeamConnection.from_dict(c) for c in data["connections"]]

        with self._lock:
            self._teams[team_id] = team
            self._persist(team)

        logger.info(f"创建团队: {team.name} ({team_id})")
        return team

    def update_team(self, team_id: str, data: dict[str, Any]) -> TeamDefinition | None:
        """更新团队配置"""
        team = self._teams.get(team_id)
        if not team:
            return None

        with self._lock:
            if "name" in data:
                team.name = data["name"]
            if "description" in data:
                team.description = data["description"]
            if "icon" in data:
                team.icon = data["icon"]
            if "tag" in data:
                team.tag = data["tag"]
            if "tagColor" in data:
                team.tag_color = data["tagColor"]
            if "members" in data:
                from deerflow.agency.models import TeamMember
                team.members = [TeamMember.from_dict(m) for m in data["members"]]
            if "connections" in data:
                from deerflow.agency.models import TeamConnection
                team.connections = [TeamConnection.from_dict(c) for c in data["connections"]]

            team.updated_at = _now_iso()
            self._persist(team)

        return team

    def delete_team(self, team_id: str) -> bool:
        """删除团队"""
        if team_id not in self._teams:
            return False

        with self._lock:
            del self._teams[team_id]
            if self._teams_dir:
                team_dir = self._teams_dir / team_id
                if team_dir.exists():
                    shutil.rmtree(team_dir, ignore_errors=True)

        logger.info(f"删除团队: {team_id}")
        return True

    def enable_team(self, team_id: str) -> TeamDefinition | None:
        """启用团队（draft -> active）"""
        team = self._teams.get(team_id)
        if not team:
            return None

        with self._lock:
            team.status = TeamStatus.ACTIVE
            team.updated_at = _now_iso()
            self._persist(team)

        return team

    def disable_team(self, team_id: str) -> TeamDefinition | None:
        """停用团队（active -> draft）"""
        team = self._teams.get(team_id)
        if not team:
            return None

        with self._lock:
            team.status = TeamStatus.DRAFT
            team.updated_at = _now_iso()
            self._persist(team)

        return team

    def _persist(self, team: TeamDefinition) -> None:
        """将团队配置持久化到 JSON 文件（原子写入）"""
        if not self._teams_dir:
            return

        team_dir = self._teams_dir / team.id
        team_dir.mkdir(parents=True, exist_ok=True)
        team_file = team_dir / "team.json"
        tmp_file = team_dir / "team.json.tmp"

        try:
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(team.to_dict(), f, ensure_ascii=False, indent=2)
            tmp_file.replace(team_file)
        except Exception as e:
            logger.error(f"持久化团队配置失败 {team.id}: {e}")
            if tmp_file.exists():
                tmp_file.unlink(missing_ok=True)


_registry: TeamRegistry | None = None


def get_team_registry() -> TeamRegistry:
    """获取全局 TeamRegistry 单例"""
    global _registry
    if _registry is None:
        _registry = TeamRegistry()
    return _registry
