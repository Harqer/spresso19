package components.features.camera

import android.content.Context
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Recording
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.video.AudioConfig
import androidx.core.content.ContextCompat
import java.io.File
import java.util.concurrent.ExecutorService

object CameraCaptureActions {
    fun capturePhoto(
        context: Context,
        cameraController: LifecycleCameraController,
        cameraExecutor: ExecutorService,
        isFrontLens: Boolean,
        onShutter: () -> Unit,
        onImageCaptured: (ByteArray) -> Unit,
        onComplete: () -> Unit
    ) {
        onShutter()
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
                    ContextCompat.getMainExecutor(context).execute { 
                        onImageCaptured(bytes)
                        onComplete()
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    tempFile.delete()
                    ContextCompat.getMainExecutor(context).execute { onComplete() }
                }
            }
        )
    }

    @android.annotation.SuppressLint("MissingPermission")
    fun toggleVideoRecording(
        context: Context,
        cameraController: LifecycleCameraController,
        isRecording: Boolean,
        activeRecording: Recording?,
        hasAudioPermission: Boolean,
        onRecordingStarted: () -> Unit,
        onRecordingStopped: () -> Unit,
        onVideoCaptured: (ByteArray) -> Unit
    ): Recording? {
        if (isRecording) {
            activeRecording?.stop()
            return null
        } else {
            val tempFile = File.createTempFile("spresso_video", ".mp4", context.cacheDir)
            val outputOptions = FileOutputOptions.Builder(tempFile).build()
            val audioConfig = AudioConfig.create(hasAudioPermission)
            
            return cameraController.startRecording(
                outputOptions,
                audioConfig,
                ContextCompat.getMainExecutor(context)
            ) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        onRecordingStarted()
                    }
                    is VideoRecordEvent.Finalize -> {
                        onRecordingStopped()
                        if (!event.hasError()) {
                            val bytes = tempFile.readBytes()
                            tempFile.delete()
                            onVideoCaptured(bytes)
                        } else {
                            tempFile.delete()
                        }
                    }
                }
            }
        }
    }
}
