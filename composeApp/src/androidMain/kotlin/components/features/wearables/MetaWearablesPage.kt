package components.features.wearables

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.types.Device
import com.meta.wearable.dat.core.types.DeviceIdentifier
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import com.spresso.SpressoWearablesService
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private enum class WearableExperience(
    val serviceAction: String,
    val label: String,
) {
    CHECKOUT(SpressoWearablesService.ACTION_HANDS_FREE_CHECKOUT, "Checkout"),
    GROCERY(SpressoWearablesService.ACTION_GROCERY_SCANNER, "Shop"),
    COOKING(SpressoWearablesService.ACTION_BARGAIN_CHEF, "Cook"),
    PREVIEW(SpressoWearablesService.ACTION_COMPONENT_PREVIEW, "Preview components"),
}

@Composable
actual fun MetaWearablesPage(
    isConnected: Boolean,
    batteryPercent: Int,
    glassesModelName: String,
    isCameraStreaming: Boolean,
    onPairClick: () -> Unit,
    onStartHandsFreeCheckout: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val layoutDirection = LocalLayoutDirection.current
    val safeDrawingPadding = WindowInsets.safeDrawing.asPaddingValues()
    val registrationState by Wearables.registrationState.collectAsState()
    val deviceIdentifiers by Wearables.devices.collectAsState()
    val deviceMetadata by rememberDeviceMetadata(deviceIdentifiers)
    val connectedDevices = deviceMetadata.values

    var pendingExperience by remember { mutableStateOf<WearableExperience?>(null) }
    val requiresCamera = pendingExperience != WearableExperience.PREVIEW
    val requiredAndroidPermissions = remember(requiresCamera) {
        buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_CONNECT)
            } else {
                add(Manifest.permission.BLUETOOTH)
                add(Manifest.permission.BLUETOOTH_ADMIN)
            }
            if (requiresCamera) {
                add(Manifest.permission.CAMERA)
                add(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    var androidPermissionsGranted by remember(requiresCamera) {
        mutableStateOf(requiredAndroidPermissions.all { context.hasPermission(it) })
    }
    var androidPermissionRequestInFlight by remember { mutableStateOf(false) }
    var datPermissionStatus by remember { mutableStateOf<PermissionStatus?>(null) }
    var datPermissionCheckInFlight by remember { mutableStateOf(false) }
    var showDatPermissionConfirmation by remember { mutableStateOf(false) }
    var registrationStartedForRequest by remember { mutableStateOf(false) }
    var customerMessage by remember { mutableStateOf<String?>(null) }

    val androidPermissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            androidPermissionRequestInFlight = false
            androidPermissionsGranted = requiredAndroidPermissions.all { permission ->
                results[permission] == true || context.hasPermission(permission)
            }
            if (!androidPermissionsGranted) {
                customerMessage = "Camera, microphone, and nearby-device access are needed to use Spresso with your glasses."
                pendingExperience = null
            }
        }

    val datPermissionLauncher =
        rememberLauncherForActivityResult(Wearables.RequestPermissionContract()) { result ->
            result
                .onSuccess { status ->
                    datPermissionStatus = status
                    if (status != PermissionStatus.Granted) {
                        customerMessage = "Camera access wasn't granted for your glasses. You can try again whenever you're ready."
                        pendingExperience = null
                    }
                }.onFailure { error, _ ->
                    datPermissionStatus = null
                    customerMessage = error.getLocalizedDescription(context)
                    pendingExperience = null
                }
        }

    LaunchedEffect(Unit) {
        Wearables.registrationErrorStream.collect {
            customerMessage = "Spresso couldn't connect. Please try again."
            registrationStartedForRequest = false
        }
    }

    LaunchedEffect(registrationState) {
        if (registrationState != RegistrationState.REGISTERED) datPermissionStatus = null
        if (registrationState != RegistrationState.REGISTERING) registrationStartedForRequest = false
    }

    LaunchedEffect(
        pendingExperience,
        androidPermissionsGranted,
        registrationState,
        datPermissionStatus,
    ) {
        val experience = pendingExperience ?: return@LaunchedEffect
        if (!androidPermissionsGranted) {
            if (!androidPermissionRequestInFlight) {
                androidPermissionRequestInFlight = true
                androidPermissionLauncher.launch(requiredAndroidPermissions.toTypedArray())
            }
            return@LaunchedEffect
        }
        if (registrationState != RegistrationState.REGISTERED) {
            if (registrationState != RegistrationState.REGISTERING && !registrationStartedForRequest) {
                val currentActivity = activity
                if (currentActivity == null) {
                    customerMessage = "Open this page in Spresso to connect your glasses."
                    pendingExperience = null
                } else {
                    registrationStartedForRequest = true
                    onPairClick()
                    Wearables.startRegistration(currentActivity)
                }
            }
            return@LaunchedEffect
        }
        if (!requiresCamera) {
            val serviceIntent = Intent(context, SpressoWearablesService::class.java).setAction(experience.serviceAction)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            customerMessage = "Component preview sent to your glasses."
            pendingExperience = null
            return@LaunchedEffect
        }
        if (datPermissionStatus == null && !datPermissionCheckInFlight) {
            datPermissionCheckInFlight = true
            Wearables
                .checkPermissionStatus(Permission.CAMERA)
                .onSuccess { status ->
                    datPermissionStatus = status
                    if (status != PermissionStatus.Granted) showDatPermissionConfirmation = true
                }.onFailure { error, _ ->
                    customerMessage = error.getLocalizedDescription(context)
                    pendingExperience = null
                }
            datPermissionCheckInFlight = false
            return@LaunchedEffect
        }
        if (datPermissionStatus == PermissionStatus.Granted) {
            val serviceIntent = Intent(context, SpressoWearablesService::class.java).setAction(experience.serviceAction)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            if (experience == WearableExperience.CHECKOUT) onStartHandsFreeCheckout()
            customerMessage = "${experience.label} is ready."
            pendingExperience = null
        }
    }

    if (showDatPermissionConfirmation) {
        AlertDialog(
            onDismissRequest = {
                showDatPermissionConfirmation = false
                pendingExperience = null
            },
            title = { Text("Allow glasses camera access?") },
            text = { Text("Allow Spresso to use your glasses camera for this experience.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDatPermissionConfirmation = false
                        datPermissionLauncher.launch(Permission.CAMERA)
                    },
                ) {
                    Text("Continue")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDatPermissionConfirmation = false
                        pendingExperience = null
                    },
                ) {
                    Text("Not now")
                }
            },
        )
    }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(300.dp),
        modifier =
            modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surfaceContainerLowest),
        contentPadding =
            PaddingValues(
                start = 20.dp + safeDrawingPadding.calculateStartPadding(layoutDirection),
                top = 20.dp + safeDrawingPadding.calculateTopPadding(),
                end = 20.dp + safeDrawingPadding.calculateEndPadding(layoutDirection),
                bottom = 20.dp + safeDrawingPadding.calculateBottomPadding(),
            ),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "Meta smart glasses",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        registrationState.customerLabel(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.onSurface)
                }
            }
        }

        customerMessage?.let { message ->
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        message,
                        modifier = Modifier.padding(18.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        if (connectedDevices.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "No connected glasses were found. Unfold your glasses and keep them nearby.",
                        modifier = Modifier.padding(18.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        items(connectedDevices.toList(), key = { it.name }) { device ->
            MetaDeviceCard(device = device, activity = activity)
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                WearableExperience.entries.forEach { experience ->
                    val isPrimary = experience == WearableExperience.CHECKOUT || experience == WearableExperience.PREVIEW
                    if (isPrimary) {
                        val hasDisplay = connectedDevices.any { it.isDisplayCapable() }
                        val isPreviewEnabled = experience != WearableExperience.PREVIEW || hasDisplay
                        Button(
                            onClick = {
                                customerMessage = null
                                pendingExperience = experience
                            },
                            enabled = pendingExperience == null && isPreviewEnabled,
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Text(experience.label, fontWeight = FontWeight.SemiBold)
                        }
                    } else {
                        OutlinedButton(
                            onClick = {
                                customerMessage = null
                                pendingExperience = experience
                            },
                            enabled = pendingExperience == null,
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Text(experience.label, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        item {
            OutlinedButton(
                onClick = {
                    context.stopService(Intent(context, SpressoWearablesService::class.java))
                    customerMessage = "Stopped."
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
            ) {
                Icon(Icons.Default.Stop, contentDescription = null)
                Spacer(Modifier.padding(horizontal = 4.dp))
                Text("Stop")
            }
        }

        if (registrationState == RegistrationState.REGISTERED) {
            item {
                TextButton(
                    onClick = {
                        context.stopService(Intent(context, SpressoWearablesService::class.java))
                        activity?.let(Wearables::startUnregistration)
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Disconnect glasses")
                }
            }
        }
    }
}

@Composable
private fun rememberDeviceMetadata(
    deviceIdentifiers: Set<DeviceIdentifier>,
) = produceState<Map<DeviceIdentifier, Device>>(emptyMap(), deviceIdentifiers) {
    value = value.filterKeys(deviceIdentifiers::contains)
    coroutineScope {
        deviceIdentifiers.forEach { identifier ->
            launch {
                Wearables.devicesMetadata[identifier]?.collect { device ->
                    value = value + (identifier to device)
                }
            }
        }
    }
}

private fun Context.hasPermission(permission: String): Boolean =
    ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

private fun RegistrationState.customerLabel(): String =
    when (this) {
        RegistrationState.REGISTERED -> "Connected"
        RegistrationState.REGISTERING -> "Connecting…"
        RegistrationState.UNREGISTERING -> "Disconnecting…"
        RegistrationState.AVAILABLE -> "Ready to connect"
        RegistrationState.UNAVAILABLE -> "Unavailable"
    }
