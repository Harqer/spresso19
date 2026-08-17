import re

with open("composeApp/src/commonMain/kotlin/components/navigation/AdaptiveScaffoldBody.kt", "r") as f:
    content = f.read()

# Add imports for NavigationSuiteScaffold
imports = """
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType
import androidx.compose.material3.adaptive.navigationsuite.rememberNavigationSuiteScaffoldState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
"""
content = content.replace("import components.features.chat.AIShopperInputBar\n", "import components.features.chat.AIShopperInputBar\n" + imports)

# Replace Scaffold with NavigationSuiteScaffold
replacement = """    var isNavBarVisible by remember { mutableStateOf(showBottomBar) }
    val scaffoldVisibilityState = rememberNavigationSuiteScaffoldState()

    LaunchedEffect(showBottomBar) {
        isNavBarVisible = showBottomBar
        if (isNavBarVisible) {
            scaffoldVisibilityState.show()
        } else {
            scaffoldVisibilityState.hide()
        }
    }

    NavigationSuiteScaffold(
        navigationSuiteItems = {
            defaultNavDestinations.forEach { item ->
                item(
                    selected = isSameDestinationGroup(currentKey, item.key),
                    onClick = { onNavigate(item.key) },
                    icon = {
                        if (item.icon != null) {
                            Icon(imageVector = item.icon, contentDescription = item.label)
                        } else if (item.iconResource != null) {
                            Icon(painter = org.jetbrains.compose.resources.vectorResource(item.iconResource), contentDescription = item.label)
                        }
                    },
                    label = { Text(item.label) }
                )
            }
        },
        state = scaffoldVisibilityState,
        modifier = modifier
    ) {
        Scaffold(
            topBar = {
"""
content = re.sub(r'    Scaffold\(\n        modifier = modifier,\n        topBar = \{', replacement, content)

content = content.replace("    } { innerPadding ->", "        }\n    ) { innerPadding ->")
content = content.replace("    }\n}\n", "    }\n    }\n}\n")

with open("composeApp/src/commonMain/kotlin/components/navigation/AdaptiveScaffoldBody.kt", "w") as f:
    f.write(content)

