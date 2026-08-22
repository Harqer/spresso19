package components.features.vision

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import components.features.camera.CameraPermissionDialog
import components.features.camera.ObjectDetectionOverlay
import java.io.ByteArrayOutputStream

@SuppressLint("MissingPermission")
@Composable
actual fun LiveVisionCamera(
    onObjectDetected: (ByteArray, List<List<Float>>) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }

    val permissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            hasCameraPermission = isGranted
        }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (!hasCameraPermission) {
        CameraPermissionDialog(
            onRequestPermission = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            onOpenSettings = {
                val intent =
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", context.packageName, null)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                context.startActivity(intent)
            },
            onDismiss = { },
        )
        return
    }

    val cameraController =
        remember {
            LifecycleCameraController(context).apply {
                bindToLifecycle(lifecycleOwner)
                cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                setEnabledUseCases(CameraController.IMAGE_ANALYSIS)
                setImageAnalysisBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            }
        }

    val objectDetector =
        remember {
            val options =
                ObjectDetectorOptions
                    .Builder()
                    .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
                    .enableMultipleObjects()
                    .build()
            ObjectDetection.getClient(options)
        }

    var detectedObjects by remember { mutableStateOf<List<com.google.mlkit.vision.objects.DetectedObject>>(emptyList()) }
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var lastEmittedTime by remember { mutableStateOf(0L) }

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

                    if (objects.isNotEmpty()) {
                        val currentTime = System.currentTimeMillis()
                        // Throttle to 1 frame every 3 seconds to avoid spamming the backend
                        if (currentTime - lastEmittedTime > 3000) {
                            lastEmittedTime = currentTime
                            previewView?.bitmap?.let { bmp ->
                                val stream = ByteArrayOutputStream()
                                bmp.compress(Bitmap.CompressFormat.JPEG, 60, stream)
                                val boundingBoxes =
                                    objects.map { obj ->
                                        val b = obj.boundingBox
                                        listOf(b.left.toFloat(), b.top.toFloat(), b.right.toFloat(), b.bottom.toFloat())
                                    }
                                onObjectDetected(stream.toByteArray(), boundingBoxes)
                            }
                        }
                    }
                } else {
                    detectedObjects = emptyList()
                }
            },
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            objectDetector.close()
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
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
    }
}
