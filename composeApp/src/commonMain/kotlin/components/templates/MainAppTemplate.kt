package components.templates

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

enum class AppTab {
    Assistant,
    Shop,
    Wardrobe,
    Agents
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppTemplate(
    currentTab: AppTab,
    onTabSelected: (AppTab) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (AppTab) -> Unit
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    val titleText = when (currentTab) {
                        AppTab.Assistant -> "Spresso19 AI Shopper"
                        AppTab.Shop -> "Spresso19 Storefront"
                        AppTab.Wardrobe -> "Spresso19 Smart Wardrobe"
                        AppTab.Agents -> "Spresso19 Enterprise Agents"
                    }
                    Text(titleText)
                }
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = currentTab == AppTab.Assistant,
                    onClick = { onTabSelected(AppTab.Assistant) },
                    label = { Text("Assistant") },
                    icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Assistant") }
                )
                NavigationBarItem(
                    selected = currentTab == AppTab.Shop,
                    onClick = { onTabSelected(AppTab.Shop) },
                    label = { Text("Shop") },
                    icon = { Icon(Icons.Default.ShoppingBag, contentDescription = "Shop") }
                )
                NavigationBarItem(
                    selected = currentTab == AppTab.Wardrobe,
                    onClick = { onTabSelected(AppTab.Wardrobe) },
                    label = { Text("Wardrobe") },
                    icon = { Icon(Icons.Default.Checkroom, contentDescription = "Wardrobe") }
                )
                NavigationBarItem(
                    selected = currentTab == AppTab.Agents,
                    onClick = { onTabSelected(AppTab.Agents) },
                    label = { Text("Agents") },
                    icon = { Icon(Icons.Default.Group, contentDescription = "Agents") }
                )
            }
        },
        floatingActionButton = {
            if (currentTab == AppTab.Assistant) {
                FloatingActionButton(onClick = onToggleVoiceRecording) {
                    if (isVoiceRecording) {
                        Icon(Icons.Default.Stop, contentDescription = "Stop voice recording")
                    } else {
                        Icon(Icons.Default.Mic, contentDescription = "Start voice recording")
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            content(currentTab)
        }
    }
}
