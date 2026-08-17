import os

def get_screens(base_dir):
    screens = set()
    for root, _, files in os.walk(base_dir):
        for file in files:
            if "Screen" in file or "Page" in file:
                if file.endswith(".kt"):
                    rel_path = os.path.relpath(os.path.join(root, file), base_dir)
                    screens.add(rel_path)
    return screens

root_screens = get_screens("/home/shaolin/Spresso/composeApp/src")
spresso_screens = get_screens("/home/shaolin/Spresso/spresso19/composeApp/src")

in_both = root_screens.intersection(spresso_screens)
only_root = root_screens - spresso_screens
only_spresso = spresso_screens - root_screens

print("### Screens in Both (Redundancies)")
for s in sorted(in_both):
    print(f"- {s}")

print("\n### Only in Root `composeApp`")
for s in sorted(only_root):
    print(f"- {s}")

print("\n### Only in `spresso19/composeApp`")
for s in sorted(only_spresso):
    print(f"- {s}")

