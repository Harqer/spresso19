package com.spresso19

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.ui.tooling.preview.Preview
import com.android.tools.screenshot.PreviewTest
import components.molecules.AIShopperInputBar
import theme.AppTheme

class AIShopperInputBarScreenshotTest {

    @PreviewTest
    @Preview
    @Composable
    fun AIShopperInputBarDefault() {
        AppTheme {
            Box(modifier = Modifier.padding(16.dp)) {
                AIShopperInputBar(onSend = {})
            }
        }
    }

    @PreviewTest
    @Preview
    @Composable
    fun AIShopperInputBarTyping() {
        AppTheme {
            Box(modifier = Modifier.padding(16.dp)) {
                AIShopperInputBar(onSend = {}, isTyping = true)
            }
        }
    }

    @PreviewTest
    @Preview
    @Composable
    fun AIShopperInputBarVoiceActive() {
        AppTheme {
            Box(modifier = Modifier.padding(16.dp)) {
                AIShopperInputBar(onSend = {}, isVoiceActive = true)
            }
        }
    }
}
