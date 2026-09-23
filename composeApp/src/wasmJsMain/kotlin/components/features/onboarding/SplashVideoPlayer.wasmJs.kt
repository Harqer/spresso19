package components.features.onboarding

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import kotlinx.browser.document
import org.w3c.dom.HTMLVideoElement
import org.w3c.dom.events.Event

/**
 * Web splash video: embeds the brand MP4 (shipped as a common compose resource)
 * in a native HTMLVideoElement and keeps it looping for the splash duration.
 * Media3 has no Wasm target, so the browser's own decoder plays the video.
 */
@OptIn(androidx.compose.ui.ExperimentalComposeUiApi::class)
@Composable
actual fun SplashVideoPlayer(modifier: Modifier) {
    val video =
        remember {
            (document.createElement("video") as HTMLVideoElement).apply {
                src = "splash_video.mp4"
                loop = true
                muted = true
                playsInline = true
                autoplay = true
                style.position = "absolute"
                style.top = "0"
                style.left = "0"
                style.width = "100%"
                style.height = "100%"
                style.objectFit = "cover"
                style.border = "none"
            }
        }

    DisposableEffect(video) {
        // Autoplay may be blocked by browser policy; the splash still completes on
        // its timer, so a rejected play() is only a silent brand-moment loss.
        video
            .play()
            .catch { _: JsAny -> null }
        document.body?.appendChild(video)
        val onFailure: (Event) -> Unit = { video.style.display = "none" }
        video.addEventListener("error", onFailure)
        onDispose {
            video.removeEventListener("error", onFailure)
            video.pause()
            video.removeAttribute("src")
            video.load()
            video.remove()
        }
    }

    Box(modifier = modifier.fillMaxSize())
}
