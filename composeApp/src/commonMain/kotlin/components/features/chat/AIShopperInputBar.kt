package components.features.chat

import components.shared.AttachmentChipsBar
import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.animateContentSize
import components.core.MicButton

@Composable
fun AIShopperInputBar(
    onSend: (String) -> Unit, onOpenLiveCamera: (() -> Unit)? = null, onOpenObjectDetection: (() -> Unit)? = null,
    isVoiceActive: Boolean = false, isSpeaking: Boolean = false,
    isListening: Boolean = false, onToggleVoice: (() -> Unit)? = null, onStopVoice: (() -> Unit)? = null,
    isTyping: Boolean = false, placeholder: String = "Ask anything...", modifier: Modifier = Modifier
) {
    var text by remember { mutableStateOf("") }
    val dispatchSend = { if (text.isNotBlank()) { onSend(text); text = "" } }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AttachmentChipsBar(isTyping = isTyping, isVoiceActive = isVoiceActive, isSpeaking = isSpeaking, isListening = isListening, onStopVoice = onStopVoice ?: onToggleVoice)

        Surface(
            modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceContainerLowest, shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, if (isTyping) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outlineVariant), shadowElevation = if (isTyping) 4.dp else 1.dp
        ) {
            Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.Bottom) {
                IconButton(onClick = { onOpenLiveCamera?.invoke() }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Add, "Attach", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp, vertical = 8.dp)
                        .heightIn(min = 24.dp, max = 120.dp)
                        .animateContentSize(),
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (text.isEmpty()) {
                        Text(
                            text = if (isVoiceActive) "Listening or type..." else placeholder,
                            style = TextStyle(
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                            )
                        )
                    }
                    BasicTextField(
                        value = text,
                        onValueChange = { text = it },
                        modifier = Modifier.fillMaxWidth(),
                        textStyle = TextStyle(
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { dispatchSend() }),
                        minLines = 1,
                        maxLines = 6
                    )
                }
                if (onOpenObjectDetection != null) {
                    IconButton(onClick = onOpenObjectDetection, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Search, "Camera", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    }
                }

                if (text.isNotBlank()) {
                    Button(onClick = { dispatchSend() }, enabled = !isTyping, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary), modifier = Modifier.height(32.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.AutoMirrored.Filled.Send, null, modifier = Modifier.size(14.dp))
                            Text("Send", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                } else if (onToggleVoice != null) {
                    MicButton(isVoiceActive = isVoiceActive, isSpeaking = isSpeaking, isListening = isListening, isTyping = isTyping, onClick = onToggleVoice)
                }
            }
        }
    }
}


