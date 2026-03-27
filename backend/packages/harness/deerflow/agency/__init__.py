"""
Agency-Agents 集成模块

将 agency-agents 的 147+ 角色定义解析、注册、按需实例化为
DeerFlow 内部的 Agent，并通过 A2A 协议对外暴露。
"""

from .parser import AgentMarkdownParser, scan_agency_directory
from .registry import AgencyRegistry, TeamRegistry
from .factory import AgentFactory

__all__ = [
    "AgentMarkdownParser",
    "scan_agency_directory",
    "AgencyRegistry",
    "TeamRegistry",
    "AgentFactory",
]
