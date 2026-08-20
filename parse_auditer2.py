import re

with open("auditer", "r", encoding="utf-8") as f:
    text = f.read()

# Look for patterns like "Code Audit & Architecture Findings" or "Here is the breakdown" or files ending in .kt
findings = []
for line in text.split('\n'):
    if "finding" in line.lower() or ".kt" in line or "stub" in line.lower() or "mock" in line.lower():
        findings.append(line.strip())

print(f"Found {len(findings)} lines with potential signals. Let's extract unique Kotlin files mentioned.")
kt_files = set(re.findall(r'[a-zA-Z0-9_]+\.kt', text))
print("\nKotlin files explicitly mentioned in auditer:")
for kt in sorted(kt_files):
    print(kt)
