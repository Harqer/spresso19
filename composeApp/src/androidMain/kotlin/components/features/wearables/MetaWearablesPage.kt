package components.features.wearables

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import kotlinx.coroutines.launch

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

    val registrationState by Wearables.registrationState.collectAsState(initial = null)
    val deviceIdentifiers by Wearables.devices.collectAsState(initial = emptySet())

    // In production we would observe ProjectedContextHelper.isProjectedDeviceConnected.
    val displayCapableDevices =
        deviceIdentifiers
            .mapNotNull { id ->
                Wearables.devicesMetadata[id]?.value
            }.filter { it.isDisplayCapable() }

    val permissions =
        buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_CONNECT)
            } else {
                add(Manifest.permission.BLUETOOTH)
                add(Manifest.permission.BLUETOOTH_ADMIN)
            }
            add(Manifest.permission.CAMERA)
            add(Manifest.permission.RECORD_AUDIO)
        }

    var hasPermissions by remember {
        mutableStateOf(permissions.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED })
    }

    val launcher =
        rememberLauncherForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions(),
        ) { results ->
            hasPermissions = results.values.all { it }
        }

    var datPermissionsGranted by remember { mutableStateOf(false) }

    val datPermissionLauncher =
        rememberLauncherForActivityResult(
            Wearables.RequestPermissionContract(),
        ) { result ->
            result
                .onSuccess { status ->
                    if (status == PermissionStatus.Granted) {
                        datPermissionsGranted = true
                    }
                }.onFailure { error, _ ->
                    // Handle error, maybe show toast
                    datPermissionsGranted = false
                }
        }

    LaunchedEffect(Unit) {
        if (!hasPermissions) {
            launcher.launch(permissions.toTypedArray())
        }
    }

    val coroutineScope = rememberCoroutineScope()
    LaunchedEffect(registrationState?.name) {
        if (registrationState?.name == "REGISTERED") {
            Wearables
                .checkPermissionStatus(Permission.CAMERA)
                .onSuccess { status ->
                    if (status == PermissionStatus.Granted) {
                        datPermissionsGranted = true
                    }
                }
        }
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
                Column {
                    Text(
                        "Meta Smart Glasses",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold,
                    )
                    val statusText =
                        when (registrationState?.name) {
                            "REGISTERED" -> "Connected"
                            "UNREGISTERED" -> "Not Connected"
                            else -> "Unknown"
                        }
                    Text(
                        "Connection Status: $statusText",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                    )
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
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            "No display capable devices found.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }

        items(displayCapableDevices) { device ->
            MetaDeviceCard(device = device, activity = activity)
        }

        item {
            Button(
                onClick = {
                    if (!hasPermissions) {
                        launcher.launch(permissions.toTypedArray())
                        return@Button
                    }
                    if (registrationState?.name != "REGISTERED") {
                        activity?.let { Wearables.startRegistration(it) }
                        return@Button
                    }
                    if (!datPermissionsGranted) {
                        datPermissionLauncher.launch(Permission.CAMERA)
                        return@Button
                    }
                    val intent =
                        Intent(context, com.spresso19.SpressoWearablesService::class.java).apply {
                            action = "com.spresso19.action.HANDS_FREE_CHECKOUT"
                        }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            ) {
                Text(
                    if (registrationState?.name !=
                        "REGISTERED"
                    ) {
                        "Register Smart Glasses"
                    } else {
                        "Start Hands-Free Voice Checkout"
                    },
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        item {
            Button(
                onClick = {
                    if (!hasPermissions) {
                        launcher.launch(permissions.toTypedArray())
                        return@Button
                    }
                    if (registrationState?.name != "REGISTERED") {
                        activity?.let { Wearables.startRegistration(it) }
                        return@Button
                    }
                    if (!datPermissionsGranted) {
                        datPermissionLauncher.launch(Permission.CAMERA)
                        return@Button
                    }
                    val intent =
                        Intent(context, com.spresso19.SpressoWearablesService::class.java).apply {
                            action = "com.spresso19.action.GROCERY_SCANNER"
                        }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
            ) {
                Text(
                    "Start Grocery Scanner",
                    color = MaterialTheme.colorScheme.onSecondary,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        item {
            Button(
                onClick = {
                    if (!hasPermissions) {
                        launcher.launch(permissions.toTypedArray())
                        return@Button
                    }
                    if (registrationState?.name != "REGISTERED") {
                        activity?.let { Wearables.startRegistration(it) }
                        return@Button
                    }
                    if (!datPermissionsGranted) {
                        datPermissionLauncher.launch(Permission.CAMERA)
                        return@Button
                    }
                    val intent =
                        Intent(context, com.spresso19.SpressoWearablesService::class.java).apply {
                            action = "com.spresso19.action.BARGAIN_CHEF"
                        }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
            ) {
                Text(
                    "Start Bargain Chef",
                    color = MaterialTheme.colorScheme.onSecondary,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}
