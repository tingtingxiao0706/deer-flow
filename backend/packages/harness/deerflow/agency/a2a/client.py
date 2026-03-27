"""
A2A 客户端：用于 Agent 间点对点通信。

支持 Agent 间通过 A2A 协议（JSON-RPC 2.0 over HTTP）进行协作，
包括发送消息、获取任务状态和流式响应。
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, AsyncIterator

import httpx

from .protocol import A2AMessage, A2ATask, A2ATaskStatus, TextPart

logger = logging.getLogger(__name__)


class A2AClient:
    """A2A 协议客户端，用于 Agent 间通信"""

    def __init__(self, base_url: str = "http://localhost:8001", timeout: float = 300.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def send_message(
        self,
        agent_id: str,
        message: str,
        context_id: str | None = None,
        task_id: str | None = None,
    ) -> A2ATask:
        """向目标 Agent 发送 A2A message/send 请求。

        Args:
            agent_id: 目标 Agent ID
            message: 消息内容
            context_id: 上下文 ID（用于多轮对话）
            task_id: 任务 ID（续接已有任务）

        Returns:
            A2ATask 结果
        """
        endpoint = f"{self.base_url}/a2a/{agent_id}"

        params: dict[str, Any] = {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": message}],
                "messageId": str(uuid.uuid4()),
            }
        }
        if context_id:
            params["contextId"] = context_id
        if task_id:
            params["taskId"] = task_id

        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "message/send",
            "params": params,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                result = response.json()

                if "error" in result:
                    logger.error(f"A2A 请求失败: {result['error']}")
                    return A2ATask(status=A2ATaskStatus.FAILED)

                return self._parse_task_response(result.get("result", {}))

            except httpx.HTTPError as e:
                logger.error(f"A2A HTTP 请求失败 (agent={agent_id}): {e}")
                return A2ATask(status=A2ATaskStatus.FAILED)

    async def stream_message(
        self,
        agent_id: str,
        message: str,
        context_id: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """向目标 Agent 发送 A2A message/stream 请求（SSE）。

        Args:
            agent_id: 目标 Agent ID
            message: 消息内容
            context_id: 上下文 ID

        Yields:
            SSE 事件数据
        """
        endpoint = f"{self.base_url}/a2a/{agent_id}"

        params: dict[str, Any] = {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": message}],
                "messageId": str(uuid.uuid4()),
            }
        }
        if context_id:
            params["contextId"] = context_id

        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "message/stream",
            "params": params,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", endpoint, json=payload) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        try:
                            data = json.loads(line[6:])
                            yield data
                        except json.JSONDecodeError:
                            continue

    async def get_task(self, agent_id: str, task_id: str) -> A2ATask:
        """获取任务状态。"""
        endpoint = f"{self.base_url}/a2a/{agent_id}"

        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tasks/get",
            "params": {"taskId": task_id},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            result = response.json()
            return self._parse_task_response(result.get("result", {}))

    async def get_agent_card(self, agent_id: str) -> dict[str, Any]:
        """获取目标 Agent 的 AgentCard。"""
        url = f"{self.base_url}/.well-known/agent-card.json"
        params = {"assistant_id": agent_id}

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def _parse_task_response(self, data: dict[str, Any]) -> A2ATask:
        """解析 A2A 任务响应"""
        task = A2ATask(
            taskId=data.get("id", str(uuid.uuid4())),
            contextId=data.get("contextId", ""),
        )

        status_data = data.get("status", {})
        state = status_data.get("state", "submitted")
        try:
            task.status = A2ATaskStatus(state)
        except ValueError:
            task.status = A2ATaskStatus.SUBMITTED

        agent_msg = status_data.get("message")
        if agent_msg:
            parts = []
            for p in agent_msg.get("parts", []):
                if p.get("type") == "text":
                    parts.append(TextPart(text=p.get("text", "")))
            task.messages.append(A2AMessage(
                role=agent_msg.get("role", "agent"),
                parts=parts,
            ))

        return task
