package components.features.onboarding

import android.net.Uri
import android.widget.VideoView
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@Composable
actual fun SplashVideoPlayer(modifier: Modifier) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            VideoView(context).apply {
                val resId = context.resources.getIdentifier("splash_video", "raw", context.packageName)
                setVideoURI(Uri.parse("android.resource://${context.packageName}/$resId"))
                setOnPreparedListener { mp ->
                    mp.isLooping = true
                    start()
                }
            }
        },
    )
}
