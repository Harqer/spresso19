import os
import re

def get_kotlin_files(directory):
    kt_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.kt'):
                kt_files.append(os.path.join(root, file))
    return kt_files

def is_mock(body):
    body = body.strip()
    if not body:
        return True
    
    # Remove comments
    body_no_comments = re.sub(r'//.*', '', body)
    body_no_comments = re.sub(r'/\*.*?\*/', '', body_no_comments, flags=re.DOTALL)
    body_no_comments = body_no_comments.strip()
    
    if not body_no_comments:
        return True
        
    if "Toast.makeText" in body_no_comments or "Log." in body_no_comments or "Timber." in body_no_comments or "println" in body_no_comments:
        # Check if there's any other substantial logic besides logging/toasts
        # Split by lines and remove logging
        lines = body_no_comments.split('\n')
        useful_lines = []
        for line in lines:
            line = line.strip()
            if not line: continue
            if not (line.startswith("Toast.") or line.startswith("Log.") or line.startswith("Timber.") or line.startswith("println")):
                useful_lines.append(line)
        if not useful_lines:
            return True
            
    return False

def audit_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    findings = []
    
    # 1. Match named parameters like onClick = { ... }
    # Using a non-greedy match to find the first closing brace.
    # Note: this is a simple heuristic and might fail on nested braces.
    pattern = re.compile(r'(on[A-Z]\w*|onClick)\s*=\s*\{([^}]*)\}', re.DOTALL)
    for match in pattern.finditer(content):
        handler_name = match.group(1)
        handler_body = match.group(2)
        if is_mock(handler_body):
            findings.append(f"{handler_name} = {{ {handler_body.strip()} }}")

    # 2. Match modifier clickable { ... }
    pattern_clickable = re.compile(r'clickable\s*\{([^}]*)\}', re.DOTALL)
    for match in pattern_clickable.finditer(content):
        handler_body = match.group(1)
        if is_mock(handler_body):
            findings.append(f"clickable {{ {handler_body.strip()} }}")
            
    return findings

def run_audit(src_dirs):
    all_findings = {}
    for d in src_dirs:
        kt_files = get_kotlin_files(d)
        for f in kt_files:
            findings = audit_file(f)
            if findings:
                all_findings[f] = findings
    return all_findings

if __name__ == "__main__":
    findings = run_audit(["composeApp/src"])
    with open("audit_results_spresso.md", "w") as out:
        out.write("# Spresso App Mock Logic Audit\n\n")
        out.write("The following screens and components have mocked or empty event handlers (e.g. `onClick`, `clickable`, or custom `onXYZ` callbacks).\n\n")
        
        for file, f_list in findings.items():
            out.write(f"### File: `{file}`\n")
            for finding in f_list:
                # Truncate if too long
                display = finding.replace("\n", " ")
                if len(display) > 100:
                    display = display[:100] + "..."
                out.write(f"- {display}\n")
            out.write("\n")
