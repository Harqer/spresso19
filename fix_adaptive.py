import re

with open("composeApp/src/commonMain/kotlin/components/navigation/AdaptiveScaffoldBody.kt", "r") as f:
    content = f.read()

# Fix the Icon issue
content = content.replace(
    "Icon(painter = org.jetbrains.compose.resources.vectorResource(item.iconResource)",
    "Icon(imageVector = org.jetbrains.compose.resources.vectorResource(item.iconResource)"
)

# Remove the state parameter and rememberNavigationSuiteScaffoldState
content = content.replace("import androidx.compose.material3.adaptive.navigationsuite.rememberNavigationSuiteScaffoldState\n", "")
content = content.replace("    val scaffoldVisibilityState = rememberNavigationSuiteScaffoldState()\n", "")

# Replace the LaunchedEffect and state logic with layoutType
replacement_logic = """
    val layoutType = if (isNavBarVisible) {
        androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo(
            androidx.compose.material3.adaptive.currentWindowAdaptiveInfo()
        )
    } else {
        NavigationSuiteType.None
    }
"""
content = re.sub(
    r'    LaunchedEffect\(showBottomBar\) \{\n.*?\n.*?\n.*?\n.*?\n.*?    \}',
    """
    LaunchedEffect(showBottomBar) {
        isNavBarVisible = showBottomBar
    }
    
    val layoutType = if (isNavBarVisible) {
        androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo(
            androidx.compose.material3.adaptive.currentWindowAdaptiveInfo()
        )
    } else {
        NavigationSuiteType.None
    }
    """,
    content,
    flags=re.DOTALL
)

content = content.replace("        state = scaffoldVisibilityState,\n", "        layoutType = layoutType,\n")

with open("composeApp/src/commonMain/kotlin/components/navigation/AdaptiveScaffoldBody.kt", "w") as f:
    f.write(content)
