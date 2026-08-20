import os
import re

with open("auditer", "r", encoding="utf-8") as f:
    lines = f.readlines()

current_filename = None
in_code = False
code_lines = []

for line in lines:
    clean_line = line.strip()
    
    # Track the last filename we saw
    if clean_line.endswith(".kt") and " " not in clean_line:
        current_filename = clean_line
        
    if clean_line == "Kotlin" and current_filename:
        in_code = True
        code_lines = []
        continue
        
    if in_code:
        if clean_line.startswith("package components.features."):
            code_lines.append(line)
        elif len(code_lines) > 0:
            if clean_line.endswith(".kt") and " " not in clean_line:
                # End of block because of a new filename
                code_str = "".join(code_lines)
                pkg_match = re.search(r'package\s+([A-Za-z0-9_.]+)', code_str)
                if pkg_match:
                    pkg = pkg_match.group(1)
                    if any(domain in pkg for domain in ['catalog', 'orders', 'travel']):
                        rel_path = pkg.replace('.', '/')
                        full_path = os.path.join("composeApp/src/commonMain/kotlin", rel_path, current_filename)
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, "w", encoding="utf-8") as out:
                            out.write(code_str.strip() + "\n")
                        print(f"Updated {full_path}")
                current_filename = clean_line
                in_code = False
                code_lines = []
            elif "Here is the audit" in clean_line or clean_line == "Refactored Source Files" or clean_line == "Code Audit Findings" or "The above content" in clean_line or "Production Code Implementations" in clean_line:
                # End of code block
                code_str = "".join(code_lines)
                pkg_match = re.search(r'package\s+([A-Za-z0-9_.]+)', code_str)
                if pkg_match:
                    pkg = pkg_match.group(1)
                    if any(domain in pkg for domain in ['catalog', 'orders', 'travel']):
                        rel_path = pkg.replace('.', '/')
                        full_path = os.path.join("composeApp/src/commonMain/kotlin", rel_path, current_filename)
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, "w", encoding="utf-8") as out:
                            out.write(code_str.strip() + "\n")
                        print(f"Updated {full_path}")
                in_code = False
                code_lines = []
            else:
                code_lines.append(line)

# Handle last file
if in_code and current_filename and len(code_lines) > 0:
    code_str = "".join(code_lines)
    pkg_match = re.search(r'package\s+([A-Za-z0-9_.]+)', code_str)
    if pkg_match:
        pkg = pkg_match.group(1)
        if any(domain in pkg for domain in ['catalog', 'orders', 'travel']):
            rel_path = pkg.replace('.', '/')
            full_path = os.path.join("composeApp/src/commonMain/kotlin", rel_path, current_filename)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as out:
                out.write(code_str.strip() + "\n")
            print(f"Updated {full_path}")

