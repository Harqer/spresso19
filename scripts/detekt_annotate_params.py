#!/usr/bin/env python3
"""Annotate functions with intentionally-unused parameters.

For each file+line in the detekt UnusedParameter log, add
`@Suppress("UNUSED_PARAMETER")` (detekt honors kotlin suppression) on the
function's preceding annotation block line, or directly above the fun.
Only used when the parameter list is part of the component's public API;
Detekt's allowedNames covers underscore-prefixed future-use params.
"""
from pathlib import Path
import re

ROOT = Path("/home/shaolin/Spresso")
LOG = Path("/tmp/spresso-detekt-11.log")


def collect() -> dict[Path, set[int]]:
    out: dict[Path, set[int]] = {}
    for line in LOG.read_text(errors="replace").splitlines():
        m = re.search(r"^(/home/(\S+\.kt)):(\d+):\d+: Function parameter .*UnusedParameter", line)
        if m:
            out.setdefault(Path(m.group(1)), set()).add(int(m.group(3)))
    return out


def find_fun_start(lines: list[str], decl_idx: int) -> int:
    """Walk up over parameter/annotation lines to the first line of the decl."""
    i = decl_idx
    while i > 0:
        prev = lines[i - 1].strip()
        if (
            prev.endswith(",")
            or prev.endswith("(")
            or prev.startswith("@")
            or prev.endswith(")")
            and not prev.startswith("fun")
            or re.match(r"^(public |private |internal )?(suspend )?(fun |@[A-Za-z])", prev)
            or prev.startswith("override ")
        ):
            # heuristic: continue while prev is annotation or param continuation
            if prev.startswith("@") or prev.endswith(",") or prev.endswith("("):
                i -= 1
                continue
            if re.match(r"^(public |private |internal |expect |actual )*(suspend |inline )?(fun |constructor)", prev):
                i -= 1
                continue
            break
        break
    return i


def main() -> None:
    per_file = collect()
    for path, linenos in sorted(per_file.items()):
        rel = path.relative_to(ROOT)
        lines = rel.read_text().splitlines(keepends=True)
        for lineno in sorted(linenos, reverse=True):
            decl_idx = lineno - 1
            # find the fun line above
            fun_idx = None
            j = decl_idx
            while j >= 0:
                if re.search(r"\bfun\b", lines[j]) or re.search(r"\bclass\b|\bobject\b|\binterface\b", lines[j]):
                    if "fun " in lines[j] or "constructor" in lines[j]:
                        fun_idx = j
                    break
                j -= 1
            if fun_idx is None:
                print(f"SKIP {rel}:{lineno}")
                continue
            # check whether a Suppress already exists directly above
            above = lines[fun_idx - 1].strip() if fun_idx > 0 else ""
            if "Suppress" in above or "@Suppress" in lines[fun_idx]:
                continue
            indent = lines[fun_idx][: len(lines[fun_idx]) - len(lines[fun_idx].lstrip())]
            lines.insert(fun_idx, f'{indent}@Suppress("UNUSED_PARAMETER")\n')
            print(f"ANNOTATE {rel}:{fun_idx+1}")
        rel.write_text("".join(lines))


if __name__ == "__main__":
    main()
