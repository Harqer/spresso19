package components.core

import androidx.compose.runtime.staticCompositionLocalOf

val LocalAnalyticsConsent = staticCompositionLocalOf<Boolean> {
    true // Default to true or false depending on platform setup, but MainActivity will provide it.
}
