import re

def fix_file(path):
    with open(path, 'r') as f:
        c = f.read()
    
    # Just remove the try/catch and use LaunchedEffect? No, it's inside an onClick.
    # The best way is to inject rememberCoroutineScope.
    if "val scope = rememberCoroutineScope()" not in c:
        c = re.sub(r'(@Composable\nfun [^{]+\{)', r'\1\n    val scope = androidx.compose.runtime.rememberCoroutineScope()', c, count=1)
    
    c = c.replace("kotlinx.coroutines.GlobalScope.launch", "scope.launch")
    
    with open(path, 'w') as f:
        f.write(c)

fix_file("/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/vision/SmartVisionDetectionOverlay.kt")
fix_file("/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt")

print("Done")
