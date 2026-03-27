#!/usr/bin/env python3
"""Convert agency-agents Markdown files into DeerFlow SKILL.md format.

Reads all agent .md files from the agency-agents repo, converts each into
a SKILL.md under skills/custom/agency-agents/{division}/{slug}/, and
copies design-division skills into .cursor/skills/ as well.
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

SKIP_DIRS = {
    ".github", "scripts", "examples", "integrations",
    ".git", "__pycache__", "node_modules",
}

SKIP_FILES = {
    "README.md", "CONTRIBUTING.md", "LICENSE", "CONVENTIONS.md",
    ".gitattributes", ".gitignore",
}

DIVISION_LABELS = {
    "academic": ("Academic", "📚"),
    "design": ("Design", "🎨"),
    "engineering": ("Engineering", "💻"),
    "game-development": ("Game Development", "🎮"),
    "marketing": ("Marketing", "📢"),
    "paid-media": ("Paid Media", "💰"),
    "product": ("Product", "📊"),
    "project-management": ("Project Management", "🎬"),
    "sales": ("Sales", "💼"),
    "spatial-computing": ("Spatial Computing", "🥽"),
    "specialized": ("Specialized", "🎯"),
    "strategy": ("Strategy", "📈"),
    "support": ("Support", "🛟"),
    "testing": ("Testing", "🧪"),
}


def extract_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """Extract YAML frontmatter and body from markdown."""
    fm: dict[str, str] = {}
    body = content
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if match:
        for line in match.group(1).splitlines():
            if ":" in line:
                key, _, val = line.partition(":")
                fm[key.strip()] = val.strip()
        body = content[match.end():]
    return fm, body


def slugify(name: str) -> str:
    """Turn a name like 'design-ui-designer.md' into 'ui-designer'."""
    s = Path(name).stem
    for prefix in DIVISION_LABELS:
        prefix_dash = prefix + "-"
        if s.startswith(prefix_dash):
            s = s[len(prefix_dash):]
            break
    return s


def build_skill_md(fm: dict[str, str], body: str, division: str, slug: str) -> str:
    """Build a SKILL.md preserving original frontmatter metadata."""
    name = fm.get("name", slug.replace("-", " ").title())
    desc = fm.get("description", "")
    color = fm.get("color", "")
    emoji = fm.get("emoji", "")
    vibe = fm.get("vibe", "")

    lines = ["---"]
    lines.append(f"name: {name}")
    lines.append(f"description: {desc}")
    if color:
        lines.append(f"color: {color}")
    if emoji:
        lines.append(f"emoji: {emoji}")
    if vibe:
        lines.append(f"vibe: {vibe}")
    lines.append("---")
    lines.append("")

    return "\n".join(lines) + body


def build_cursor_skill(fm: dict[str, str], body: str, slug: str) -> str:
    """Build a Cursor SKILL.md preserving original frontmatter metadata."""
    name = fm.get("name", slug.replace("-", " ").title())
    desc = fm.get("description", "")
    color = fm.get("color", "")
    emoji = fm.get("emoji", "")
    vibe = fm.get("vibe", "")

    lines = ["---"]
    lines.append(f"name: {name}")
    lines.append(f"description: {desc}")
    if color:
        lines.append(f"color: {color}")
    if emoji:
        lines.append(f"emoji: {emoji}")
    if vibe:
        lines.append(f"vibe: {vibe}")
    lines.append("---")
    lines.append("")

    return "\n".join(lines) + body


def convert_all(agency_dir: Path, output_dir: Path, cursor_skills_dir: Path) -> dict[str, int]:
    """Walk agency-agents repo and convert all agents."""
    stats: dict[str, int] = {"total": 0, "design": 0, "divisions": 0}

    for division_path in sorted(agency_dir.iterdir()):
        if not division_path.is_dir():
            continue
        if division_path.name in SKIP_DIRS:
            continue

        division = division_path.name
        found_any = False

        md_files = list(division_path.glob("*.md"))
        for sub in division_path.iterdir():
            if sub.is_dir() and sub.name not in SKIP_DIRS:
                md_files.extend(sub.glob("*.md"))

        for md_file in sorted(md_files):
            if md_file.name in SKIP_FILES:
                continue

            content = md_file.read_text(encoding="utf-8", errors="replace")
            fm, body = extract_frontmatter(content)

            if not body.strip():
                continue

            slug = slugify(md_file.name)

            sub_division = division
            if md_file.parent != division_path:
                sub_division = f"{division}/{md_file.parent.name}"

            skill_dir = output_dir / sub_division / slug
            skill_dir.mkdir(parents=True, exist_ok=True)

            skill_content = build_skill_md(fm, body, division, slug)
            (skill_dir / "SKILL.md").write_text(skill_content, encoding="utf-8")

            stats["total"] += 1
            found_any = True

            if division == "design":
                cursor_dir = cursor_skills_dir / f"design-{slug}"
                cursor_dir.mkdir(parents=True, exist_ok=True)
                cursor_content = build_cursor_skill(fm, body, slug)
                (cursor_dir / "SKILL.md").write_text(cursor_content, encoding="utf-8")
                stats["design"] += 1

        if found_any:
            stats["divisions"] += 1

    return stats


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    agency_dir = Path("d:/ai/agency-agents")

    if not agency_dir.exists():
        print(f"Error: agency-agents directory not found at {agency_dir}")
        return 1

    output_dir = repo_root / "agency-agents"
    cursor_skills_dir = repo_root / ".cursor" / "skills"

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Source: {agency_dir}")
    print(f"Output: {output_dir}")
    print(f"Cursor: {cursor_skills_dir}")
    print()

    stats = convert_all(agency_dir, output_dir, cursor_skills_dir)

    print(f"Converted {stats['total']} agents across {stats['divisions']} divisions")
    print(f"Design skills copied to .cursor/skills/: {stats['design']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
