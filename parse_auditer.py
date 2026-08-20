import re

with open("auditer", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Extracting potential file references and finding blocks...")
in_finding_block = False
for i, line in enumerate(lines):
    if "breakdown of findings" in line.lower():
        print(f"\n--- Found section around line {i} ---")
        # Print a few lines around it to see context
        for j in range(max(0, i-2), min(len(lines), i+15)):
            if len(lines[j].strip()) > 0:
                print(lines[j].strip()[:150]) # truncate long lines
