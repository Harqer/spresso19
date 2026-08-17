import os

project_dir = '/home/shaolin/Spresso'
old_pkg = 'components.features.catalog.organisms'
new_pkg = 'components.features.catalog.screens'

def replace_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    if old_pkg in content:
        new_content = content.replace(old_pkg, new_pkg)
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, _, files in os.walk(project_dir):
    for file in files:
        if file.endswith('.kt'):
            replace_in_file(os.path.join(root, file))

old_dir = os.path.join(project_dir, 'composeApp/src/commonMain/kotlin/components/features/catalog/organisms')
new_dir = os.path.join(project_dir, 'composeApp/src/commonMain/kotlin/components/features/catalog/screens')

if os.path.exists(old_dir):
    os.rename(old_dir, new_dir)
    print(f"Renamed {old_dir} to {new_dir}")
