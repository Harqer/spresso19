#!/usr/bin/env python3
"""Wrap MaxLineLength findings by splitting long argument lines.

Reads the current detekt log, then splits each reported line at an argument
boundary (`, ` inside the trailing call) so both halves stay under the limit.
String-only lines (UI copy) are left alone: they are wrapped as separate
string concatenation lines instead.
"""
from pathlib import Path
import re
import sys

LOG = Path("/tmp/spresso-detekt-eighth.log")
ROOT = Path("/home/shaolin/Spresso")
MAX = 170


def wrap_line(line: str) -> list[str] | None:
    stripped = line.rstrip("\n")
    if len(stripped) <= MAX:
        return None
    indent = stripped[: len(stripped) - len(stripped.lstrip())]
    inner_indent = indent + "    "
    # find split candidate: last ", " before column 160 that is not inside quotes
    best = None
    in_str = False
    esc = False
    for i in range(1, min(len(stripped) - 1, 165)):
        c = stripped[i]
        if esc:
            esc = False
            continue
        if c == "\\":
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if stripped[i : i + 2] == ", ":
            best = i
    if best is None:
        return None
    first = stripped[: best + 1]
    rest = stripped[best + 2 :]
    return [first + "\n", inner_indent + rest + "\n"]


def main() -> None:
    findings = set()
    for line in LOG.read_text(errors="replace").splitlines():
        m = re.search(r"^(/home/\S+\.kt):(\d+):\d+: .*MaxLineLength", line)
        if m:
            findings.add((Path(m.group(1)), int(m.group(2))))
    changed = 0
    for path, lineno in sorted(findings):
        rel = path.relative_to(ROOT)
        lines = rel.read_text().splitlines(keepends=True)
        idx = lineno - 1
        if idx >= len(lines):
            continue
        wrapped = wrap_line(lines[idx])
        if wrapped is None:
            print(f"MANUAL {rel}:{lineno} (len={len(lines[idx].rstrip())})")
            continue
        lines[idx : idx + 1] = wrapped
        rel.write_text("".join(lines))
        changed += 1
        print(f"WRAPPED {rel}:{lineno}")
    print(f"wrapped: {changed}")


if __name__ == "__main__":
    main()
