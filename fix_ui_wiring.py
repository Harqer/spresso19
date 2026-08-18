import os
import glob
import re

base_dir = "/home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/features/"
files = glob.glob(base_dir + "**/*.kt", recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    original_content = content

    # Replace com.spresso.dataconnect.SpressoConnectorConnector.instance.XYZ.execute()
    # Or com.spresso.dataconnect.SpressoConnectorConnector.instance.XYZ().execute() if they have parens
    # Actually, they might be like: com.spresso.dataconnect.SpressoConnectorConnector.instance.addGroceryItem.execute()
    
    replacements = {
        "getCreatorAgents.execute()": "network.SpressoBackend.getCreatorAgents()",
        "getCreativeTemplates.execute()": "network.SpressoBackend.getCreativeTemplates()",
        "addGroceryItem.execute()": "network.SpressoBackend.addGroceryItem()",
        "toggleGroceryItem.execute()": "network.SpressoBackend.toggleGroceryItem()",
        "deleteGroceryItem.execute()": "network.SpressoBackend.deleteGroceryItem()",
        "updateOnboardingStatus.execute()": "network.SpressoBackend.updateOnboardingStatus()",
        "createOrder.execute()": "network.SpressoBackend.createOrder()",
        "createVoiceNote.execute()": "network.SpressoBackend.createVoiceNote()",
        "createTravelExpense.execute()": "network.SpressoBackend.createTravelExpense()",
        "logVisionEvent.execute()": "network.SpressoBackend.logVisionEvent()",
        "getWardrobeOutfits.execute()": "network.SpressoBackend.getWardrobeOutfits()",
        "getWardrobeItems.execute()": "network.SpressoBackend.getWardrobeItems()",
        "addWardrobeItem.execute()": "network.SpressoBackend.addWardrobeItem()",
    }

    for k, v in replacements.items():
        content = content.replace("com.spresso.dataconnect.SpressoConnectorConnector.instance." + k, v)

    # Fix scope.launch in SmartVisionDetectionOverlay and WardrobeViewPage
    if "SmartVisionDetectionOverlay.kt" in file or "WardrobeViewPage.kt" in file:
        if "val scope = rememberCoroutineScope()" not in content and "scope.launch" in content:
            # Inject rememberCoroutineScope() right after @Composable fun declaration
            content = re.sub(r'(@Composable\s*fun [^{]+\{\n)', r'\1    val scope = rememberCoroutineScope()\n', content, count=1)
            # Add import if missing
            if "androidx.compose.runtime.rememberCoroutineScope" not in content:
                content = content.replace("import androidx.compose.runtime.*", "import androidx.compose.runtime.*\nimport androidx.compose.runtime.rememberCoroutineScope")
        if "import kotlinx.coroutines.launch" not in content:
            content = content.replace("import androidx.compose.runtime.*", "import androidx.compose.runtime.*\nimport kotlinx.coroutines.launch")

    if content != original_content:
        with open(file, 'w') as f:
            f.write(content)
        print(f"Updated {file}")
