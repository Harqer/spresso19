package components.features.chat

import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedCard
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

@Composable
actual fun VideoReviewCard(videoUrl: String, modifier: Modifier) {
    OutlinedCard(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        AndroidView(
            modifier = Modifier.fillMaxWidth().height(400.dp), // Vertical TikTok style
            factory = { context ->
                WebView(context).apply {
                    settings.javaScriptEnabled = isTrustedEmbed(videoUrl)
                    settings.domStorageEnabled = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    webViewClient = WebViewClient()
                    webChromeClient = WebChromeClient()
                    
                    tag = videoUrl
                    renderVideoUrl(this, videoUrl)
                }
            },
            update = { webView ->
                if (webView.tag != videoUrl) {
                    webView.tag = videoUrl
                    renderVideoUrl(webView, videoUrl)
                }
            }
        )
    }
}

private fun renderVideoUrl(webView: WebView, videoUrl: String) {
    if (!videoUrl.startsWith("https://")) {
        webView.loadData("", "text/html", "UTF-8")
        return
    }
    val htmlPrefix = """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                            <style>
                                body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000000; overflow: hidden; }
                                iframe, video { width: 100%; height: 100%; border: none; background: #000; }
                            </style>
                        </head>
                        <body>
                    """.trimIndent()
                    val htmlSuffix = "</body></html>"

    if (videoUrl.contains("youtube.com/watch") || videoUrl.contains("youtu.be/")) {
                        val videoId = if (videoUrl.contains("v=")) {
                            videoUrl.substringAfter("v=").substringBefore("&")
                        } else {
                            videoUrl.substringAfter("youtu.be/").substringBefore("?")
                        }
                        val iframe = "<iframe src=\"https://www.youtube.com/embed/$videoId?playsinline=1&autoplay=0\" allow=\"autoplay; fullscreen\" allowfullscreen></iframe>"
        val fullHtml = htmlPrefix + iframe + htmlSuffix
        webView.loadDataWithBaseURL("https://www.youtube.com", fullHtml, "text/html", "UTF-8", null)
    } else if (videoUrl.contains("tiktok.com")) {
                        val videoId = videoUrl.substringAfterLast("/").substringBefore("?")
                        val iframe = "<iframe src=\"https://www.tiktok.com/embed/v2/$videoId\" allow=\"autoplay; fullscreen\" allowfullscreen></iframe>"
        val fullHtml = htmlPrefix + iframe + htmlSuffix
        webView.loadDataWithBaseURL("https://www.tiktok.com", fullHtml, "text/html", "UTF-8", null)
    } else {
        val safeUrl = videoUrl.replace("&", "&amp;").replace("\"", "&quot;")
        val video = "<video controls playsinline preload=\"metadata\" src=\"$safeUrl\"></video>"
        webView.loadDataWithBaseURL(videoUrl, htmlPrefix + video + htmlSuffix, "text/html", "UTF-8", null)
    }
}

private fun isTrustedEmbed(videoUrl: String): Boolean =
    runCatching { android.net.Uri.parse(videoUrl).host?.lowercase() }
        .getOrNull()
        ?.let { host ->
            host == "youtube.com" || host.endsWith(".youtube.com") ||
                host == "youtu.be" || host == "tiktok.com" || host.endsWith(".tiktok.com")
        } == true
