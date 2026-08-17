import os
import glob

replacements = {
    "components.features.profile.organisms": "components.features.profile.widgets",
    "components.features.chat.molecules": "components.features.chat.cards"
}

target_dir = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin"
files = glob.glob(os.path.join(target_dir, "**", "*.kt"), recursive=True)

updated_count = 0
for filepath in files:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content
        for old, new in replacements.items():
            if old in new_content:
                new_content = new_content.replace(old, new)
                
        if new_content != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {filepath}")
            updated_count += 1
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

print(f"Total files updated: {updated_count}")
