import re
import os

with open("auditer", "r", encoding="utf-8") as f:
    lines = f.readlines()

current_file = None
in_code = False
code_lines = []

for i, line in enumerate(lines):
    # Detect filename preceding a Kotlin block
    if line.strip().endswith(".kt") and i + 1 < len(lines) and lines[i+1].strip() == "Kotlin":
        current_file = line.strip()
        in_code = False
        continue
    
    if current_file and lines[i].strip() == "Kotlin" and not in_code:
        # Start of code block (we might need to skip empty lines)
        in_code = True
        code_lines = []
        continue

    if in_code:
        if line.strip() == "```" or (len(line.strip()) > 0 and line.strip() != "package components.features.orders" and line.strip() != "package components.features.catalog" and line.strip() != "package components.features.travel" and "package components." not in line and i > 0 and lines[i-1].strip() == "Kotlin"):
            # Wait, the auditer doesn't have markdown code blocks, it just has text? 
            pass
