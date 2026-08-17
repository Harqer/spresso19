import os
import shutil

roots = [
    "/home/shaolin/Spresso/spresso19/composeApp/src/commonMain/kotlin",
    "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin"
]

mappings = {
    "atoms": "shared/elements",
    "molecules": "shared/widgets",
    "organisms": "shared/overlays"
}

# First, move directories
for root in roots:
    shared_dir = os.path.join(root, "components", "shared")
    os.makedirs(shared_dir, exist_ok=True)
    
    for old, new in mappings.items():
        old_path = os.path.join(root, "components", old)
        new_path = os.path.join(root, "components", new)
        
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        
        if os.path.exists(old_path):
            print(f"Moving {old_path} to {new_path}")
            shutil.move(old_path, new_path)

# Now recursively replace in all .kt files
import_mappings = {
    "components.atoms": "components.shared.elements",
    "components.molecules": "components.shared.widgets",
    "components.organisms": "components.shared.overlays"
}

for root_dir in roots:
    if not os.path.exists(root_dir):
        continue
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".kt"):
                filepath = os.path.join(dirpath, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for old, new in import_mappings.items():
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    print(f"Updating imports in {filepath}")
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
print("Done.")
