"""A2A relay tool for proxying messages to remote agents via the A2A protocol."""

import logging

from langchain.tools import BaseTool
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field

from deerflow.agency.a2a.client import A2AClient
from deerflow.agency.a2a.protocol import A2ATaskStatus

logger = logging.getLogger(__name__)


class A2ARelayInput(BaseModel):
    """Input schema for the a2a_relay tool."""

    message: str = Field(description="The message to send to the remote agent")
    context_id: str | None = Field(
        default=None,
        description="Optional context ID for multi-turn conversations",
    )


class A2ARelayTool(BaseTool):
    """Forwards messages to a remote A2A-compatible agent and returns the response.

    This tool is dynamically created per remote agent endpoint, allowing the
    lead agent to transparently communicate with external A2A services.
    """

    name: str = "a2a_relay"
    description: str = "Send a message to a remote A2A agent and get the response"
    args_schema: type[BaseModel] = A2ARelayInput
    endpoint: str = ""
    agent_id: str = ""

    async def _arun(
        self,
        message: str,
        context_id: str | None = None,
        config: RunnableConfig | None = None,
    ) -> str:
        client = A2AClient(base_url=self.endpoint)
        try:
            task = await client.send_message(
                agent_id=self.agent_id,
                message=message,
                context_id=context_id,
            )
            if task.status == A2ATaskStatus.FAILED:
                return f"[A2A Error] Remote agent failed to process the message."

            parts = []
            for msg in task.messages:
                for part in msg.parts:
                    if hasattr(part, "text"):
                        parts.append(part.text)
            return "\n".join(parts) if parts else "(no response from remote agent)"

        except Exception as e:
            logger.error("A2A relay failed for %s: %s", self.endpoint, e)
            return f"[A2A Error] {e}"

    def _run(
        self,
        message: str,
        context_id: str | None = None,
    ) -> str:
        import asyncio

        return asyncio.run(self._arun(message, context_id))


def build_a2a_relay_tool(
    endpoint: str,
    agent_id: str = "",
    agent_name: str = "remote-agent",
    agent_description: str = "",
) -> A2ARelayTool:
    """Create a configured A2A relay tool for a specific remote agent.

    Args:
        endpoint: The base URL of the remote A2A agent (e.g., "https://agent.example.com").
        agent_id: The agent ID used in the A2A path (e.g., "/a2a/{agent_id}").
        agent_name: Human-readable agent name (used in tool description).
        agent_description: Optional description of the remote agent's capabilities.

    Returns:
        A configured A2ARelayTool instance.
    """
    desc = (
        f"Send a message to the remote agent '{agent_name}' via A2A protocol. "
        f"{agent_description}"
    ).strip()

    return A2ARelayTool(
        name="a2a_relay",
        description=desc,
        endpoint=endpoint,
        agent_id=agent_id,
    )
