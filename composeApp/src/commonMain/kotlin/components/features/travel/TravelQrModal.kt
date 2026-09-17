package components.features.travel

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import components.models.ItineraryEvent
import utils.PlatformUtils

@Composable
fun QrModal(
    activeQrModalEvent: ItineraryEvent,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    location: String = activeQrModalEvent.location,
    title: String = activeQrModalEvent.title,
    qrData: String = activeQrModalEvent.qrData.orEmpty(),
) {
    if (activeQrModalEvent.qrData.isNullOrBlank()) {
        // Production: If pass data is unavailable, handle it gracefully
        PassUnavailableModal(onClose)
        return
    }

    // Production: Maximize screen brightness for scanners
    DisposableEffect(Unit) {
        PlatformUtils.setScreenBrightness(1.0f)
        onDispose {
            PlatformUtils.setScreenBrightness(-1.0f) // Reset to system default
        }
    }

    Dialog(onDismissRequest = onClose) {
        Box(
            modifier =
                modifier
                    .width(320.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLowest)
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(24.dp))
                    .padding(24.dp),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = activeQrModalEvent.title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = activeQrModalEvent.location,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )

                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                            .padding(24.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val qrData = activeQrModalEvent.qrData
                        if (qrData != null) {
                            val qrBitmap = PlatformUtils.generateQrCode(qrData)
                            if (qrBitmap != null) {
                                Image(
                                    bitmap = qrBitmap,
                                    contentDescription = "QR Code for ${activeQrModalEvent.title}",
                                    modifier = Modifier.size(160.dp),
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.QrCode2,
                                    contentDescription = "Error generating pass",
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(140.dp),
                                )
                            }

                            Text(
                                text = qrData,
                                style =
                                    MaterialTheme.typography.labelSmall.copy(
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 10.sp,
                                        letterSpacing = 2.sp,
                                    ),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                TextButton(
                    onClick = onClose,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                ) {
                    Text(
                        text = "Close Pass",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                    )
                }
            }
        }
    }
}

@Composable
private fun PassUnavailableModal(onClose: () -> Unit) {
    Dialog(onDismissRequest = onClose) {
        Card(
            modifier = Modifier.width(300.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.QrCode2,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.size(48.dp),
                )
                Text(
                    text = "Pass Data Unavailable",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = "The digital pass for this event is currently not available. Please contact Spresso support.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    textAlign = TextAlign.Center,
                )
                Button(
                    onClick = onClose,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.onErrorContainer),
                ) {
                    Text("Dismiss")
                }
            }
        }
    }
}
