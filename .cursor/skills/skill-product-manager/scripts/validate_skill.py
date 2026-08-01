#!/usr/bin/env python3
"""Validate the portable structure of an Agent Skill without third-party packages."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESOURCE_DIRS = ("references", "scripts", "assets")


def parse_frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, ["SKILL.md must start with YAML frontmatter delimited by ---"]

    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return {}, ["SKILL.md frontmatter is missing its closing ---"]

    fields: dict[str, str] = {}
    current_key: str | None = None
    for line in lines[1:end]:
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$", line)
        if match:
            current_key = match.group(1)
            value = (match.group(2) or "").strip()
            fields[current_key] = "" if value in {">", ">-", "|", "|-"} else value
        elif current_key and line.startswith((" ", "\t")):
            continuation = line.strip()
            if continuation:
                fields[current_key] = f"{fields[current_key]} {continuation}".strip()

    return fields, []


def resource_files(skill_dir: Path) -> list[Path]:
    files: list[Path] = []
    for dirname in RESOURCE_DIRS:
        directory = skill_dir / dirname
        if directory.is_dir():
            files.extend(path for path in directory.rglob("*") if path.is_file())
    return files


def validate(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    skill_file = skill_dir / "SKILL.md"

    if not skill_dir.is_dir():
        return [f"skill directory does not exist: {skill_dir}"], warnings
    if not skill_file.is_file():
        return [f"missing required file: {skill_file}"], warnings

    text = skill_file.read_text(encoding="utf-8")
    fields, frontmatter_errors = parse_frontmatter(text)
    errors.extend(frontmatter_errors)

    name = fields.get("name", "").strip("\"'")
    description = fields.get("description", "").strip("\"'")
    if not name:
        errors.append("frontmatter is missing a non-empty name")
    else:
        if len(name) > 64 or not NAME_RE.fullmatch(name):
            errors.append(
                "name must be 1-64 characters using lowercase letters, numbers, "
                "and single hyphens"
            )
        if name != skill_dir.name:
            errors.append(
                f"frontmatter name '{name}' does not match directory '{skill_dir.name}'"
            )

    if not description:
        errors.append("frontmatter is missing a non-empty description")
    elif len(description) < 40:
        warnings.append("description is unusually short; include both capability and triggers")

    line_count = len(text.splitlines())
    if line_count > 500:
        warnings.append(f"SKILL.md has {line_count} lines; consider progressive disclosure")

    for path in skill_dir.rglob("*"):
        if path.is_file() and path.stat().st_size == 0:
            errors.append(f"empty file: {path.relative_to(skill_dir)}")

    for path in resource_files(skill_dir):
        relative = path.relative_to(skill_dir).as_posix()
        if relative not in text and path.name not in text:
            warnings.append(f"resource has no explicit navigation from SKILL.md: {relative}")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_directory", type=Path)
    args = parser.parse_args()

    errors, warnings = validate(args.skill_directory.resolve())
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")

    if errors:
        print(f"FAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1

    print(f"PASSED: 0 errors, {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
