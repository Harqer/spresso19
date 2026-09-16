#!/usr/bin/env python3
"""Reversibly move direct skill discovery entries into the RLM library."""

from __future__ import annotations

import argparse
import os
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

SOURCES = {
    "user-agents": Path.home() / ".agents" / "skills",
    "user-claude": Path.home() / ".claude" / "skills",
    "user-codex": Path.home() / ".codex" / "skills",
    "user-gemini": Path.home() / ".gemini" / "skills",
    "spresso-agents": Path("/home/shaolin/Spresso/.agents/skills"),
    "spresso-claude": Path("/home/shaolin/Spresso/.claude/skills"),
}

BOOTSTRAP = """---
name: rlm-bootstrap
description: Acquire existing skills, plugins, MCP capabilities, and external context through the RLM runtime for the current task. Do not enumerate or preload the skill library.
---

# RLM capability bootstrap

The skill library is external. Keep the root context focused on the current
goal. Use the RLM runtime to acquire a capability or plugin only after the task
requires it, then delegate detailed implementation to a bounded worker.

Existing plugins remain the source of their tools, hooks, MCP servers, and
skills. RLM orchestrates acquisition and delegation; it does not duplicate
plugin contents. Return concise evidence, tests, and unresolved constraints to
the coordinator.
"""


def entries(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return [p for p in sorted(root.iterdir()) if p.name != ".system"]


def plan(library: Path) -> dict:
    return {
        "library": str(library),
        "sources": {
            label: {"root": str(root), "entries": [p.name for p in entries(root)]}
            for label, root in SOURCES.items()
        },
        "system_preserved": str(Path.home() / ".codex" / "skills" / ".system"),
        "plugins_untouched": True,
    }


def apply(library: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = library / "archives" / stamp
    archive.mkdir(parents=True, exist_ok=False)
    manifest = plan(library)
    manifest["archive"] = str(archive)
    manifest["moved"] = []

    bootstrap_source = library / "bootstrap" / "rlm-bootstrap"
    if bootstrap_source.exists() and not bootstrap_source.is_dir():
        raise RuntimeError(f"bootstrap target is not a directory: {bootstrap_source}")

    roots = [root for root in SOURCES.values() if root.exists()]
    for root in roots:
        link = root / "rlm-bootstrap"
        if link.exists() or link.is_symlink():
            if not (link.is_symlink() and link.resolve() == bootstrap_source.resolve()):
                raise RuntimeError(f"bootstrap target already exists: {link}")

    # Stage complete, readable copies before changing discovery directories.
    # Dereferencing links makes links between separate source roots usable from
    # the archive, while the original trees remain available for rollback.
    staged = []
    backups = archive / ".originals"
    for label, root in SOURCES.items():
        if not root.exists():
            continue
        destination = archive / label
        destination.mkdir(parents=True, exist_ok=True)
        for item in entries(root):
            target = destination / item.name
            if item.is_symlink():
                resolved = item.resolve(strict=False)
                if resolved.exists():
                    if resolved.is_dir():
                        shutil.copytree(resolved, target, symlinks=False)
                    else:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(resolved, target)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.symlink_to(os.readlink(item), target_is_directory=False)
            elif item.is_dir():
                shutil.copytree(item, target, symlinks=False)
            else:
                shutil.copy2(item, target)
            backup = backups / label / item.name
            staged.append((item, target, backup))

    bootstrap_source.mkdir(parents=True, exist_ok=True)
    (bootstrap_source / "SKILL.md").write_text(BOOTSTRAP, encoding="utf-8")
    manifest["bootstrap"] = str(bootstrap_source)

    moved = []
    try:
        for source, target, backup in staged:
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(backup))
            moved.append((source, backup))
            manifest["moved"].append({"source": str(source), "archive": str(target), "backup": str(backup)})

        for root in SOURCES.values():
            root.mkdir(parents=True, exist_ok=True)
            (root / "rlm-bootstrap").symlink_to(bootstrap_source, target_is_directory=True)
    except Exception:
        for source, backup in reversed(moved):
            if backup.exists() or backup.is_symlink():
                shutil.move(str(backup), str(source))
        if bootstrap_source.exists():
            shutil.rmtree(bootstrap_source.parent)
        raise

    manifest_path = archive / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return archive


def restore(archive: Path) -> None:
    manifest = json.loads((archive / "manifest.json").read_text(encoding="utf-8"))
    bootstrap = Path(manifest["bootstrap"])
    for root_text in manifest["sources"].values():
        root = Path(root_text["root"])
        link = root / "rlm-bootstrap"
        if link.is_symlink() and link.resolve() == bootstrap.resolve():
            link.unlink()
    for item in manifest["moved"]:
        source = Path(item["source"])
        archived = Path(item.get("backup", item["archive"]))
        source.parent.mkdir(parents=True, exist_ok=True)
        if source.exists() or source.is_symlink():
            raise RuntimeError(f"restore target already exists: {source}")
        shutil.move(str(archived), str(source))
    if bootstrap.exists():
        shutil.rmtree(bootstrap.parent)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", type=Path, default=Path.home() / ".rlm" / "skill-library")
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--restore", type=Path)
    args = parser.parse_args()
    selected = sum(bool(value) for value in (args.plan, args.apply, args.restore))
    if selected != 1:
        parser.error("choose exactly one of --plan, --apply, or --restore")
    if args.plan:
        print(json.dumps(plan(args.library), indent=2))
    elif args.apply:
        print(json.dumps({"archive": str(apply(args.library))}, indent=2))
    else:
        restore(args.restore)
        print(json.dumps({"restored": str(args.restore)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
