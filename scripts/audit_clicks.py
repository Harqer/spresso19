import os
import re
from pathlib import Path

def get_balanced_block(content, start_idx):
    brace_count = 0
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                return i
    return -1

def analyze_directory(root_dir):
    findings = []
    
    # Keywords indicating an action handler
    action_patterns = [r'\bonClick\b', r'\bonTap\b', r'\bonConfirm\b', r'\bonSubmit\b', r'\bonVirtualTryOnClick\b']
    
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if not filename.endswith('.kt'):
                continue
            
            filepath = os.path.join(dirpath, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            for pattern_str in action_patterns:
                pattern = re.compile(pattern_str + r'\s*(?:=\s*)?\{')
                for match in pattern.finditer(content):
                    open_brace_idx = match.end() - 1
                    close_brace_idx = get_balanced_block(content, open_brace_idx)
                    
                    if close_brace_idx != -1:
                        block_content = content[open_brace_idx+1:close_brace_idx].strip()
                        line_no = content.count('\n', 0, open_brace_idx) + 1
                        
                        # Heuristics for mock/unwired
                        lines = [l.strip() for l in block_content.split('\n')]
                        code_lines = [l for l in lines if l and not l.startswith('//')]
                        
                        is_mock = False
                        reason = ""
                        
                        if not code_lines:
                            is_mock = True
                            reason = "Empty handler"
                        else:
                            code_str = " ".join(code_lines).lower()
                            if len(code_lines) <= 2:
                                if "todo" in code_str or "not implemented" in code_str:
                                    is_mock = True
                                    reason = "TODO / Stub"
                                elif "toast" in code_str or "snackbar" in code_str or "coming soon" in code_str:
                                    is_mock = True
                                    reason = "Placeholder Toast/Snackbar"
                                elif "println" in code_str or "logger." in code_str or "log." in code_str:
                                    # If it ONLY logs, it's a mock
                                    if not any(kw in code_str for kw in ["viewmodel", "navcontroller", "navigate", "launch", "mutate", "query", "upsert", "insert", "delete"]):
                                        is_mock = True
                                        reason = "Log statement only"
                        
                        if is_mock:
                            # Try to get context (component name)
                            context_start = max(0, content.rfind('\n', 0, content.rfind('\n', 0, open_brace_idx)))
                            context_str = content[context_start:open_brace_idx].strip()
                            
                            findings.append({
                                "file": filepath.replace(root_dir, ""),
                                "line": line_no,
                                "reason": reason,
                                "context": context_str.split('\n')[-1].strip(),
                                "code": block_content
                            })

    return findings

if __name__ == "__main__":
    findings = analyze_directory("/home/shaolin/Spresso/composeApp")
    
    report_path = Path(__file__).resolve().parent.parent / "reports" / "audit_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as f:
        f.write("---\n")
        f.write("summary: Android Compose App Mock Button Audit\n")
        f.write("user_facing: true\n")
        f.write("request_feedback: true\n")
        f.write("---\n\n")
        f.write("# Android Compose App Mock Button Audit\n\n")
        f.write("This report lists UI action handlers (`onClick`, `onTap`, etc.) that appear to be empty, contain only logs/Toasts, or throw TODOs. These represent UI components that are not correctly wired to backend features or state management.\n\n")
        
        if not findings:
            f.write("✅ **No mock buttons found!** Everything appears fully wired.\n")
        else:
            f.write(f"Found **{len(findings)}** unwired or mock handlers.\n\n")
            
            grouped = {}
            for finding in findings:
                file = finding['file']
                if file not in grouped:
                    grouped[file] = []
                grouped[file].append(finding)
                
            for file, items in grouped.items():
                f.write(f"### `{file}`\n")
                f.write("| Line | Context | Issue | Snippet |\n")
                f.write("|---|---|---|---|\n")
                for item in items:
                    snippet = item['code'].replace('\n', ' ').strip()
                    if len(snippet) > 50:
                        snippet = snippet[:47] + "..."
                    if not snippet:
                        snippet = "*(empty)*"
                        
                    # Escape pipes
                    snippet = snippet.replace('|', '\\|')
                    ctx = item['context'].replace('|', '\\|')
                        
                    f.write(f"| {item['line']} | `{ctx}` | **{item['reason']}** | `{snippet}` |\n")
                f.write("\n")
    
    print(f"Audit complete. Wrote {len(findings)} findings to {report_path}.")
