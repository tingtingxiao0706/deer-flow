# 主 Agent → 子 Agent 时序说明

本文说明 **主 agent（lead）** 通过 **`task` 工具** 委派任务时的运行时链路。实现可参考：`tools/builtins/task_tool.py`、`subagents/executor.py`、`agents/lead_agent/agent.py`。

## 时序图

```mermaid
sequenceDiagram
    autonumber
    participant Client as 客户端<br/>（浏览器 / SDK）
    participant LG as LangGraph 服务<br/>lead_agent 图
    participant Lead as 主 create_agent<br/>（中间件 + 工具）
    participant LLM as 主模型 LLM
    participant TT as task_tool
    participant SE as SubagentExecutor
    participant Pool as 调度线程池 +<br/>执行线程池
    participant Sub as 子 create_agent<br/>（过滤后的工具）
    participant SLLM as 子模型 LLM
    participant TW as stream_writer<br/>（自定义事件）

    Client->>LG: runs.stream / submit（HumanMessage + config）
    LG->>Lead: agent 步进

    loop 主循环直到最终回复
        Lead->>LLM: chat（messages，含 task 等工具）
        alt 模型仅返回文本
            LLM-->>Lead: AIMessage（content）
            Lead-->>Client: 状态 / SSE（messages）
        else 模型调用 task 工具
            LLM-->>Lead: AIMessage + tool_calls[task]
            Note over Lead: 可选：SubagentLimitMiddleware、<br/>LoopDetectionMiddleware（after_model）
            Lead->>TT: 执行 task(description, prompt, subagent_type, …)
            TT->>TT: get_subagent_config +<br/>get_available_tools(subagent_enabled=False)
            TT->>SE: SubagentExecutor(config, tools, sandbox, thread_data, …)
            TT->>SE: execute_async(prompt, task_id=tool_call_id)
            SE->>Pool: submit run_task()
            Pool->>Sub: execute() → asyncio.run(_aexecute)

            TW-->>Client: {type: task_started, task_id, description}

            loop 子 agent 内层循环（max_turns、recursion_limit）
                Sub->>SLLM: messages + 过滤后工具集
                alt 子模型需要工具
                    SLLM-->>Sub: AIMessage + tool_calls
                    Sub->>Sub: 执行工具（bash、MCP 等）<br/>无嵌套 task
                    Sub-->>TW: 可选：task_running + AI 片段
                else 子任务结束
                    SLLM-->>Sub: 最终 AIMessage
                end
            end

            Sub-->>Pool: SubagentResult（COMPLETED / FAILED / TIMED_OUT）
            Pool-->>TT: 轮询到终态
            TW-->>Client: task_completed | task_failed | task_timed_out
            TT-->>Lead: 字符串返回值 → ToolMessage
            Lead->>LLM: 携带工具结果进入下一轮
        end
    end

    Lead-->>Client: 最终流式状态
```

## 数据流简表

| 步骤 | 说明 |
|------|------|
| 1 | 主 LLM 发起 `task`，带上 `subagent_type`（`general-purpose` 或 `bash`）与 `prompt`。 |
| 2 | `task_tool` 构造 `SubagentExecutor`，继承父级 `sandbox` / `thread_data` / `thread_id`，子侧工具集去掉 `task`。 |
| 3 | 子 agent 在**后台线程池**中运行；`task_tool` **轮询**直至结束，同时通过 **自定义流事件** 推送给客户端。 |
| 4 | 子侧是独立的 `create_agent` + `astream`；结果汇总为一条 **ToolMessage** 回到主线程。 |
| 5 | 主 LLM 继续推理，可再次调工具或产出用户可见的最终回答。 |

## 关键源码位置

| 模块 | 路径 |
|------|------|
| `task` 工具 | `packages/harness/deerflow/tools/builtins/task_tool.py` |
| 子 agent 执行与线程池 | `packages/harness/deerflow/subagents/executor.py` |
| 内置子 agent 配置 | `packages/harness/deerflow/subagents/builtins/` |
| 主侧注册 `task` | `packages/harness/deerflow/tools/tools.py`、`agents/lead_agent/agent.py` |
| 子 agent 中间件（无 uploads） | `packages/harness/deerflow/agents/middlewares/tool_error_handling_middleware.py` → `build_subagent_runtime_middlewares` |
| 截断过量 `task` 调用 | `packages/harness/deerflow/agents/middlewares/subagent_limit_middleware.py` |

## 如何渲染时序图

- **GitHub / GitLab**：多数版本在 Markdown 预览中支持 Mermaid。
- **VS Code**：安装 Mermaid 预览类扩展，或将代码块粘贴到 [mermaid.live](https://mermaid.live)。
- **MkDocs / Docusaurus**：若对外发布文档，需启用 Mermaid 插件。
