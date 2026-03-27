"""
目录扫描器：扫描 agency-agents 仓库目录，发现并解析所有角色文件。
"""

from __future__ import annotations

import logging
from pathlib import Path

from deerflow.agency.models import AgencyAgentDefinition
from .markdown_parser import AgentMarkdownParser

logger = logging.getLogger(__name__)

KNOWN_DIVISIONS = {
    "engineering", "design", "marketing", "testing", "product",
    "project-management", "sales", "support", "paid-media",
    "spatial-computing", "specialized", "game-development",
    "academic", "strategy",
}

SKIP_DIRS = {
    ".github", "scripts", "integrations", "examples",
}


def scan_agency_directory(
    agency_agents_path: str | Path,
) -> list[AgencyAgentDefinition]:
    """扫描 agency-agents 仓库目录，解析所有角色定义文件。

    Args:
        agency_agents_path: agency-agents 仓库根目录路径

    Returns:
        解析成功的角色定义列表
    """
    root = Path(agency_agents_path)
    if not root.exists():
        logger.error(f"agency-agents 目录不存在: {root}")
        return []

    parser = AgentMarkdownParser()
    definitions: list[AgencyAgentDefinition] = []

    for division_dir in sorted(root.iterdir()):
        if not division_dir.is_dir():
            continue
        if division_dir.name in SKIP_DIRS:
            continue
        if division_dir.name.startswith("."):
            continue

        division = division_dir.name

        md_files = list(division_dir.glob("*.md"))
        if not md_files:
            _scan_subdirectories(division_dir, division, parser, definitions)
            continue

        for md_file in sorted(md_files):
            if md_file.name.startswith("README"):
                continue
            agent_def = parser.parse_file(md_file, division)
            if agent_def:
                definitions.append(agent_def)
                logger.debug(f"已解析: {agent_def.id} ({agent_def.name})")

    logger.info(f"共解析 {len(definitions)} 个角色定义，来自 {agency_agents_path}")
    return definitions


def _scan_subdirectories(
    parent_dir: Path,
    division: str,
    parser: AgentMarkdownParser,
    definitions: list[AgencyAgentDefinition],
) -> None:
    """递归扫描子目录（如 game-development/unity/）"""
    for sub_dir in sorted(parent_dir.iterdir()):
        if not sub_dir.is_dir():
            continue
        if sub_dir.name.startswith("."):
            continue

        sub_division = f"{division}/{sub_dir.name}"

        for md_file in sorted(sub_dir.glob("*.md")):
            if md_file.name.startswith("README"):
                continue
            agent_def = parser.parse_file(md_file, sub_division)
            if agent_def:
                definitions.append(agent_def)
                logger.debug(f"已解析: {agent_def.id} ({agent_def.name})")
