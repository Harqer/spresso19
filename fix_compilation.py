import re

# Fix CreatorAgentsSection.kt
path1 = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/creators/CreatorAgentsSection.kt"
with open(path1, 'r') as f:
    c = f.read()
c = c.replace("agents = result.data.toString()", "agents = result")
with open(path1, 'w') as f:
    f.write(c)

# Fix CreatorTemplatesSection.kt
path2 = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/creators/CreatorTemplatesSection.kt"
with open(path2, 'r') as f:
    c = f.read()
c = c.replace("templates = result.data.toString()", "templates = result")
with open(path2, 'w') as f:
    f.write(c)

# Fix SmartVisionDetectionOverlay.kt
path3 = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/vision/SmartVisionDetectionOverlay.kt"
with open(path3, 'r') as f:
    c = f.read()
# It seems scope was already defined, so 'val scope = rememberCoroutineScope()' was a duplicate declaration that caused conflicts and it couldn't resolve it because of the missing import.
c = c.replace("    val scope = rememberCoroutineScope()\n", "")
# Also I injected it twice! So remove all injected instances.
c = re.sub(r'    val scope = rememberCoroutineScope\(\)\n', '', c)
# Let's just fix the launch import instead.
if "import kotlinx.coroutines.launch" not in c:
    c = c.replace("import androidx.compose.runtime.*", "import androidx.compose.runtime.*\nimport kotlinx.coroutines.launch")
with open(path3, 'w') as f:
    f.write(c)

print("Done")
