package components.features.camera

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.video.Recording
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

private const val FRAME_SAMPLE_INTERVAL_MS = 1_000L

@SuppressLint("MissingPermission")
@Composable
fun CameraCaptureView(
    onImageCaptured: (ByteArray) -> Unit,
    onFrameCaptured: ((ByteArray) -> Unit)? = null,
    onVisionContextCaptured: ((String) -> Unit)? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    var hasAudioPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
    }

    val permissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            hasCameraPermission = permissions[Manifest.permission.CAMERA] ?: hasCameraPermission
            hasAudioPermission = permissions[Manifest.permission.RECORD_AUDIO] ?: hasAudioPermission
        }

    LaunchedEffect(Unit) {
        val permissionsToRequest = mutableListOf<String>()
        if (!hasCameraPermission) permissionsToRequest.add(Manifest.permission.CAMERA)
        if (!hasAudioPermission) permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        if (permissionsToRequest.isNotEmpty()) {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    if (!hasCameraPermission) {
        CameraPermissionDialog(
            onRequestPermission = { permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)) },
            onOpenSettings = {
                val intent =
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", context.packageName, null)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                context.startActivity(intent)
            },
            onDismiss = onDismiss,
        )
        return
    }

    var isFrontLens by remember { mutableStateOf(false) }
    var flashMode by remember { mutableStateOf(ImageCapture.FLASH_MODE_OFF) }
    var showGrid by remember { mutableStateOf(false) }
    var activeMode by remember { mutableStateOf("PHOTO") }
    var zoomRatio by remember { mutableStateOf(1.0f) }
    var isShutterFlashVisible by remember { mutableStateOf(false) }

    // Recording state
    var isRecording by remember { mutableStateOf(false) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }

    val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    val cameraController =
        remember {
            LifecycleCameraController(context).apply {
                bindToLifecycle(lifecycleOwner)
                setEnabledUseCases(CameraController.IMAGE_CAPTURE or CameraController.VIDEO_CAPTURE or CameraController.IMAGE_ANALYSIS)
                setImageAnalysisBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                isPinchToZoomEnabled = true
                isTapToFocusEnabled = true
            }
        }

    LaunchedEffect(isFrontLens) {
        val targetSelector = if (isFrontLens) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        cameraController.cameraSelector = targetSelector
    }

    val objectDetector =
        remember {
            val options =
                com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
                    .Builder()
                    .setDetectorMode(com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions.STREAM_MODE)
                    .enableMultipleObjects()
                    .build()
            com.google.mlkit.vision.objects.ObjectDetection
                .getClient(options)
        }

    val imageLabeler =
        remember {
            com.google.mlkit.vision.label.defaults.ImageLabelerOptions.DEFAULT_OPTIONS.let {
                com.google.mlkit.vision.label.ImageLabeling.getClient(it)
            }
        }

    var detectedObjects by remember { mutableStateOf<List<com.google.mlkit.vision.objects.DetectedObject>>(emptyList()) }

    LaunchedEffect(Unit) {
        cameraController.setImageAnalysisAnalyzer(
            ContextCompat.getMainExecutor(context),
            androidx.camera.mlkit.vision.MlKitAnalyzer(
                listOf(objectDetector),
                androidx.camera.core.ImageAnalysis.COORDINATE_SYSTEM_VIEW_REFERENCED,
                ContextCompat.getMainExecutor(context),
            ) { result ->
                val objects = result?.getValue(objectDetector)
                if (objects != null) {
                    detectedObjects = objects
                } else {
                    detectedObjects = emptyList()
                }
            },
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            activeRecording?.stop()
            cameraExecutor.shutdown()
            objectDetector.close()
            imageLabeler.close()
        }
    }

    var previewView by remember { mutableStateOf<PreviewView?>(null) }

    LaunchedEffect(onFrameCaptured, onVisionContextCaptured) {
        if (onFrameCaptured == null && onVisionContextCaptured == null) return@LaunchedEffect
        while (isActive) {
            kotlinx.coroutines.delay(FRAME_SAMPLE_INTERVAL_MS)
            previewView?.bitmap?.let { bmp ->
                onFrameCaptured?.let { callback ->
                    val stream = java.io.ByteArrayOutputStream()
                    bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, stream)
                    callback(stream.toByteArray())
                }
                onVisionContextCaptured?.let { callback ->
                    val image = com.google.mlkit.vision.common.InputImage.fromBitmap(bmp, 0)
                    imageLabeler.process(image)
                        .addOnSuccessListener { labels ->
                            val context = labels
                                .sortedByDescending { it.confidence }
                                .take(5)
                                .filter { it.confidence >= 0.55f }
                                .joinToString(", ") { "${it.text} (${(it.confidence * 100).toInt()}%)" }
                            if (context.isNotBlank()) callback(context)
                        }
                }
            }
        }
    }

    val galleryLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) {
                coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                    val inputStream = context.contentResolver.openInputStream(uri)
                    val bytes = inputStream?.readBytes()
                    if (bytes != null) onImageCaptured(bytes)
                }
            }
        }

    Box(modifier = modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    controller = cameraController
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    previewView = this
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        ObjectDetectionOverlay(detectedObjects = detectedObjects)

        if (showGrid) {
            CameraGridOverlay()
        }

        if (isShutterFlashVisible) Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.8f)))

        CameraTopBar(
            flashMode = flashMode,
            showGrid = showGrid,
            isFrontLens = isFrontLens,
            onClose = onDismiss,
            onToggleFlash = {
                flashMode =
                    when (flashMode) {
                        ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
                        ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
                        else -> ImageCapture.FLASH_MODE_OFF
                    }
                cameraController.imageCaptureFlashMode = flashMode
            },
            onToggleGrid = { showGrid = !showGrid },
            onSwitchLens = { isFrontLens = !isFrontLens },
            modifier = Modifier.align(Alignment.TopCenter),
        )

        CameraBottomBar(
            activeMode = activeMode,
            isRecording = isRecording,
            zoomRatio = zoomRatio,
            onSelectZoom = { ratio ->
                zoomRatio = ratio
                cameraController.setZoomRatio(ratio)
            },
            onModeSelected = {
                if (!isRecording) activeMode = it
            },
            onGalleryClick = {
                galleryLauncher.launch("image/*")
            },
            onToggleRecordVideo = {
                activeRecording =
                    CameraCaptureActions.toggleVideoRecording(
                        context = context,
                        cameraController = cameraController,
                        isRecording = isRecording,
                        activeRecording = activeRecording,
                        hasAudioPermission = hasAudioPermission,
                        onRecordingStarted = { isRecording = true },
                        onRecordingStopped = { isRecording = false },
                        onVideoCaptured = { onImageCaptured(it) },
                    )
            },
            onCapturePhoto = {
                CameraCaptureActions.capturePhoto(
                    context = context,
                    cameraController = cameraController,
                    cameraExecutor = cameraExecutor,
                    isFrontLens = isFrontLens,
                    onShutter = { isShutterFlashVisible = true },
                    onImageCaptured = onImageCaptured,
                    onComplete = { isShutterFlashVisible = false },
                )
            },
            modifier = Modifier.align(Alignment.BottomCenter),
        )

        androidx.compose.material3.SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 120.dp),
        )
    }
}
