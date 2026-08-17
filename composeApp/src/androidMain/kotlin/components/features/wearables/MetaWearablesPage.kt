package components.features.wearables

import android.app.Activity
import android.content.Intent
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.meta.wearable.dat.core.Wearables

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
    val context = LocalContext.current
    val activity = context as? Activity
    val layoutDirection = LocalLayoutDirection.current
    val safeDrawingPadding = WindowInsets.safeDrawing.asPaddingValues()

    val registrationState by Wearables.registrationState.collectAsState(initial = null)
    val deviceIdentifiers by Wearables.devices.collectAsState(initial = emptySet())
    
    // Fallback simple state since we don't have access to coroutineContext in this scope easily
    // without launching a separate flow, we'll just enable the button and handle exceptions.
    // In production we would observe ProjectedContextHelper.isProjectedDeviceConnected.
    val isProjectedConnected = true 
    
    val displayCapableDevices = deviceIdentifiers.mapNotNull { id ->
        Wearables.devicesMetadata[id]?.value
    }.filter { it.isDisplayCapable() }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(300.dp),
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceContainerLowest),
        contentPadding = PaddingValues(
            start = 20.dp + safeDrawingPadding.calculateStartPadding(layoutDirection),
            top = 20.dp + safeDrawingPadding.calculateTopPadding(),
            end = 20.dp + safeDrawingPadding.calculateEndPadding(layoutDirection),
            bottom = 20.dp + safeDrawingPadding.calculateBottomPadding()
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Meta Wearables DAT", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
                    Text("Registration State: ${registrationState?.name ?: "UNKNOWN"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.onSurface)
                }
            }
        }

        if (displayCapableDevices.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text("No display capable devices found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }

        items(displayCapableDevices) { device ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(device.name, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text("Firmware: ${device.firmwareInfo}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    if (device.compatibility == com.meta.wearable.dat.core.types.DeviceCompatibility.DEVICE_UPDATE_REQUIRED) {
                        Button(
                            onClick = {
                                activity?.let {
                                    Wearables.openFirmwareUpdate(it)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Update Firmware Required")
                        }
                    }
                }
            }
        }

        item {
            Button(
                onClick = onStartHandsFreeCheckout,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Start Hands-Free Voice Checkout", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
            }
        }

        item {
            Button(
                onClick = {
                    val intent = Intent(context, com.spresso19.SpressoWearablesService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                Text("Start Grocery Scanner", color = MaterialTheme.colorScheme.onSecondary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
            }
        }

        item {
            Button(
                onClick = {
                    val intent = Intent(context, com.spresso19.SpressoWearablesService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                Text("Start Bargain Chef", color = MaterialTheme.colorScheme.onSecondary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
