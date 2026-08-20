import os
import re

with open("auditer", "r", encoding="utf-8") as f:
    content = f.read()

# We look for:
# filename.kt
# Kotlin
# 
# package components.features.xyz
# ... code ...

pattern = re.compile(r'([A-Za-z0-9_]+\.kt)\s*\nKotlin\s*\n\s*(package components\.features\.[a-z]+.*?(?=(?:[A-Za-z0-9_]+\.kt\s*\nKotlin)|\Z))', re.DOTALL)

matches = pattern.findall(content)
print(f"Found {len(matches)} files in auditer.")

for filename, code in matches:
    # Find the package to know which folder it belongs to
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
