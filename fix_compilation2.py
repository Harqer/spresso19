import re

path = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt"
with open(path, 'r') as f:
    c = f.read()

# Remove duplicated scope injections if any
c = re.sub(r'    val scope = rememberCoroutineScope\(\)\n', '', c)

if "import kotlinx.coroutines.launch" not in c:
    c = c.replace("import androidx.compose.runtime.*", "import androidx.compose.runtime.*\nimport kotlinx.coroutines.launch")

with open(path, 'w') as f:
    f.write(c)

print("Done")
