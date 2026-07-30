#!/usr/bin/env python3
"""Load Canghe skill configuration from environment files."""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional


def load_env_file(file_path: Path) -> Dict[str, str]:
    """Parse a simple KEY=VALUE environment file."""
    env: Dict[str, str] = {}
    try:
        with file_path.open("r", encoding="utf-8") as file:
            for line in file:
                trimmed = line.strip()
                if not trimmed or trimmed.startswith("#"):
                    continue
                key, separator, value = trimmed.partition("=")
                if not separator:
                    continue
                value = value.strip()
                if (
                    len(value) >= 2
                    and value[0] == value[-1]
                    and value[0] in {"'", '"'}
                ):
                    value = value[1:-1]
                env[key.strip()] = value
    except FileNotFoundError:
        pass
    return env


def load_env() -> None:
    """Load project and user Canghe configuration without overriding the process."""
    sources = (
        Path.home() / ".canghe-skills" / ".env",
        Path.cwd() / ".canghe-skills" / ".env",
    )
    for source in sources:
        for key, value in load_env_file(source).items():
            os.environ.setdefault(key, value)


def get_env_key(
    key_name: str, alias_names: Optional[List[str]] = None
) -> Optional[str]:
    """Return a configured key, checking optional aliases."""
    load_env()
    for name in (key_name, *(alias_names or [])):
        value = os.environ.get(name)
        if value:
            return value
    return None


def require_env_key(
    key_name: str,
    alias_names: Optional[List[str]] = None,
    error_message: Optional[str] = None,
) -> str:
    """Return a required key or exit with setup guidance."""
    value = get_env_key(key_name, alias_names)
    if value:
        return value

    names = " 或 ".join((key_name, *(alias_names or [])))
    message = error_message or f"请设置 {names} 环境变量"
    print(f"❌ 错误: {message}", file=sys.stderr)
    print("\n💡 配置方式:", file=sys.stderr)
    print(
        "  1. 在 .canghe-skills/.env 中填写配置",
        file=sys.stderr,
    )
    print(f"  2. 或设置环境变量: export {key_name}=your-key", file=sys.stderr)
    raise SystemExit(1)
