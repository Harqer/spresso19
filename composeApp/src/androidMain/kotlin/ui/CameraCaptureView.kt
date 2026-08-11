package ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.extensions.ExtensionMode
import androidx.camera.extensions.ExtensionsManager
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlashAuto
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import java.io.File
import java.util.concurrent.Executors

@Composable
fun CameraCaptureView(
    onImageCaptured: (ByteArray) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    
    // Check runtime permission state per Android Developer Guidelines
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    
    var showRationaleModal by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            showRationaleModal = true
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (!hasCameraPermission) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Camera Access Required") },
            text = { Text("Spresso requires camera permission to capture photos for Virtual Try-On and visual product search. Please allow camera access to continue.") },
            confirmButton = {
                Button(
                    onClick = {
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                ) {
                    Text("Allow Camera")
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(
                        onClick = {
                            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.fromParts("package", context.packageName, null)
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            context.startActivity(intent)
                        }
                    ) {
                        Text("Open Settings")
                    }
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                }
            }
        )
        return
    }

    // Lens selection state (Front vs Back camera)
    var isFrontLens by remember { mutableStateOf(false) }
    
    // Flash mode state (Auto = 0, On = 1, Off = 2)
    var flashMode by remember { mutableStateOf(ImageCapture.FLASH_MODE_OFF) }
    
    // Active camera mode selector (PHOTO / VIDEO / VIRTUAL_FIT)
    var activeMode by remember { mutableStateOf("PHOTO") }
    
    // Zoom ratio state (1.0x, 2.0x)
    var zoomRatio by remember { mutableStateOf(1.0f) }
    
    // Visual flash feedback state
    var isShutterFlashVisible by remember { mutableStateOf(false) }
    
    // Initialize executor for async tasks
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    
    // Create the high-level LifecycleCameraController
    val cameraController = remember {
        LifecycleCameraController(context).apply {
            bindToLifecycle(lifecycleOwner)
            // Enable use cases: Preview, Capture, Video, and real-time ImageAnalysis
            setEnabledUseCases(
                CameraController.IMAGE_CAPTURE or
                CameraController.VIDEO_CAPTURE or
                CameraController.IMAGE_ANALYSIS
            )
            // Set frame analysis queue strategy to prevent memory backlog
            setImageAnalysisBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        }
    }
    
    // Apply built-in vendor extensions (HDR, Night, Bokeh, Auto) asynchronously
    LaunchedEffect(isFrontLens) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val extensionsManagerFuture = ExtensionsManager.getInstanceAsync(context, cameraProvider)
            extensionsManagerFuture.addListener({
                val extensionsManager = extensionsManagerFuture.get()
                val baseCameraSelector = if (isFrontLens) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                }
                
                // Retrieve selector with highest capability extension supported by hardware
                val selectorWithExtension = when {
                    extensionsManager.isExtensionAvailable(baseCameraSelector, ExtensionMode.HDR) -> {
                        extensionsManager.getExtensionEnabledCameraSelector(baseCameraSelector, ExtensionMode.HDR)
                    }
                    extensionsManager.isExtensionAvailable(baseCameraSelector, ExtensionMode.NIGHT) -> {
                        extensionsManager.getExtensionEnabledCameraSelector(baseCameraSelector, ExtensionMode.NIGHT)
                    }
                    extensionsManager.isExtensionAvailable(baseCameraSelector, ExtensionMode.BOKEH) -> {
                        extensionsManager.getExtensionEnabledCameraSelector(baseCameraSelector, ExtensionMode.BOKEH)
                    }
                    extensionsManager.isExtensionAvailable(baseCameraSelector, ExtensionMode.AUTO) -> {
                        extensionsManager.getExtensionEnabledCameraSelector(baseCameraSelector, ExtensionMode.AUTO)
                    }
                    else -> baseCameraSelector
                }
                cameraController.cameraSelector = selectorWithExtension
            }, ContextCompat.getMainExecutor(context))
        }, ContextCompat.getMainExecutor(context))
    }
    
    // Configure native ImageAnalysis frame scanner
    LaunchedEffect(Unit) {
        cameraController.setImageAnalysisAnalyzer(cameraExecutor) { imageProxy ->
            // Image analysis stream is active. Always close imageProxy to prevent frame locks.
            imageProxy.close()
        }
    }
    
    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    controller = cameraController
                    // Enable tap-to-focus and pinch-to-zoom hardware interop
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }
            },
            modifier = Modifier.fillMaxSize()
        )
        
        // Screen Shutter Flash Overlay Effect
        if (isShutterFlashVisible) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.8f))
            )
        }
        
        // Top Action Bar: Flash & Lens Toggle Controls with Accessibility Semantics
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 40.dp, start = 16.dp, end = 16.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Flash Toggle Button
            IconButton(
                onClick = {
                    flashMode = when (flashMode) {
                        ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
                        ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
                        else -> ImageCapture.FLASH_MODE_OFF
                    }
                    cameraController.imageCaptureFlashMode = flashMode
                },
                modifier = Modifier
                    .size(48.dp)
                    .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                    .semantics(mergeDescendants = true) {
                        contentDescription = "Flash mode: ${if (flashMode == ImageCapture.FLASH_MODE_ON) "On" else if (flashMode == ImageCapture.FLASH_MODE_AUTO) "Auto" else "Off"}"
                    }
            ) {
                Icon(
                    imageVector = when (flashMode) {
                        ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                        ImageCapture.FLASH_MODE_AUTO -> Icons.Default.FlashAuto
                        else -> Icons.Default.FlashOff
                    },
                    contentDescription = "Flash",
                    tint = Color.White
                )
            }
            
            // Camera Zoom Preset Pill
            Row(
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf(1.0f, 2.0f).forEach { ratio ->
                    Surface(
                        onClick = {
                            zoomRatio = ratio
                            cameraController.setZoomRatio(ratio)
                        },
                        shape = CircleShape,
                        color = if (zoomRatio == ratio) Color.White.copy(alpha = 0.3f) else Color.Transparent,
                        modifier = Modifier.padding(2.dp)
                    ) {
                        Text(
                            text = "${ratio.toInt()}x",
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            
            // Front / Back Camera Switcher
            IconButton(
                onClick = { isFrontLens = !isFrontLens },
                modifier = Modifier
                    .size(48.dp)
                    .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                    .semantics(mergeDescendants = true) {
                        contentDescription = "Switch camera lens to ${if (isFrontLens) "back" else "front"}"
                    }
            ) {
                Icon(
                    imageVector = Icons.Default.Cameraswitch,
                    contentDescription = "Switch Lens",
                    tint = Color.White
                )
            }
        }
        
        // Bottom Action Section: Mode Switcher & Shutter Ring
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Camera Mode Selector Bar
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf("PHOTO", "VIDEO", "VIRTUAL FIT").forEach { mode ->
                    TextButton(
                        onClick = { activeMode = mode },
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = if (activeMode == mode) Color(0xFF10B981) else Color.LightGray
                        )
                    ) {
                        Text(
                            text = mode,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }
            
            // Shutter Control Row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                    modifier = Modifier.semantics(mergeDescendants = true) {
                        contentDescription = "Cancel camera viewfinder"
                    }
                ) {
                    Text("Cancel", color = Color.White)
                }
                
                // CameraX Shutter Ring Button
                IconButton(
                    onClick = {
                        isShutterFlashVisible = true
                        val tempFile = File.createTempFile("spresso_capture", ".jpg", context.cacheDir)
                        val outputOptions = ImageCapture.OutputFileOptions.Builder(tempFile).build()
                        
                        cameraController.takePicture(
                            outputOptions,
                            cameraExecutor,
                            object : ImageCapture.OnImageSavedCallback {
                                override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                                    val bytes = tempFile.readBytes()
                                    tempFile.delete()
                                    ContextCompat.getMainExecutor(context).execute {
                                        isShutterFlashVisible = false
                                        onImageCaptured(bytes)
                                    }
                                }
                                
                                override fun onError(exception: ImageCaptureException) {
                                    tempFile.delete()
                                    ContextCompat.getMainExecutor(context).execute {
                                        isShutterFlashVisible = false
                                    }
                                }
                            }
                        )
                    },
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color.White.copy(alpha = 0.9f), shape = CircleShape)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "Capture photo shutter"
                        }
                ) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .background(Color.Transparent, shape = CircleShape)
                            .padding(4.dp)
                            .background(Color.White, shape = CircleShape)
                    )
                }
            }
        }
    }
}
