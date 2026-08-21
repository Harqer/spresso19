package components.features.chat.widgets

import components.models.*

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import components.features.chat.ChatBubbleText
import components.features.chat.ChatMessageHeader
import components.features.chat.ChatProductCard
import network.ChatMessage
import network.ProductItem
import io.ktor.client.HttpClient
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
    modifier: Modifier = Modifier
) {
    val isUser = message.isUser
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }
    AnimatedVisibility(
        visible = visible,
        enter = androidx.compose.animation.slideInVertically(
            initialOffsetY = { 50 },
            animationSpec = androidx.compose.animation.core.tween(300)
        ) + androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            ChatMessageHeader(isUser = isUser, timestamp = message.timestamp)
            val biometricMatch = "\\[BIOMETRIC_CHECKOUT:(.*?)\\]".toRegex().find(message.text)
            val orderId = biometricMatch?.groupValues?.get(1)
            val displayText = if (biometricMatch != null) {
                message.text.replace(biometricMatch.value, "").trim()
            } else {
                message.text
            }

            ChatBubbleText(
                text = displayText,
                isUser = isUser,
                thought = message.thought,
                sources = message.sources,
                mediaUrl = message.mediaUrl,
                mediaType = message.mediaType,
                isStreaming = isGenerating && isLastMessage && !isUser,
                httpClient = httpClient
            )

            if (orderId != null && !isGenerating) {
                val passkeyRegistrar = components.features.auth.rememberPasskeyRegistrar()
                val coroutineScope = rememberCoroutineScope()
                var purchaseStatus by remember { mutableStateOf<String?>(null) }
                
                val authenticatingStr = stringResource(Res.string.auth_authenticating)
                val confirmedStr = stringResource(Res.string.auth_purchase_confirmed)
                val failedStr = stringResource(Res.string.auth_failed_to_confirm)
                val errorStr = stringResource(Res.string.auth_error)
                val confirmPasskeyStr = stringResource(Res.string.auth_confirm_purchase_passkey)

                Box(modifier = Modifier.padding(start = 32.dp, top = 8.dp).fillMaxWidth()) {
                    androidx.compose.material3.Button(
                        onClick = {
                            coroutineScope.launch {
                                purchaseStatus = authenticatingStr
                                try {
                                    val success = passkeyRegistrar.authenticateWithPasskey(orderId)
                                    purchaseStatus = if (success) confirmedStr else failedStr
                                } catch (e: Exception) {
                                    purchaseStatus = "$errorStr${e.message}"
                                }
                            }
                        },
                        enabled = purchaseStatus == null || purchaseStatus == failedStr || purchaseStatus?.startsWith(errorStr) == true
                    ) {
                        androidx.compose.material3.Text(purchaseStatus ?: confirmPasskeyStr)
                    }
                }
            }

            if (message.products.isNotEmpty()) {
                Box(modifier = Modifier.padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp).fillMaxWidth()) {

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        maxItemsInEachRow = 2,
                        itemVerticalAlignment = Alignment.Top,
                        overflow = androidx.compose.foundation.layout.FlowRowOverflow.Visible
                    ) {
                        message.products.forEach { product ->
                            Box(modifier = Modifier.widthIn(max = 240.dp).fillMaxWidth(0.48f)) {
                                ChatProductCard(
                                    product = product,
                                    onAddToCart = onAddToCart,
                                    onSelectTryOn = onSelectTryOn,
                                    httpClient = httpClient
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
                        modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)
                    )
                }
            }
        }
    }
}
