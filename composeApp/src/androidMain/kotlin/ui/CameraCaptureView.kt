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
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.File
import java.util.concurrent.Executors

@Composable
fun CameraCaptureView(
    onImageCaptured: (ByteArray) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        hasCameraPermission = isGranted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    if (!hasCameraPermission) {
        CameraPermissionDialog(
            onRequestPermission = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            onOpenSettings = {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            },
            onDismiss = onDismiss
        )
        return
    }

    var isFrontLens by remember { mutableStateOf(false) }
    var flashMode by remember { mutableStateOf(ImageCapture.FLASH_MODE_OFF) }
    var activeMode by remember { mutableStateOf("PHOTO") }
    var zoomRatio by remember { mutableStateOf(1.0f) }
    var isShutterFlashVisible by remember { mutableStateOf(false) }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    val cameraController = remember {
        LifecycleCameraController(context).apply {
            bindToLifecycle(lifecycleOwner)
            setEnabledUseCases(CameraController.IMAGE_CAPTURE or CameraController.VIDEO_CAPTURE or CameraController.IMAGE_ANALYSIS)
            setImageAnalysisBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        }
    }

    LaunchedEffect(isFrontLens) {
        val targetSelector = if (isFrontLens) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        if (cameraController.hasCamera(targetSelector)) cameraController.cameraSelector = targetSelector
    }

    LaunchedEffect(Unit) { cameraController.setImageAnalysisAnalyzer(cameraExecutor) { imageProxy -> imageProxy.close() } }
    DisposableEffect(Unit) { onDispose { cameraExecutor.shutdown() } }

    Box(modifier = modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    controller = cameraController
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isShutterFlashVisible) Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.8f)))

        CameraTopBar(
            flashMode = flashMode, zoomRatio = zoomRatio, isFrontLens = isFrontLens,
            onToggleFlash = {
                flashMode = when (flashMode) {
                    ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
                    ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
                    else -> ImageCapture.FLASH_MODE_OFF
                }
                cameraController.imageCaptureFlashMode = flashMode
            },
            onSelectZoom = { ratio -> zoomRatio = ratio; cameraController.setZoomRatio(ratio) },
            onSwitchLens = { isFrontLens = !isFrontLens },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        CameraBottomBar(
            activeMode = activeMode, onModeSelected = { activeMode = it }, onDismiss = onDismiss,
            onCapturePhoto = {
                isShutterFlashVisible = true
                val tempFile = File.createTempFile("spresso_capture", ".jpg", context.cacheDir)
                val outputOptions = ImageCapture.OutputFileOptions.Builder(tempFile)
                    .setMetadata(ImageCapture.Metadata().apply { isReversedHorizontal = isFrontLens })
                    .build()

                cameraController.takePicture(
                    outputOptions, cameraExecutor,
                    object : ImageCapture.OnImageSavedCallback {
                        override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                            val bytes = tempFile.readBytes()
                            tempFile.delete()
                            ContextCompat.getMainExecutor(context).execute { isShutterFlashVisible = false; onImageCaptured(bytes) }
                        }

                        override fun onError(exception: ImageCaptureException) {
                            tempFile.delete()
                            ContextCompat.getMainExecutor(context).execute { isShutterFlashVisible = false }
                        }
                    }
                )
            },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
