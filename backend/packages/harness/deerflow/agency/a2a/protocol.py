"""
A2A 协议数据模型

实现 Google Agent2Agent (A2A) 协议的核心数据结构：
Task、Message、Part、Artifact 等。
参考: https://google.github.io/A2A/specification/
"""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from typing import Any


class A2ATaskStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    WORKING = "working"
    INPUT_REQUIRED = "input-required"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


@dataclass
class TextPart:
    text: str
    type: str = "text"

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type, "text": self.text}


@dataclass
class FilePart:
    name: str
    mimeType: str
    data: str | None = None
    uri: str | None = None
    type: str = "file"

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"type": self.type, "file": {"name": self.name, "mimeType": self.mimeType}}
        if self.data:
            d["file"]["bytes"] = self.data
        if self.uri:
            d["file"]["uri"] = self.uri
        return d


@dataclass
class DataPart:
    data: dict[str, Any]
    type: str = "data"

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type, "data": self.data}


Part = TextPart | FilePart | DataPart


@dataclass
class A2AMessage:
    role: str  # "user" or "agent"
    parts: list[Part] = field(default_factory=list)
    messageId: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> dict[str, Any]:
        return {
            "role": self.role,
            "parts": [p.to_dict() for p in self.parts],
            "messageId": self.messageId,
        }

    @classmethod
    def user_text(cls, text: str) -> A2AMessage:
        return cls(role="user", parts=[TextPart(text=text)])

    @classmethod
    def agent_text(cls, text: str) -> A2AMessage:
        return cls(role="agent", parts=[TextPart(text=text)])


@dataclass
class A2AArtifact:
    name: str
    parts: list[Part] = field(default_factory=list)
    artifactId: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> dict[str, Any]:
        return {
            "artifactId": self.artifactId,
            "name": self.name,
            "parts": [p.to_dict() for p in self.parts],
        }


@dataclass
class A2ATask:
    """A2A Task：有状态的工作单元"""
    taskId: str = field(default_factory=lambda: str(uuid.uuid4()))
    contextId: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: A2ATaskStatus = A2ATaskStatus.SUBMITTED
    messages: list[A2AMessage] = field(default_factory=list)
    artifacts: list[A2AArtifact] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.taskId,
            "contextId": self.contextId,
            "status": {"state": self.status.value},
            "messages": [m.to_dict() for m in self.messages],
            "artifacts": [a.to_dict() for a in self.artifacts],
        }
