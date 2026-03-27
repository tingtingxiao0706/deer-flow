"""
Agency-Agents 集成端到端验证脚本

验证流程：
1. 解析 agency-agents Markdown 文件
2. 注册到 AgencyRegistry
3. 查询角色列表和详情
4. 按需实例化角色
5. 验证 A2A AgentCard 生成
"""

import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("test_agency")

AGENCY_AGENTS_PATH = Path("d:/ai/agency-agents")
if not AGENCY_AGENTS_PATH.exists():
    # Try relative path
    AGENCY_AGENTS_PATH = Path(__file__).resolve().parents[1] / ".." / "agency-agents"


def test_parser():
    """测试 Markdown 解析器"""
    from deerflow.agency.parser import scan_agency_directory

    logger.info("=" * 60)
    logger.info("阶段 1：测试 Markdown 解析器")
    logger.info("=" * 60)

    definitions = scan_agency_directory(AGENCY_AGENTS_PATH)
    logger.info(f"✓ 成功解析 {len(definitions)} 个角色定义")

    if not definitions:
        logger.error("✗ 未能解析任何角色定义！请检查 AGENCY_AGENTS_PATH")
        return False

    # 显示前 5 个
    for d in definitions[:5]:
        logger.info(f"  {d.division_emoji} {d.name} ({d.division})")
        logger.info(f"    技能: {[s.name for s in d.core_skills[:3]]}")
        logger.info(f"    描述: {d.description[:80]}...")

    # 统计各部门数量
    divisions: dict[str, int] = {}
    for d in definitions:
        base = d.division.split("/")[0]
        divisions[base] = divisions.get(base, 0) + 1
    logger.info(f"\n  部门分布: {divisions}")

    return True


def test_registry():
    """测试注册中心"""
    from deerflow.agency.registry import AgencyRegistry

    logger.info("\n" + "=" * 60)
    logger.info("阶段 2：测试注册中心")
    logger.info("=" * 60)

    registry = AgencyRegistry()
    count = registry.load(AGENCY_AGENTS_PATH)
    logger.info(f"✓ Registry 加载完成，共 {count} 个角色")

    # 测试查询
    engineering = registry.list_agents(division="engineering")
    logger.info(f"✓ 工程部角色: {len(engineering)} 个")

    # 测试搜索
    react_agents = registry.list_agents(query="react")
    logger.info(f"✓ 搜索 'react': {len(react_agents)} 个结果")
    for a in react_agents[:3]:
        logger.info(f"  - {a.name}")

    # 测试部门列表
    divs = registry.get_divisions()
    logger.info(f"✓ 部门总数: {len(divs)}")
    for d in divs:
        logger.info(f"  {d['emoji']} {d['label']}: {d['count']} 个角色")

    return True


def test_ui_card():
    """测试 UI 卡片数据生成"""
    from deerflow.agency.parser import scan_agency_directory

    logger.info("\n" + "=" * 60)
    logger.info("阶段 3：测试 L0 卡片数据")
    logger.info("=" * 60)

    definitions = scan_agency_directory(AGENCY_AGENTS_PATH)
    if not definitions:
        return False

    agent = definitions[0]
    card = agent.to_ui_card()
    logger.info(f"✓ L0 卡片: {card}")

    detail = agent.to_detail()
    logger.info(f"✓ L1 详情字段: {list(detail.keys())}")
    logger.info(f"  技能数: {len(detail['skills'])}")
    logger.info(f"  工作流数: {len(detail['workflows'])}")

    return True


def test_a2a_card():
    """测试 A2A AgentCard 生成"""
    from deerflow.agency.parser import scan_agency_directory

    logger.info("\n" + "=" * 60)
    logger.info("阶段 4：测试 A2A AgentCard")
    logger.info("=" * 60)

    definitions = scan_agency_directory(AGENCY_AGENTS_PATH)
    if not definitions:
        return False

    agent = definitions[0]
    card = agent.to_a2a_agent_card()
    logger.info(f"✓ A2A AgentCard:")
    logger.info(f"  name: {card['name']}")
    logger.info(f"  url: {card['url']}")
    logger.info(f"  skills: {len(card['skills'])} 个")
    logger.info(f"  capabilities: {card['capabilities']}")

    return True


async def test_factory():
    """测试 Agent Factory"""
    from deerflow.agency.factory import AgentFactory
    from deerflow.agency.registry import AgencyRegistry

    logger.info("\n" + "=" * 60)
    logger.info("阶段 5：测试 Agent Factory（模拟实例化）")
    logger.info("=" * 60)

    registry = AgencyRegistry()
    registry.load(AGENCY_AGENTS_PATH)

    agents = registry.list_agents(division="engineering")
    if not agents:
        logger.warning("⚠ 未找到工程部角色")
        return True

    agent = agents[0]
    logger.info(f"  目标角色: {agent.name} (status={agent.status.value})")

    factory = AgentFactory()
    instance_id = await factory.instantiate(agent)
    logger.info(f"✓ 实例化成功: instance_id={instance_id}")
    logger.info(f"  状态变更: {agent.status.value}")

    prompt = agent.to_system_prompt()
    logger.info(f"✓ System prompt 长度: {len(prompt)} 字符")
    logger.info(f"  前 200 字: {prompt[:200]}...")

    return True


def test_custom_skill():
    """测试自定义技能注入"""
    from deerflow.agency.models import CustomSkill
    from deerflow.agency.registry import AgencyRegistry

    logger.info("\n" + "=" * 60)
    logger.info("阶段 6：测试自定义技能注入")
    logger.info("=" * 60)

    registry = AgencyRegistry()
    registry.load(AGENCY_AGENTS_PATH)

    agents = registry.list_agents()
    if not agents:
        return False

    agent_id = agents[0].id

    skill = CustomSkill(
        id="test-review",
        name="代码审查",
        description="对代码进行安全性和性能审查",
        tools=["bash", "file:read"],
        examples=["审查这段 Python 代码的安全漏洞", "优化这个函数的性能"],
    )

    result = registry.add_custom_skill(agent_id, skill)
    assert result, "添加技能失败"
    logger.info(f"✓ 添加自定义技能: {skill.name}")

    skills = registry.get_custom_skills(agent_id)
    assert len(skills) == 1
    assert skills[0].name == "代码审查"
    logger.info(f"✓ 查询技能: {[s.name for s in skills]}")

    agent = registry.get_agent(agent_id)
    prompt = agent.to_system_prompt()
    assert "代码审查" in prompt
    logger.info("✓ System prompt 中包含自定义技能")

    removed = registry.remove_custom_skill(agent_id, "test-review")
    assert removed
    logger.info("✓ 删除自定义技能成功")

    return True


async def main():
    """运行所有测试"""
    logger.info("🚀 Agency-Agents 集成端到端验证")
    logger.info(f"   agency-agents 路径: {AGENCY_AGENTS_PATH}")
    logger.info("")

    if not AGENCY_AGENTS_PATH.exists():
        logger.error(f"✗ agency-agents 目录不存在: {AGENCY_AGENTS_PATH}")
        logger.error("  请先克隆仓库: git clone https://github.com/tingtingxiao0706/agency-agents")
        sys.exit(1)

    results = []

    results.append(("Markdown Parser", test_parser()))
    results.append(("Registry", test_registry()))
    results.append(("UI Card", test_ui_card()))
    results.append(("A2A Card", test_a2a_card()))
    results.append(("Agent Factory", await test_factory()))
    results.append(("Custom Skill", test_custom_skill()))

    logger.info("\n" + "=" * 60)
    logger.info("验证结果汇总")
    logger.info("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"  {status}: {name}")
        if not passed:
            all_passed = False

    if all_passed:
        logger.info("\n🎉 所有测试通过！")
    else:
        logger.error("\n❌ 部分测试失败")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
