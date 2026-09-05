package components.features.chat.widgets

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.chat.ChatBubbleText
import components.features.chat.ChatMessageHeader
import components.features.chat.ChatProductCard
import components.features.chat.VideoReviewCard
import components.core.NetworkImage
import components.models.*
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ChatMessage
import network.ProductItem
import org.jetbrains.compose.resources.stringResource
import spresso.composeapp.generated.resources.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChatMessageItem(
    message: ChatMessage,
    isGenerating: Boolean,
    isLastMessage: Boolean,
    onAddToCart: (ProductItem) -> Unit,
    onSelectTryOn: (ProductItem) -> Unit,
    httpClient: HttpClient?,
    apiClient: network.ApiClient? = null,
    modifier: Modifier = Modifier,
) {
    val isUser = message.isUser
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }
    AnimatedVisibility(
        visible = visible,
        enter =
            androidx.compose.animation.slideInVertically(
                initialOffsetY = { 50 },
                animationSpec =
                    androidx.compose.animation.core
                        .tween(300),
            ) +
                androidx.compose.animation.fadeIn(
                    animationSpec =
                        androidx.compose.animation.core
                            .tween(300),
                ),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            ChatMessageHeader(isUser = isUser, timestamp = message.timestamp)
            val biometricMatch = "\\[BIOMETRIC_CHECKOUT:(.*?)\\]".toRegex().find(message.text)
            val orderId = biometricMatch?.groupValues?.get(1)
            val displayText =
                if (biometricMatch != null) {
                    message.text.replace(biometricMatch.value, "").trim()
                } else {
                    message.text
                }

            val videoUrlRegex = "(https?://(?:www\\.)?(?:tiktok\\.com|youtube\\.com|youtu\\.be)[^\\s]+)".toRegex()
            val videoMatch = videoUrlRegex.find(displayText)
            val videoUrl = videoMatch?.value

            ChatBubbleText(
                text = displayText,
                isUser = isUser,
                thought = message.thought,
                sources = message.sources,
                mediaUrl = message.mediaUrl,
                mediaType = message.mediaType,
                isStreaming = isGenerating && isLastMessage && !isUser,
                httpClient = httpClient,
            )

            message.mediaUrl?.takeIf { it.isNotBlank() }?.let { mediaUrl ->
                Box(
                    modifier = Modifier
                        .padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp)
                        .fillMaxWidth(),
                ) {
                    if (message.mediaType?.startsWith("video", ignoreCase = true) == true) {
                        VideoReviewCard(videoUrl = mediaUrl, modifier = Modifier.fillMaxWidth())
                    } else if (httpClient != null) {
                        NetworkImage(
                            url = mediaUrl,
                            client = httpClient,
                            contentDescription = "Generated result",
                            modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                        )
                    }
                }
            }

            if (videoUrl != null && !isGenerating) {
                Box(modifier = Modifier.padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp).fillMaxWidth()) {
                    VideoReviewCard(videoUrl = videoUrl)
                }
            }

            if (message.products.isNotEmpty()) {
                Box(modifier = Modifier.padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp).fillMaxWidth()) {
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        maxItemsInEachRow = 2,
                    ) {
                        message.products.forEach { product ->
                            Box(modifier = Modifier.widthIn(max = 240.dp).fillMaxWidth(0.48f)) {
                                ChatProductCard(
                                    product = product,
                                    onAddToCart = onAddToCart,
                                    onSelectTryOn = onSelectTryOn,
                                    httpClient = httpClient,
                                )
                            }
                        }
                    }
                }
            }
            if (message.widget == "GROCERY_LIST") {
                Box(modifier = Modifier.padding(top = 12.dp).fillMaxWidth()) {
                    components.features.grocery.components.GroceryListWidget(
                        apiClient = apiClient ?: network.ApiClient(),
                        modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp),
                    )
                }
            }
        }
    }
}
