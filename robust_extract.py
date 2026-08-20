import os
import re

with open("auditer", "r", encoding="utf-8") as f:
    lines = f.readlines()

blocks = []
current_block = []

for i, line in enumerate(lines):
    if line.startswith("package components.features."):
        # We found a package declaration.
        # Let's find the nearest filename above it.
        filename = None
        for j in range(i-1, max(-1, i-10), -1):
            cl = lines[j].strip()
            if cl.endswith(".kt") and " " not in cl:
                filename = cl
                break
        
        if filename:
            # Now capture until the next block, or end of file, or 'Code Audit Findings', or 'Here is the audit'
            code = [line]
            for j in range(i+1, len(lines)):
                cl = lines[j].strip()
                if (cl.endswith(".kt") and j+1 < len(lines) and lines[j+1].strip() == "Kotlin") or \
                   cl == "Code Audit Findings" or "Here is the audit" in cl or cl == "Refactored Source Files":
                    break
                code.append(lines[j])
            
            blocks.append((filename, "".join(code)))

print(f"Found {len(blocks)} blocks.")
for filename, code in blocks:
    pkg_match = re.search(r'package\s+([A-Za-z0-9_.]+)', code)
    if not pkg_match:
        continue
    pkg = pkg_match.group(1)
    
    # We only care about catalog, orders, travel
    if 'catalog' not in pkg and 'orders' not in pkg and 'travel' not in pkg:
        continue
        
    rel_path = pkg.replace('.', '/')
    full_path = os.path.join("composeApp/src/commonMain/kotlin", rel_path, filename)
    
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as out:
        out.write(code.strip() + "\n")
    print(f"Updated {full_path}")
