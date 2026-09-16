#!/usr/bin/env python3
"""Remediate the reported Detekt findings with behavior-preserving edits.

Groups:
1. Unused private properties -> delete the declaration line.
2. UseCheckOrError -> convert `throw IllegalStateException(...)` to
   `check(...)` / `error(...)` form.
3. RethrowCaughtException -> remove the catch/rethrow wrapper, keeping the
   try body (behavior preserving: the same exception still propagates).
4. PrintStackTrace -> replace with a stderr logger comment-free equivalent.
5. MaxLineLength -> leave for manual fixes (line wrapping risks changing
   string content); reported separately.
"""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path("/home/shaolin/Spresso")
LOG = Path("/tmp/spresso-detekt-seventh.log")


def findings(rule: str, exclude: str = "dataconnect") -> list[tuple[Path, int, str]]:
    out = []
    for line in LOG.read_text(errors="replace").splitlines():
        m = re.match(r"(/home/\S+\.kt):(\d+):\d+: (.+) \[" + rule + r"\]$", line.strip())
        if not m:
            continue
        if exclude and exclude in m.group(1):
            continue
        out.append((Path(m.group(1)), int(m.group(2)), m.group(3)))
    return out


def fix_unused_private_property():
    changed = 0
    for path, lineno, msg in findings("UnusedPrivateProperty"):
        m = re.search(r"Private property `(\w+)` is unused", msg)
        if not m:
            continue
        name = m.group(1)
        lines = path.read_text().splitlines(keepends=True)
        idx = lineno - 1
        if idx >= len(lines) or name not in lines[idx]:
            print(f"SKIP prop {path}:{lineno}")
            continue
        line = lines[idx]
        stripped = line.strip()
        if stripped.startswith("//"):
            continue
        # Only remove pure declarations (private val/var with initializer or
        # delegated). Avoid removing lines with side effects or annotations.
        if not re.match(r"(private\s+)?(val|var)\s+" + name + r"\b", stripped):
            print(f"SKIP prop-nomatch {path}:{lineno}: {stripped[:60]}")
            continue
        del lines[idx]
        path.write_text("".join(lines))
        changed += 1
        print(f"PROP {path}:{lineno} removed {name}")
    print(f"unused-private-property removed: {changed}")


def fix_use_check_or_error():
    changed = 0
    for path, lineno, msg in findings("UseCheckOrError"):
        lines = path.read_text().splitlines(keepends=True)
        idx = lineno - 1
        if idx >= len(lines):
            continue
        line = lines[idx]
        m = re.search(r"throw IllegalStateException\((.*)\)\s*$", line)
        if not m:
            print(f"SKIP check {path}:{lineno}")
            continue
        expr = m.group(1)
        indent = line[: len(line) - len(line.lstrip())]
        if expr.strip():
            new = f"{indent}error({expr})\n"
        else:
            new = re.sub(r"throw IllegalStateException", "error", line)
        lines[idx] = new
        path.write_text("".join(lines))
        changed += 1
        print(f"CHECK {path}:{lineno}")
    print(f"use-check-or-error converted: {changed}")


def fix_rethrow():
    changed = 0
    for path, lineno, msg in findings("RethrowCaughtException"):
        lines = path.read_text().splitlines(keepends=True)
        idx = lineno - 1
        if idx >= len(lines):
            continue
        line = lines[idx]
        m = re.search(r"catch \((\w+)\s*:\s*([\w.]+)\)", line)
        if not m:
            print(f"SKIP rethrow {path}:{lineno}")
            continue
        var, exc = m.group(1), m.group(2)
        # find the throw line within the catch block
        j = idx + 1
        throw_idx = None
        depth = 0
        while j < len(lines):
            s = lines[j].strip()
            if re.fullmatch(rf"throw {var}\b", s):
                throw_idx = j
                break
            if j > idx + 4:
                break
            j += 1
        if throw_idx is None:
            print(f"SKIP rethrow-nothrow {path}:{lineno}")
            continue
        # find catch block close: the closing brace at catch-body depth
        close_idx = throw_idx + 1
        while close_idx < len(lines) and lines[close_idx].strip() != "}":
            close_idx += 1
        if close_idx >= len(lines):
            print(f"SKIP rethrow-noclose {path}:{lineno}")
            continue
        # remove catch body and the catch header, keep closing brace if it
        # closes the try block. If there is no finally, the catch's closing
        # brace closes the try: keep one closing brace.
        has_finally = any(
            lines[k].strip().startswith("finally") for k in range(close_idx + 1, min(close_idx + 3, len(lines)))
        )
        if has_finally:
            # delete catch header + body lines, keep close brace for try
            del lines[idx:close_idx]
        else:
            # catch is the last clause: delete header + body but keep the
            # final brace which now closes the try block.
            del lines[idx:close_idx]
        changed += 1
        print(f"RETHROW {path}:{lineno}")
        path.write_text("".join(lines))
    print(f"rethrow simplified: {changed}")


def fix_print_stack_trace():
    changed = 0
    for path, lineno, _msg in findings("PrintStackTrace"):
        lines = path.read_text().splitlines(keepends=True)
        idx = lineno - 1
        if idx >= len(lines) or "printStackTrace()" not in lines[idx]:
            print(f"SKIP pst {path}:{lineno}")
            continue
        indent = lines[idx][: len(lines[idx]) - len(lines[idx].lstrip())]
        # recover the receiver from the same line, e.g. `e.printStackTrace()`
        m = re.search(r"(\w+)\.printStackTrace\(\)", lines[idx])
        recv = m.group(1) if m else "e"
        lines[idx] = f'{indent}System.err.println("{recv}", {recv})\n'
        path.write_text("".join(lines))
        changed += 1
        print(f"PST {path}:{lineno}")
    print(f"printStackTrace replaced: {changed}")


def main():
    if not LOG.exists():
        print("detekt log missing")
        sys.exit(1)
    fix_unused_private_property()
    fix_use_check_or_error()
    fix_rethrow()
    fix_print_stack_trace()


if __name__ == "__main__":
    main()
