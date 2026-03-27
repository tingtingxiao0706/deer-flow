# Agency-Agents × DeerFlow 智能工作室平台

> 在 DeerFlow 2.0 基础上二次开发，将 [agency-agents](https://github.com/tingtingxiao0706/agency-agents) 的 140+ 专业角色实现为按需实例化的 A2A 智能体。

## 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                     DeerFlow Frontend (Next.js)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Chat UI     │  │  Agent       │  │  Agency Gallery   │   │
│  │  (原有)      │  │  Gallery     │  │  (新增)           │   │
│  │              │  │  (原有)      │  │  L0 卡片墙        │   │
│  │              │  │              │  │  L1 详情面板      │   │
│  │              │  │              │  │  L2 运行态追踪    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                  │               │
│         └────────────┬────┴──────────────────┘               │
│                      │ REST API                              │
├──────────────────────┼───────────────────────────────────────┤
│            DeerFlow Gateway (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /api/threads │  │ /api/agents  │  │ /api/agency/*    │   │
│  │ /api/models  │  │ /api/skills  │  │   (新增路由)      │   │
│  │ /api/memory  │  │ /api/mcp     │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────┬───────────┘   │
│                                              │               │
│  ┌───────────────────────────────────────────┤               │
│  │          agency 模块 (新增)               │               │
│  │  ┌────────┐ ┌────────┐ ┌───────┐ ┌─────┐ │               │
│  │  │ Parser │→│Registry│→│Factory│→│ A2A │ │               │
│  │  └────────┘ └────────┘ └───────┘ └─────┘ │               │
│  └───────────────────────────────────────────┘               │
│                                                              │
│            DeerFlow Lead Agent (LangGraph)                   │
│            + agency_agents_section 注入                      │
│            可感知并调度 140+ 专家角色                          │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────┐
│  agency-agents/    │
│  140+ Markdown     │
│  角色定义文件       │
│  13 个部门          │
└────────────────────┘
```

## 核心特性

### 1. 按需实例化
角色默认处于 `DORMANT`（休眠）状态，只有在需要时才实例化为 DeerFlow Agent，节省计算资源。

### 2. 渐进式技能披露
- **L0 卡片**：名称、部门、标签、状态指示灯
- **L1 详情**：完整技能列表、工作流程、交付物、成功指标
- **L2 运行态**：激活后显示 A2A 端点、实时状态追踪

### 3. A2A 通信协议
智能体间通过 [Google A2A 协议](https://google.github.io/A2A/) (JSON-RPC 2.0 over HTTP) 进行通信，支持：
- `message/send` — 同步消息发送
- `message/stream` — SSE 流式响应
- `tasks/get` — 任务状态查询

### 4. 用户自定义技能注入
- 前端可视化编辑器添加自定义技能
- 技能持久化到 `agency_custom_skills.json`
- 注入到角色的 system prompt 中

### 5. Lead Agent 自动编排
DeerFlow 的 Lead Agent 系统提示词中注入了所有可用角色信息，可自动选择合适的角色组合来完成复杂任务。

## 新增模块说明

### 后端 (`backend/packages/harness/deerflow/agency/`)

| 模块 | 说明 |
|------|------|
| `models.py` | 数据模型：`AgencyAgentDefinition`, `AgentSkill`, `CustomSkill`, `AgentStatus` |
| `parser/markdown_parser.py` | 解析 agency-agents 的 Markdown 角色定义文件 |
| `parser/directory_scanner.py` | 扫描 agency-agents 仓库目录结构 |
| `registry/agency_registry.py` | 角色注册中心：管理生命周期、查询、自定义技能 |
| `factory/agent_factory.py` | 按需将角色实例化为 DeerFlow Agent（config.yaml + SOUL.md） |
| `a2a/protocol.py` | A2A 协议数据模型（Task, Message, Part, Artifact） |
| `a2a/client.py` | A2A 客户端：Agent 间点对点通信 |

### Gateway API (`backend/app/gateway/routers/agency.py`)

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agency/agents` | GET | 角色列表（支持部门/关键词/状态过滤） |
| `/api/agency/agents/{id}` | GET | 角色详情（L1 数据） |
| `/api/agency/divisions` | GET | 部门列表及角色统计 |
| `/api/agency/agents/{id}/activate` | POST | 按需实例化角色 |
| `/api/agency/agents/{id}/deactivate` | POST | 停用角色 |
| `/api/agency/agents/{id}/a2a-card` | GET | A2A AgentCard |
| `/api/agency/agents/{id}/custom-skills` | GET/POST | 自定义技能管理 |
| `/api/agency/agents/{id}/custom-skills/{skill_id}` | DELETE | 删除自定义技能 |

### 前端 (`frontend/src/`)

| 路径 | 说明 |
|------|------|
| `core/agency/` | API 客户端、React Query hooks、类型定义 |
| `components/workspace/agents/agency-agent-card.tsx` | L0 角色卡片组件 |
| `components/workspace/agents/agency-gallery.tsx` | 角色目录页（搜索+部门过滤） |
| `components/workspace/agents/skill-editor-dialog.tsx` | 自定义技能编辑器 |
| `app/workspace/agents/agency/page.tsx` | 角色目录页面 |
| `app/workspace/agents/agency/[id]/page.tsx` | 角色详情页面 |

## 安装部署

### 前置条件
- DeerFlow 2.0 基础环境（Python 3.12+, Node.js 18+）
- 克隆 agency-agents 仓库

### 步骤

1. **克隆 agency-agents 角色仓库**
```bash
cd /path/to/your/projects
git clone https://github.com/tingtingxiao0706/agency-agents.git
```

2. **配置环境变量**
在 `.env` 中添加：
```bash
AGENCY_AGENTS_PATH=/path/to/agency-agents
```

3. **启动 DeerFlow**
```bash
# 按照 DeerFlow 原有方式启动即可
make dev
```

4. **访问专家团队页面**
打开浏览器访问 `http://localhost:3000/workspace/agents/agency`

### 验证安装

运行独立测试脚本：
```bash
cd backend
PYTHONIOENCODING=utf-8 python ../scripts/test_parser_standalone.py
```

## 使用示例

### 场景 1：前端开发任务
1. 在聊天框输入："帮我开发一个响应式的用户仪表板"
2. Lead Agent 自动识别需要前端开发专家
3. 系统按需实例化 `engineering-frontend-developer` 角色
4. 角色以其专业能力完成任务

### 场景 2：手动激活角色
1. 访问 `/workspace/agents/agency`
2. 浏览角色卡片，点击"激活"按钮
3. 查看角色详情和 A2A 端点
4. 在聊天中直接与激活的角色交互

### 场景 3：自定义技能
1. 进入角色详情页
2. 点击"添加技能"
3. 填写技能名称、描述和使用示例
4. 技能自动注入到角色的能力集中

## 部门一览

| 部门 | 角色数 | 说明 |
|------|--------|------|
| 💻 工程部 | 23 | 前端、后端、DevOps、安全等 |
| 📢 市场部 | 27 | 内容、SEO、社交媒体、邮件等 |
| 🎯 专业部 | 26 | 数据分析、法律、财务等 |
| 🎨 设计部 | 8 | UI/UX、品牌、动效设计等 |
| 🧪 测试部 | 8 | QA、自动化测试、安全测试等 |
| 💰 付费媒体部 | 7 | SEM、广告投放等 |
| 🎬 项目管理部 | 6 | Scrum Master、PM 等 |
| 🥽 空间计算部 | 6 | AR/VR/MR 开发等 |
| 🛟 支持部 | 6 | 客户支持、文档等 |
| 📊 产品部 | 5 | 产品经理、产品分析等 |
| 📚 学术部 | 5 | 研究、分析等 |
| 🎮 游戏开发部 | 5 | Unity/Unreal/Godot 等 |
| 💼 销售部 | 8 | 销售、BD 等 |

## 技术栈

- **后端**: Python 3.12+ / FastAPI / LangGraph
- **前端**: Next.js / React / Tailwind CSS / shadcn/ui
- **协议**: A2A (JSON-RPC 2.0 over HTTP/SSE)
- **数据**: YAML + Markdown + JSON
