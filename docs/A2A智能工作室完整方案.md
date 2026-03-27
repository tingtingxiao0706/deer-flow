# DeerFlow × Agency-Agents：A2A 智能工作室平台（完整方案）

> 以 DeerFlow 2.0 为完整基座（LangGraph Server、Gateway API、前端、沙箱、记忆系统全部复用），在其上构建 A2A 通信层、Agent 注册中心与工厂，将 Agency-Agents 的 140+ 角色实现为按需实例化的 A2A Agent，前端在 DeerFlow 现有 Next.js 基础上扩展。

---

## 一、项目总览

### 任务清单与实现状态

| # | 任务 | 状态 | 实现位置 |
|---|------|------|---------|
| 1 | Fork DeerFlow 2.0 仓库，确认 LangGraph A2A 端点可用 | ✅ 完成 | `d:\ai\deer-flow` |
| 2 | 克隆 agency-agents 仓库，分析 Markdown 文件结构 | ✅ 完成 | `d:\ai\agency-agents`（140 角色 / 13 部门） |
| 3 | 开发 Markdown Parser | ✅ 完成 | `deerflow/agency/parser/` |
| 4 | 实现 Agent Registry + Gateway API 路由 | ✅ 完成 | `deerflow/agency/registry/` + `routers/agency.py` |
| 5 | 实现 Agent Factory | ✅ 完成 | `deerflow/agency/factory/` |
| 6 | 增强 Lead Agent system prompt | ✅ 完成 | `lead_agent/prompt.py` |
| 7 | 实现 A2A 通信层 | ✅ 完成 | `deerflow/agency/a2a/` |
| 8 | 前端智能体目录页（L0/L1/L2） | ✅ 完成 | `frontend/src/app/workspace/agents/agency/` |
| 9 | 用户自定义技能注入 | ✅ 完成 | 前端编辑器 + API + JSON 持久化 |
| 10 | UI 设计规范 | ✅ 完成 | 内嵌各组件（渐变卡片、状态指示灯等） |
| 11 | 端到端验证 | ✅ 完成 | `scripts/test_parser_standalone.py` |
| 12 | 撰写中文文档 | ✅ 完成 | `AGENCY_README.md` |

---

## 二、DeerFlow 的定位：完整基座

DeerFlow 2.0 不是可选组件，而是整个平台的**地基**。我们复用它的全部能力，在其上叠加 A2A 通信层和 Agent 管理层。

### DeerFlow 提供什么 vs 我们新增什么

| DeerFlow 已有（直接复用） | 我们在其上新增 |
|---|---|
| LangGraph Server（端口 2024） | A2A 通信层（利用 LangGraph 内置 A2A 端点） |
| Gateway API / FastAPI（端口 8001） | Agent Registry（注册中心）路由 `/api/agency/*` |
| 前端 Next.js（聊天界面、设置、国际化） | 智能体目录（卡片墙）、渐进式技能披露 UI |
| 沙箱系统（Docker 隔离执行） | 直接复用，多 Agent 共享 |
| 记忆系统（长短期记忆） | 直接复用，按 Agent 隔离 |
| 中间件管道 | 新增 Agent 路由中间件 |
| 技能系统（SKILL.md 加载） | 保留原有技能 + 新增 Agent 角色系统 |
| 子智能体系统（task() 调用） | 升级：内部仍用 task()，对外暴露 A2A |
| 模型配置（多模型支持） | 直接复用 |
| MCP 服务器配置 | 直接复用 |
| Nginx 反向代理（端口 2026） | 新增 A2A 端点路由规则 |

---

## 三、架构全景

```
┌──────────────────────────────────────────────────────────────────┐
│                  DeerFlow 2.0 基座                               │
│                                                                  │
│  ┌────────── 前端层（Next.js - DeerFlow 现有 + 扩展）──────────┐  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │  │
│  │  │ 聊天界面  │  │ 设置页面  │  │ Agent目录  │  │ 技能编辑  │ │  │
│  │  │ (原有)    │  │ (原有)    │  │ (新增)     │  │ (新增)    │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬──────┘  └────┬─────┘ │  │
│  │       └──────────────┴─────────────┴──────────────┘       │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │ REST API                            │
│  ┌─────── Gateway API（FastAPI - DeerFlow 现有 + 扩展）────────┐  │
│  │                                                            │  │
│  │  /api/models   /api/skills   /api/agents   /api/agency/*  │  │
│  │  /api/memory   /api/mcp      (原有CRUD)    (新增8个端点)   │  │
│  │                                                            │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────── 新增 agency 模块 ────────────┐                     │
│  │                                         │                     │
│  │  ┌────────┐  ┌──────────┐  ┌─────────┐ │                     │
│  │  │ Parser │→ │ Registry │→ │ Factory │ │                     │
│  │  └────────┘  └──────────┘  └────┬────┘ │                     │
│  │                                 │      │                     │
│  │  ┌──────────────────────────────┤      │                     │
│  │  │ A2A Protocol + Client       │      │                     │
│  │  └──────────────────────────────┘      │                     │
│  └─────────────────────────────────────────┘                     │
│                            │                                     │
│  ┌─── LangGraph Server（DeerFlow 现有 + 增强）────────────────┐  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │  │
│  │  │ Lead Agent   │  │ 子智能体系统  │  │ A2A 端点         │ │  │
│  │  │ (增强为总监)  │  │ (task() 调用) │  │ /a2a/{agent_id}  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── 基础设施（DeerFlow 现有，直接复用）─────────────────────┐  │
│  │  沙箱系统   记忆系统   模型网关   中间件管道               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────┐         ┌──────────────────────┐
│  agency-agents/      │         │  外部 A2A 客户端      │
│  140+ Markdown       │         │  (任何兼容系统)        │
│  角色定义文件          │         │  JSON-RPC 2.0         │
│  13 个部门            │         └──────────────────────┘
└──────────────────────┘
```

---

## 四、DeerFlow 改造要点

### 1. Lead Agent 增强为"总监"

DeerFlow 的 Lead Agent 本身就是任务编排者，我们增强它的 system prompt，让它具备：

- 感知 Agent Registry 中所有可用角色
- 根据用户任务自动选择合适的角色组合
- 通过 DeerFlow 现有的 `task()` 调用派生子智能体
- 子智能体对外暴露 A2A 端点（LangGraph 内置能力）

**实现文件**：`backend/packages/harness/deerflow/agents/lead_agent/prompt.py`
- 新增 `_build_agency_agents_section()` 函数
- 在 `SYSTEM_PROMPT_TEMPLATE` 中注入 `{agency_agents_section}` 占位符
- 在 `apply_prompt_template()` 中生成并填充角色花名册

### 2. Gateway API 新增路由

在 DeerFlow 的 `backend/app/gateway/routers/` 下新增 `agency.py`：

```
routers/
├── models.py          # DeerFlow 原有
├── skills.py          # DeerFlow 原有
├── mcp.py             # DeerFlow 原有
├── agents.py          # DeerFlow 原有（自定义 Agent CRUD）
├── agency.py          # ★ 新增：Agency-Agents 角色管理
└── ...
```

新增 API 端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agency/agents` | GET | 角色列表（支持 `division` / `q` / `status` 过滤） |
| `/api/agency/agents/{id}` | GET | 角色详情（L1 数据） |
| `/api/agency/divisions` | GET | 部门列表及角色统计 |
| `/api/agency/agents/{id}/activate` | POST | 按需实例化角色 |
| `/api/agency/agents/{id}/deactivate` | POST | 停用角色 |
| `/api/agency/agents/{id}/a2a-card` | GET | A2A AgentCard |
| `/api/agency/agents/{id}/custom-skills` | GET/POST | 自定义技能 CRUD |
| `/api/agency/agents/{id}/custom-skills/{skill_id}` | DELETE | 删除自定义技能 |

### 3. A2A 端点（零改造）

LangGraph `>= 0.4.21` 已内置 A2A 端点支持，每个 assistant 自动暴露：

- `GET /.well-known/agent-card.json?assistant_id={id}` — AgentCard
- `POST /a2a/{assistant_id}` — JSON-RPC（message/send, message/stream, tasks/get）

DeerFlow 基于 LangGraph，这部分**无需额外开发**，只需确保版本满足要求。

### 4. 前端扩展（在 DeerFlow 现有基础上）

DeerFlow 前端已有：聊天界面、设置页面、子任务追踪、产出文件展示、国际化。

我们在其上**新增页面和组件**（不替换原有功能）：

```
frontend/src/
├── core/
│   └── agency/                        # ★ 新增：Agency API 模块
│       ├── types.ts                   # 类型定义
│       ├── api.ts                     # API 客户端
│       ├── hooks.ts                   # React Query hooks
│       └── index.ts
├── components/workspace/agents/
│   ├── agent-card.tsx                 # DeerFlow 原有
│   ├── agent-gallery.tsx              # DeerFlow 原有
│   ├── agency-agent-card.tsx          # ★ 新增：Agency 角色卡片
│   ├── agency-gallery.tsx             # ★ 新增：角色目录页
│   └── skill-editor-dialog.tsx        # ★ 新增：技能编辑器
├── app/workspace/agents/
│   ├── page.tsx                       # DeerFlow 原有
│   └── agency/                        # ★ 新增
│       ├── page.tsx                   # 角色目录页面（L0 卡片墙）
│       └── [id]/page.tsx              # 角色详情页面（L1 + L2）
```

侧边栏导航 `workspace-nav-chat-list.tsx` 中新增"专家团队"入口。

---

## 五、新增后端模块详解

所有新增代码位于 `backend/packages/harness/deerflow/agency/` 下：

```
agency/
├── __init__.py              # 模块入口，导出核心类
├── models.py                # 数据模型
│   ├── AgentStatus          # 枚举：dormant / instantiating / running / idle / error
│   ├── AgentSkill           # 从 Markdown 提取的技能
│   ├── CustomSkill          # 用户自定义技能
│   └── AgencyAgentDefinition # 核心：完整角色定义
│       ├── to_ui_card()     # → L0 卡片 JSON
│       ├── to_detail()      # → L1 详情 JSON
│       ├── to_a2a_agent_card() # → A2A AgentCard JSON
│       └── to_system_prompt()  # → L2 完整 system prompt
│
├── parser/
│   ├── markdown_parser.py   # AgentMarkdownParser
│   │   ├── parse_file()     # 解析单个 .md 文件
│   │   ├── _extract_frontmatter()  # YAML frontmatter
│   │   ├── _split_sections()       # ## 标题分段
│   │   ├── _extract_skills()       # 技能提取
│   │   └── _classify_section()     # 段落分类
│   └── directory_scanner.py # scan_agency_directory()
│
├── registry/
│   └── agency_registry.py   # AgencyRegistry（单例，线程安全）
│       ├── load()            # 加载全部角色 + 自定义技能
│       ├── list_agents()     # 过滤查询
│       ├── get_agent()       # 单个查询
│       ├── get_divisions()   # 部门统计
│       ├── set_agent_status() # 状态管理
│       ├── add_custom_skill() # 技能注入
│       ├── remove_custom_skill()
│       └── _persist_custom_skills() # JSON 持久化
│
├── factory/
│   └── agent_factory.py     # AgentFactory
│       ├── instantiate()     # → config.yaml + SOUL.md → DeerFlow Agent
│       ├── deactivate()
│       └── DIVISION_TOOL_GROUPS  # 部门→工具映射
│
└── a2a/
    ├── protocol.py           # A2A 数据模型
    │   ├── A2ATaskStatus     # submitted / working / completed / failed / ...
    │   ├── TextPart / FilePart / DataPart
    │   ├── A2AMessage        # user / agent 消息
    │   ├── A2AArtifact       # 任务产出物
    │   └── A2ATask           # 有状态工作单元
    └── client.py             # A2AClient
        ├── send_message()    # JSON-RPC message/send
        ├── stream_message()  # SSE message/stream
        ├── get_task()        # tasks/get
        └── get_agent_card()  # AgentCard 发现
```

---

## 六、Agent 生命周期（与 DeerFlow 深度集成）

```
阶段一（静态，不占资源）          阶段二（按需实例化）          阶段三（运行态）
═══════════════════════      ═══════════════════════     ═══════════════════════
                                                        
agency-agents/               用户选择 / 总监调度         A2A 端点就绪
   └─ *.md 文件                   │                    /a2a/{agent_id}
        │                         ▼                         │
        ▼                    Agent Factory              AgentCard 暴露
   Markdown Parser           ├─ config.yaml 生成        /.well-known/
   ├─ YAML frontmatter       ├─ SOUL.md 生成                │
   ├─ 段落分类                └─ 注册为 DeerFlow Agent    接收任务 → 沙箱执行
   └─ 技能提取                                               │
        │                                               与其他 Agent
        ▼                                               A2A 协作
   AgentDefinition
   ├─ to_ui_card() → L0 卡片
   ├─ to_detail()  → L1 详情
   └─ 存入 Registry
```

**关键**：阶段一仅解析 Markdown 生成轻量数据结构和 UI 卡片，不创建任何 LangGraph Agent 实例。只有当用户选择某个角色、或总监 Agent 判断需要该角色时，才进入阶段二实例化。

---

## 七、渐进式技能披露（三层展开）

### L0 — 卡片墙（页面加载即可见）

- 从角色 Markdown 预解析提取：名称、部门图标、一句话描述、3-5 个核心技能标签
- 状态指示：休眠 ⚪ / 启动中 🟡 / 运行中 🟢 / 错误 🔴
- 支持按部门过滤、关键词搜索
- **无需实例化 Agent**

### L1 — 详情面板（用户点击卡片）

- 完整技能列表、工作流程步骤、示例交付物、成功指标
- 用户自定义技能管理入口（添加/删除）
- 角色人设描述（Personality、Role）
- **仍无需实例化 Agent**

### L2 — 运行态（用户激活 / 总监调度）

- Agent Factory 实例化 LangGraph Agent
- A2A 端点就绪，AgentCard 可访问
- 实时任务状态流（复用 DeerFlow 的 SSE 推送机制）
- 沙箱内代码执行、产出文件展示（复用 DeerFlow 的 Artifacts 系统）

---

## 八、用户自定义技能注入

用户通过前端技能编辑器为任何角色添加自定义技能：

1. 前端弹窗输入：技能名称 + 描述 + 使用示例
2. API `POST /api/agency/agents/{id}/custom-skills` 保存
3. Registry 更新角色的 `custom_skills` 列表
4. 持久化到 `agency_custom_skills.json`
5. 下次该 Agent 实例化时，自定义技能自动注入 system prompt
6. 如果 Agent 已在运行，下次重建时生效

---

## 九、A2A 通信：内外兼修

| 场景 | 通信方式 | 说明 |
|------|---------|------|
| 总监 → 子智能体 | DeerFlow `task()` 内部调用 | 高效，复用 DeerFlow 现有编排能力 |
| 子智能体 ↔ 子智能体 | A2A `message/send` | 标准化，Agent 间点对点协作 |
| 外部系统 → 平台 Agent | A2A JSON-RPC | 开放接口，任何 A2A 客户端可接入 |
| 外部 Agent → 平台 Agent | A2A `message/send` | 跨平台互操作 |

这样既保持了 DeerFlow 内部编排的高效性，又通过 A2A 实现了标准化的对外通信和 Agent 间协作。

---

## 十、部门与角色统计

经 Parser 实际解析验证（140 个角色 / 13 个部门）：

| 部门 | 图标 | 角色数 | 典型角色 |
|------|------|--------|---------|
| 工程部 | 💻 | 23 | 前端开发、后端开发、DevOps、安全工程师 |
| 市场部 | 📢 | 27 | 内容策略、SEO、社交媒体、邮件营销 |
| 专业部 | 🎯 | 26 | 数据分析、法律顾问、财务分析 |
| 设计部 | 🎨 | 8 | UI 设计师、UX 架构师、品牌守护者、动效设计 |
| 测试部 | 🧪 | 8 | QA 工程师、自动化测试、安全测试、性能测试 |
| 销售部 | 💼 | 8 | 销售策略、BD、客户关系 |
| 付费媒体部 | 💰 | 7 | SEM、程序化广告、社交广告 |
| 项目管理部 | 🎬 | 6 | Scrum Master、PM、风险管理 |
| 空间计算部 | 🥽 | 6 | AR/VR/MR 开发 |
| 支持部 | 🛟 | 6 | 客户支持、技术文档 |
| 产品部 | 📊 | 5 | 产品经理、产品分析 |
| 学术部 | 📚 | 5 | 人类学家、地理学家、历史学家 |
| 游戏开发部 | 🎮 | 5 | Unity/Unreal/Godot 开发 |

---

## 十一、技术栈总结

- **基座**：DeerFlow 2.0 全栈
  - LangGraph Server（Agent 编排 + A2A 端点）
  - FastAPI Gateway（API 网关）
  - Next.js 前端（React + Tailwind CSS + shadcn/ui）
  - Docker 沙箱（代码隔离执行）
  - 记忆系统（长短期记忆）
- **A2A 端点**：LangGraph 内置（`langgraph-api >= 0.4.21`，零额外开发）
- **Agent 管理**：新增 Agent Registry + Agent Factory + Markdown Parser 模块
- **角色来源**：Agency-Agents 140+ Markdown 文件
- **协议**：A2A（JSON-RPC 2.0 over HTTP/SSE）
- **数据格式**：YAML + Markdown + JSON
- **部署**：Docker Compose（复用 DeerFlow 现有部署方案）

---

## 十二、安装部署

### 前置条件

- Python 3.12+
- Node.js 18+
- Docker（沙箱执行需要）
- Git

### 步骤

1. **克隆项目**
```bash
git clone <deer-flow-fork-url> deer-flow
cd deer-flow
```

2. **克隆 agency-agents 角色仓库**
```bash
git clone https://github.com/tingtingxiao0706/agency-agents.git ../agency-agents
```

3. **配置环境变量**

在 `.env` 中添加：
```bash
AGENCY_AGENTS_PATH=/path/to/agency-agents
```

4. **安装依赖并启动**
```bash
make install
make dev
```

5. **访问专家团队页面**

打开浏览器访问 `http://localhost:3000/workspace/agents/agency`

### 验证安装

```bash
cd backend
PYTHONIOENCODING=utf-8 python ../scripts/test_parser_standalone.py
```

预期输出：`Total agents parsed: 140`

---

## 十三、使用示例

### 场景 1：自动编排——前端开发任务

```
用户输入: "帮我开发一个响应式的用户仪表板"

Lead Agent 自动识别:
  → 需要前端开发专家 (engineering-frontend-developer)
  → 需要 UI 设计师 (design-ui-designer)

系统自动:
  1. Agent Factory 实例化两个角色
  2. Lead Agent 通过 task() 并行分配子任务
  3. 前端开发 Agent 在沙箱中执行代码
  4. UI 设计 Agent 提供设计规范
  5. 汇总交付
```

### 场景 2：手动激活角色

1. 访问 `/workspace/agents/agency`
2. 浏览角色卡片，选择部门过滤或搜索
3. 点击"激活"按钮
4. 查看角色详情和 A2A 端点
5. 在聊天中直接与激活的角色交互

### 场景 3：自定义技能扩展

1. 进入角色详情页（如 `engineering-frontend-developer`）
2. 点击"添加技能"
3. 填写：名称="Next.js SSR 优化"、描述="专注于 Next.js 服务端渲染的性能优化"
4. 技能自动注入，下次实例化时 Agent 将具备此能力

### 场景 4：外部系统集成（A2A 协议）

```bash
# 发送 A2A 请求到平台的某个角色
curl -X POST http://localhost:8001/a2a/engineering-frontend-developer \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "审查这段 React 代码的性能"}]
      }
    }
  }'
```

---

## 十四、文件变更清单

### 新增文件

```
backend/packages/harness/deerflow/agency/
├── __init__.py
├── models.py
├── parser/
│   ├── __init__.py
│   ├── markdown_parser.py
│   └── directory_scanner.py
├── registry/
│   ├── __init__.py
│   └── agency_registry.py
├── factory/
│   ├── __init__.py
│   └── agent_factory.py
└── a2a/
    ├── __init__.py
    ├── protocol.py
    └── client.py

backend/app/gateway/routers/agency.py

frontend/src/core/agency/
├── types.ts
├── api.ts
├── hooks.ts
└── index.ts

frontend/src/components/workspace/agents/
├── agency-agent-card.tsx
├── agency-gallery.tsx
└── skill-editor-dialog.tsx

frontend/src/app/workspace/agents/agency/
├── page.tsx
└── [id]/page.tsx

scripts/test_agency.py
scripts/test_parser_standalone.py
docs/A2A智能工作室完整方案.md
AGENCY_README.md
```

### 修改文件

```
backend/app/gateway/app.py               # 注册 agency 路由
backend/packages/harness/deerflow/agents/lead_agent/prompt.py  # 注入角色花名册
frontend/src/components/workspace/workspace-nav-chat-list.tsx   # 添加侧边栏入口
.env.example                              # 添加 AGENCY_AGENTS_PATH 配置
```
