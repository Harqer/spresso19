#!/usr/bin/env python3
from __future__ import annotations
import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

try:
    import tomllib
except Exception:
    tomllib = None

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
SKIP = {".git", "node_modules", "build", ".gradle", "dist", "coverage", ".idea", ".kotlin"}
errors: list[str] = []

def files(exts):
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in exts:
            continue
        if any(part in SKIP for part in p.parts):
            continue
        yield p

for p in files({".json"}):
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"JSON {p.relative_to(ROOT)}: {e}")

for p in files({".xml"}):
    try:
        ET.parse(p)
    except Exception as e:
        errors.append(f"XML {p.relative_to(ROOT)}: {e}")

if tomllib is not None:
    for p in files({".toml"}):
        try:
            with p.open("rb") as f:
                tomllib.load(f)
        except Exception as e:
            errors.append(f"TOML {p.relative_to(ROOT)}: {e}")

yaml_files = list(files({".yml", ".yaml"}))
if yaml_files:
    yaml_ok = False
    try:
        import yaml  # type: ignore
        yaml_ok = True
        for p in yaml_files:
            try:
                yaml.safe_load(p.read_text(encoding="utf-8"))
            except Exception as e:
                errors.append(f"YAML {p.relative_to(ROOT)}: {e}")
    except Exception:
        pass
    if not yaml_ok:
        errors.append("YAML files exist but PyYAML is unavailable; install PyYAML so CI can parse YAML.")

if errors:
    print("\n".join(errors), file=sys.stderr)
    raise SystemExit(1)

print("Structured files parse cleanly.")
