package ui

import androidx.compose.material3.MaterialTheme

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
import androidx.camera.core.ImageCaptureException
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Recording
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.camera.view.video.AudioConfig
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.border
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.File
import java.util.concurrent.Executors

@SuppressLint("MissingPermission")
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
    var hasAudioPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
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
    var showGrid by remember { mutableStateOf(false) }
    var activeMode by remember { mutableStateOf("PHOTO") }
    var zoomRatio by remember { mutableStateOf(1.0f) }
    var isShutterFlashVisible by remember { mutableStateOf(false) }
    
    // Recording state
    var isRecording by remember { mutableStateOf(false) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }
    
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    val cameraController = remember {
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

    val objectDetector = remember {
        val options = com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions.Builder()
            .setDetectorMode(com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions.STREAM_MODE)
            .enableMultipleObjects()
            .build()
        com.google.mlkit.vision.objects.ObjectDetection.getClient(options)
    }

    var detectedObjects by remember { mutableStateOf<List<com.google.mlkit.vision.objects.DetectedObject>>(emptyList()) }

    LaunchedEffect(Unit) { 
        cameraController.setImageAnalysisAnalyzer(
            ContextCompat.getMainExecutor(context),
            androidx.camera.mlkit.vision.MlKitAnalyzer(
                listOf(objectDetector),
                androidx.camera.core.ImageAnalysis.COORDINATE_SYSTEM_VIEW_REFERENCED,
                ContextCompat.getMainExecutor(context)
            ) { result ->
                val objects = result?.getValue(objectDetector)
                if (objects != null) {
                    detectedObjects = objects
                } else {
                    detectedObjects = emptyList()
                }
            }
        )
    }
    
    DisposableEffect(Unit) { 
        onDispose { 
            activeRecording?.stop()
            cameraExecutor.shutdown() 
            objectDetector.close()
        } 
    }

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

        val primaryColor = MaterialTheme.colorScheme.primary
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
            detectedObjects.forEach { obj ->
                val box = obj.boundingBox
                drawRect(
                    color = primaryColor,
                    topLeft = androidx.compose.ui.geometry.Offset(box.left.toFloat(), box.top.toFloat()),
                    size = androidx.compose.ui.geometry.Size(box.width().toFloat(), box.height().toFloat()),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 6f),
                    alpha = 0.8f
                )
            }
        }

        if (showGrid) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                }
                Row(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                }
                Row(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                }
            }
        }

        if (isShutterFlashVisible) Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.8f)))

        CameraTopBar(
            flashMode = flashMode, showGrid = showGrid, isFrontLens = isFrontLens,
            onClose = onDismiss,
            onToggleFlash = {
                flashMode = when (flashMode) {
                    ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
                    ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
                    else -> ImageCapture.FLASH_MODE_OFF
                }
                cameraController.imageCaptureFlashMode = flashMode
            },
            onToggleGrid = { showGrid = !showGrid },
            onSwitchLens = { isFrontLens = !isFrontLens },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        CameraBottomBar(
            activeMode = activeMode, 
            isRecording = isRecording,
            zoomRatio = zoomRatio,
            onSelectZoom = { ratio -> zoomRatio = ratio; cameraController.setZoomRatio(ratio) },
            onModeSelected = { 
                if (!isRecording) activeMode = it 
            }, 
            onGalleryClick = {
                // In future, launch image picker here
            },
            onToggleRecordVideo = {
                if (isRecording) {
                    activeRecording?.stop()
                    activeRecording = null
                } else {
                    val tempFile = File.createTempFile("spresso_video", ".mp4", context.cacheDir)
                    val outputOptions = FileOutputOptions.Builder(tempFile).build()
                    val audioConfig = AudioConfig.create(hasAudioPermission)
                    
                    val recording = cameraController.startRecording(
                        outputOptions,
                        audioConfig,
                        ContextCompat.getMainExecutor(context)
                    ) { event ->
                        when (event) {
                            is VideoRecordEvent.Start -> {
                                isRecording = true
                            }
                            is VideoRecordEvent.Finalize -> {
                                isRecording = false
                                if (!event.hasError()) {
                                    val bytes = tempFile.readBytes()
                                    tempFile.delete()
                                    onImageCaptured(bytes) // We use the same callback for simplicity to upload
                                } else {
                                    tempFile.delete()
                                }
                            }
                        }
                    }
                    activeRecording = recording
                }
            },
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
