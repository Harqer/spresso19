import os
import re

def extract_onclicks(directory):
    results = []
    for root, _, files in os.walk(directory):
        for f in files:
            if f.endswith('.kt'):
                path = os.path.join(root, f)
                with open(path, 'r') as file:
                    lines = file.readlines()
                
                for i, line in enumerate(lines):
                    if 'onClick' in line:
                        snippet = "".join(lines[i:i+5])
                        if 'TODO' in snippet or 'println' in snippet or 'Log.d' in snippet or 'NotImplementedError' in snippet or re.search(r'onClick\s*=\s*{\s*}', snippet) or 'mock' in snippet.lower() or 'dummy' in snippet.lower() or 'print(' in snippet:
                            results.append(f"{path}:{i+1}\n{snippet}\n")
    return results

res = extract_onclicks('/home/shaolin/Spresso/composeApp/src')
with open('/home/shaolin/Spresso/suspicious_onclicks.txt', 'w') as f:
    for r in res:
        f.write(r + "\n")
print(f"Found {len(res)} suspicious onClick handlers.")
