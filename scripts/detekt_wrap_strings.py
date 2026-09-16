#!/usr/bin/env python3
"""Wrap the remaining MaxLineLength lines (string literals + long args)."""
from pathlib import Path

ROOT = Path("/home/shaolin/Spresso")
MAX = 170

FIXES = {
    "composeApp/src/androidMain/kotlin/com/spresso/MainActivity.kt": [
        (421, '                                    "Spresso uses interaction data to improve product recommendations and requires camera access in the background when the wearable AI assistant is active. Do you consent to enabling camera access?",',
         '                                    "Spresso uses interaction data to improve product recommendations and requires camera access " +\n                                        "in the background when the wearable AI assistant is active. Do you consent to enabling camera access?",'),
        (456, None, None),  # handled positionally below
    ],
}


def wrap_string_line(path: Path, lineno: int, lead: str, pieces: list[str], indent: str, tail: str) -> None:
    lines = path.read_text().splitlines(keepends=True)
    idx = lineno - 1
    joined = ("\n" + indent + "\t" + indent2).join(pieces) if False else None
    return


def wrap_concat(path: Path, lineno: int, chunks: list[str]) -> None:
    lines = path.read_text().splitlines(keepends=True)
    idx = lineno - 1
    original = lines[idx].rstrip("\n")
    indent = original[: len(original) - len(original.lstrip())]
    inner = indent + "    "
    parts = [c for c in chunks]
    # ensure each part is quoted string piece + trailing +
    out = []
    for i, p in enumerate(parts):
        line = inner + p
        if i < len(parts) - 1:
            line += " +"
        out.append(line + "\n")
    lines[idx : idx + 1] = out
    path.write_text("".join(lines))


def split_string(stripped: str, indent: str) -> list[str]:
    # string-only concatenation: split at sentence boundaries under 150 chars
    body = stripped.strip()
    inner = indent + "    "
    # split into chunks of <=150 chars at word boundaries
    words = body.split(" ")
    chunks = []
    cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > 150 and cur:
            chunks.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        chunks.append(cur)
    return ['"%s "' % c if i < len(chunks) - 1 else '"%s"' % c for i, c in enumerate(chunks)]


def main() -> None:
    targets = [
        ("composeApp/src/androidMain/kotlin/com/spresso/MainActivity.kt", [421, 456]),
        ("composeApp/src/androidMain/kotlin/com/spresso/SpressoWearablesService.kt", [294, 295, 296, 297]),
        ("composeApp/src/androidMain/kotlin/components/features/chat/VideoReviewCard.android.kt", [72]),
        ("composeApp/src/commonMain/kotlin/components/features/catalog/ProductCatalogHeader.kt", [52]),
        ("composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobePermissionModal.kt", [52]),
        ("composeApp/src/commonMain/kotlin/components/features/travel/widgets/BoardingPass.kt", [109, 113, 119, 120, 125]),
    ]
    for path_str, linenos in targets:
        p = ROOT / path_str
        # process descending so line numbers stay valid
        for lineno in sorted(linenos, reverse=True):
            lines = p.read_text().splitlines(keepends=True)
            idx = lineno - 1
            original = lines[idx].rstrip("\n")
            indent = original[: len(original) - len(original.lstrip())]
            if len(original) <= MAX:
                continue
            chunks = split_string(original, indent)
            if len(chunks) == 1:
                print(f"STILL-LONG {path_str}:{lineno}")
                continue
            wrapped = []
            for i, c in enumerate(chunks):
                pre = indent if i == 0 else indent + "    "
                line = pre + c
                if i < len(chunks) - 1:
                    line += " +"
                wrapped.append(line + "\n")
            lines[idx : idx + 1] = wrapped
            p.write_text("".join(lines))
            print(f"SPLIT {path_str}:{lineno} into {len(chunks)}")


if __name__ == "__main__":
    main()
