package components.features.wearables

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
actual fun MetaWearablesPage(
    isConnected: Boolean,
    batteryPercent: Int,
    glassesModelName: String,
    isCameraStreaming: Boolean,
    onPairClick: () -> Unit,
    onStartHandsFreeCheckout: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Meta Smart Glasses integration is only supported on Android.")
    }
}
