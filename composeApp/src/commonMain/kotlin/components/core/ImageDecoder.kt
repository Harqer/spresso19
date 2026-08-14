package components.core

import components.models.*

import androidx.compose.ui.graphics.ImageBitmap

expect fun ByteArray.makeImageBitmap(): ImageBitmap
