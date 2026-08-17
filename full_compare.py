import os

base_root = "/home/shaolin/Spresso"
base_spresso = "/home/shaolin/Spresso/spresso19"

ignores = {".git", "node_modules", "build", ".gradle", ".idea", "dist", ".artifacts", ".scratch", ".kotlin", "dist", "out"}

def get_all_files(base_dir):
    all_files = set()
    for root, dirs, files in os.walk(base_dir):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in ignores and not d.endswith("build") and not d.startswith(".")]
        
        # Don't look inside spresso19 when walking root
        if base_dir == base_root and "spresso19" in root.split(os.sep):
            continue
            
        for f in files:
            if f.startswith("."): continue
            rel_path = os.path.relpath(os.path.join(root, f), base_dir)
            all_files.add(rel_path)
    return all_files

root_files = get_all_files(base_root)
spresso_files = get_all_files(base_spresso)

only_in_spresso = spresso_files - root_files

print(f"Total files in spresso19: {len(spresso_files)}")
print(f"Total files ONLY in spresso19: {len(only_in_spresso)}")

# Let's list directories of the files only in spresso19 to summarize
spresso_only_dirs = set(os.path.dirname(f) for f in only_in_spresso if '/' in f)
if len(only_in_spresso) > 0:
    print("\nFiles only in spresso19 (first 50):")
    for f in sorted(list(only_in_spresso))[:50]:
        print(" -", f)

