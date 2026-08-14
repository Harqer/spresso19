import os
import re
from pathlib import Path

def get_all_tsx_files(src_dir):
    return list(Path(src_dir).rglob("*.tsx")) + list(Path(src_dir).rglob("*.ts"))

def find_file(name, all_files):
    for f in all_files:
        if f.stem == name:
            return f
    return None

all_files = get_all_tsx_files("src")

for filepath in all_files:
    content = filepath.read_text()
    
    def replacer(match):
        full_match = match.group(0)
        import_path = match.group(1)
        
        # Skip absolute imports and packages
        if not import_path.startswith('.'):
            return full_match
            
        # Resolve the relative path
        current_dir = filepath.parent
        resolved_path = (current_dir / import_path).resolve()
        
        # Check if the file exists (with .ts or .tsx)
        if resolved_path.with_suffix('.ts').exists() or resolved_path.with_suffix('.tsx').exists() or (resolved_path / 'index.ts').exists() or (resolved_path / 'index.tsx').exists():
            return full_match
            
        # The relative path is broken. Let's try to find the file by its name
        basename = os.path.basename(import_path)
        found_file = find_file(basename, all_files)
        if found_file:
            new_rel = os.path.relpath(found_file.with_suffix(''), current_dir)
            if not new_rel.startswith('.'):
                new_rel = './' + new_rel
            return full_match.replace(import_path, new_rel)
            
        return full_match
        
    new_content = re.sub(r'from\s+[\'"](.*?)[\'"]', replacer, content)
    new_content = re.sub(r'import\s+[\'"](.*?)[\'"]', replacer, new_content)
    
    if new_content != content:
        filepath.write_text(new_content)

print("Imports fixed.")
