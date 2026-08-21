import os
import re

ROOT_DIR = "/home/shaolin/Spresso/composeApp/src"

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # 1. State Optimization
    # mutableStateOf(0) -> mutableIntStateOf(0)
    content = re.sub(r'mutableStateOf\(\s*0\s*\)', 'mutableIntStateOf(0)', content)
    content = re.sub(r'mutableStateOf\(\s*1\s*\)', 'mutableIntStateOf(1)', content)
    # mutableStateOf(0f) -> mutableFloatStateOf(0f)
    content = re.sub(r'mutableStateOf\(\s*0f\s*\)', 'mutableFloatStateOf(0f)', content)
    content = re.sub(r'mutableStateOf\(\s*0\.0f\s*\)', 'mutableFloatStateOf(0.0f)', content)
    content = re.sub(r'mutableStateOf\(\s*1f\s*\)', 'mutableFloatStateOf(1f)', content)
    content = re.sub(r'mutableStateOf\(\s*1\.0f\s*\)', 'mutableFloatStateOf(1.0f)', content)

    # 2. Redundant SDK Checks
    # Remove if (Build.VERSION.SDK_INT >= 30) or Build.VERSION_CODES.R
    content = re.sub(r'Build\.VERSION\.SDK_INT\s*>=\s*30', 'true', content)
    content = re.sub(r'Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.R', 'true', content)

    # 3. KTX Extensions
    # String.toUri()
    content = re.sub(r'Uri\.parse\(([^)]+)\)', r'\1.toUri()', content)
    
    # 5. Redundant `public` modifiers
    content = re.sub(r'^(\s*)public\s+(class|fun|val|var|interface|object)', r'\1\2', content, flags=re.MULTILINE)

    if content != original_content:
        # Check if we need to import mutableIntStateOf or mutableFloatStateOf
        if 'mutableIntStateOf' in content and 'import androidx.compose.runtime.mutableIntStateOf' not in content:
            content = content.replace('import androidx.compose.runtime.mutableStateOf', 'import androidx.compose.runtime.mutableStateOf\nimport androidx.compose.runtime.mutableIntStateOf')
        if 'mutableFloatStateOf' in content and 'import androidx.compose.runtime.mutableFloatStateOf' not in content:
            content = content.replace('import androidx.compose.runtime.mutableStateOf', 'import androidx.compose.runtime.mutableStateOf\nimport androidx.compose.runtime.mutableFloatStateOf')
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file.endswith('.kt') or file.endswith('.kts'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
