import os

base_root = "/home/shaolin/Spresso"
base_spresso = "/home/shaolin/Spresso/spresso19"

ignores = {".git", "node_modules", "build", ".gradle", ".idea", "dist", ".artifacts", ".scratch", ".kotlin", "out"}

def get_all_files(base_dir):
    all_files = set()
    for root, dirs, files in os.walk(base_dir):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in ignores and not d.endswith("build") and not d.startswith(".")]
        
        # Proper check to avoid top-level spresso19 when scanning root
        # if base_root is /home/shaolin/Spresso, then root might be /home/shaolin/Spresso/spresso19/...
        rel_root = os.path.relpath(root, base_dir)
        if base_dir == base_root and (rel_root == "spresso19" or rel_root.startswith("spresso19/")):
            continue
            
        for f in files:
            if f.startswith("."): continue
            rel_path = os.path.relpath(os.path.join(root, f), base_dir)
            all_files.add(rel_path)
    return all_files

root_files = get_all_files(base_root)
spresso_files = get_all_files(base_spresso)

only_in_spresso = spresso_files - root_files

print(f"Total files ONLY in spresso19: {len(only_in_spresso)}")
if len(only_in_spresso) > 0:
    for f in sorted(list(only_in_spresso)):
        print(" -", f)

