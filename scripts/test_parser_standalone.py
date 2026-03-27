"""最小化测试：仅验证 Markdown Parser 和 Models 模块"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend" / "packages" / "harness"))

import yaml

AGENCY_AGENTS_PATH = Path("d:/ai/agency-agents")

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

def parse_file(filepath: Path, division: str):
    content = filepath.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(content)
    if not match:
        return None
    try:
        fm = yaml.safe_load(match.group(1)) or {}
    except Exception:
        return None
    return {
        "id": f"{division}-{filepath.stem}",
        "name": fm.get("name", filepath.stem),
        "division": division,
        "description": fm.get("description", "")[:80],
        "emoji": fm.get("emoji", ""),
        "color": fm.get("color", ""),
        "vibe": fm.get("vibe", "")[:60],
    }

def main():
    if not AGENCY_AGENTS_PATH.exists():
        print(f"ERROR: {AGENCY_AGENTS_PATH} not found")
        sys.exit(1)

    total = 0
    divisions = {}

    skip = {".github", "scripts", "integrations", "examples"}
    for div_dir in sorted(AGENCY_AGENTS_PATH.iterdir()):
        if not div_dir.is_dir() or div_dir.name in skip or div_dir.name.startswith("."):
            continue

        division = div_dir.name
        md_files = list(div_dir.glob("*.md"))

        if not md_files:
            for sub in sorted(div_dir.iterdir()):
                if sub.is_dir():
                    md_files.extend(sub.glob("*.md"))

        for f in sorted(md_files):
            if f.name.startswith("README"):
                continue
            result = parse_file(f, division)
            if result:
                total += 1
                divisions[division] = divisions.get(division, 0) + 1
                if total <= 5:
                    print(f"  {result['emoji']} {result['name']} ({division})")
                    print(f"    {result['description']}")

    print(f"\nTotal agents parsed: {total}")
    print(f"Divisions ({len(divisions)}):")
    for div, count in sorted(divisions.items()):
        print(f"  {div}: {count}")

if __name__ == "__main__":
    main()
