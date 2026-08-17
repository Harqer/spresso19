import os
import filecmp
from datetime import datetime

base1 = "/home/shaolin/Spresso/composeApp/src"
base2 = "/home/shaolin/Spresso/spresso19/composeApp/src"

def get_screens(base_dir):
    screens = set()
    for root, _, files in os.walk(base_dir):
        for file in files:
            if "Screen" in file or "Page" in file:
                if file.endswith(".kt"):
                    rel_path = os.path.relpath(os.path.join(root, file), base_dir)
                    screens.add(rel_path)
    return screens

screens1 = get_screens(base1)
screens2 = get_screens(base2)

in_both = screens1.intersection(screens2)

print("| Screen File | Root Lines | Spresso19 Lines | Identical Content? |")
print("|---|---|---|---|")
for s in sorted(in_both):
    p1 = os.path.join(base1, s)
    p2 = os.path.join(base2, s)
    
    with open(p1) as f:
        l1 = len(f.readlines())
    with open(p2) as f:
        l2 = len(f.readlines())
        
    is_same = filecmp.cmp(p1, p2, shallow=False)
    print(f"| {s} | {l1} | {l2} | {'Yes' if is_same else 'No'} |")

