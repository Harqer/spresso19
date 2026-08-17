import os
import re

search_dirs = [
    '/home/shaolin/Spresso/composeApp/src',
    '/home/shaolin/Spresso/spresso19/composeApp/src'
]

replacements = [
    ('components.features.travel.molecules.BoardingPassMolecule', 'components.features.travel.widgets.BoardingPass'),
    ('components.features.travel.molecules.LoggedExpenseItemMolecule', 'components.features.travel.widgets.LoggedExpenseItem'),
    ('components.features.travel.molecules.AddExpenseFormMolecule', 'components.features.travel.widgets.AddExpenseForm'),
    ('components.features.travel.molecules', 'components.features.travel.widgets'),
    ('BoardingPassMolecule', 'BoardingPass'),
    ('LoggedExpenseItemMolecule', 'LoggedExpenseItem'),
    ('AddExpenseFormMolecule', 'AddExpenseForm'),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for d in search_dirs:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('.kt'):
                    process_file(os.path.join(root, file))

print("Done.")
