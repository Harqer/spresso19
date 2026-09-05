import os
import re

def extract_onclick_bodies(directory):
    suspicious_handlers = []
    
    for root, _, files in os.walk(directory):
        for f in files:
            if f.endswith('.kt'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                # Find all occurrences of "onClick ="
                matches = list(re.finditer(r'onClick\s*=\s*\{', content))
                
                for match in matches:
                    start_idx = match.end() - 1 # index of '{'
                    brace_count = 0
                    end_idx = -1
                    
                    for i in range(start_idx, len(content)):
                        if content[i] == '{':
                            brace_count += 1
                        elif content[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i
                                break
                    
                    if end_idx != -1:
                        body = content[start_idx+1:end_idx].strip()
                        line_number = content.count('\n', 0, start_idx) + 1
                        
                        # Check for suspicious signals
                        is_suspicious = False
                        if not body:
                            is_suspicious = True
                        elif 'TODO' in body:
                            is_suspicious = True
                        elif 'println(' in body or 'Log.d(' in body:
                            is_suspicious = True
                        elif 'mock' in body.lower() or 'dummy' in body.lower():
                            is_suspicious = True
                        elif 'NotImplementedError' in body:
                            is_suspicious = True
                        
                        if is_suspicious:
                            suspicious_handlers.append(f"{path}:{line_number}\nonClick = {{\n{body}\n}}\n")

    return suspicious_handlers

res = extract_onclick_bodies('/home/shaolin/Spresso/composeApp/src')
with open('/home/shaolin/Spresso/suspicious_onclicks2.txt', 'w') as f:
    for r in res:
        f.write(r + "\n")
print(f"Found {len(res)} suspicious onClick handlers.")
