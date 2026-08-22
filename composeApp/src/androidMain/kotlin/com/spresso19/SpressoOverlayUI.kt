package com.spresso19

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandIn
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp

@Composable
fun OverlayContent(
    onClose: () -> Unit,
    onExpand: () -> Unit,
    onBookmark: () -> Unit = {},
    onTryOn: () -> Unit = {},
    onSearch: () -> Unit = {},
) {
    var expanded by remember { mutableStateOf(false) }
    var path by remember { mutableStateOf(Path()) }
    var isDrawing by remember { mutableStateOf(false) }
    var showOptions by remember { mutableStateOf(false) }
    val pathPoints = remember { mutableStateListOf<Offset>() }

    if (!expanded) {
        FloatingActionButton(
            onClick = {
                expanded = true
                onExpand()
            },
            modifier = Modifier.padding(16.dp),
            shape = CircleShape,
            containerColor = Color.White,
        ) {
            Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.Black)
        }
    }

    AnimatedVisibility(
        visible = expanded,
        enter = fadeIn() + expandIn(expandFrom = Alignment.TopStart),
        exit = fadeOut() + shrinkOut(shrinkTowards = Alignment.TopStart),
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .pointerInput(Unit) {
                        detectDragGestures(
                            onDragStart = { offset ->
                                isDrawing = true
                                showOptions = false
                                pathPoints.clear()
                                pathPoints.add(offset)
                                path = Path().apply { moveTo(offset.x, offset.y) }
                            },
                            onDrag = { change, _ ->
                                pathPoints.add(change.position)
                                path.lineTo(change.position.x, change.position.y)
                                change.consume()
                            },
                            onDragEnd = {
                                isDrawing = false
                                if (pathPoints.size > 2) {
                                    path.close()
                                    showOptions = true
                                }
                            },
                        )
                    },
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawPath(
                    path = path,
                    color = Color.White,
                    style =
                        Stroke(
                            width = 8.dp.toPx(),
                            cap = StrokeCap.Round,
                            join = StrokeJoin.Round,
                        ),
                )
                // Add glow effect
                drawPath(
                    path = path,
                    color = Color.White.copy(alpha = 0.3f),
                    style =
                        Stroke(
                            width = 16.dp.toPx(),
                            cap = StrokeCap.Round,
                            join = StrokeJoin.Round,
                        ),
                )
            }

            if (showOptions) {
                Surface(
                    modifier =
                        Modifier
                            .align(Alignment.BottomCenter)
                            .padding(32.dp),
                    shape = CircleShape,
                    color = Color.White,
                ) {
                    Row(modifier = Modifier.padding(8.dp)) {
                        IconButton(onClick = {
                            onBookmark()
                            onClose()
                        }) {
                            Icon(Icons.Default.Bookmark, "Bookmark", tint = Color.Black)
                        }
                        IconButton(onClick = {
                            onTryOn()
                            onClose()
                        }) {
                            Icon(Icons.Default.Check, "Try On", tint = Color.Black)
                        }
                        IconButton(onClick = {
                            onSearch()
                            onClose()
                        }) {
                            Icon(Icons.Default.Search, "Search", tint = Color.Black)
                        }
                    }
                }
            }

            IconButton(
                onClick = onClose,
                modifier =
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(32.dp)
                        .background(Color.White, CircleShape),
            ) {
                Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.Black)
            }
        }
    }
}

@androidx.compose.ui.tooling.preview.Preview(showBackground = true)
@Composable
fun OverlayContentPreview() {
    androidx.compose.material3.MaterialTheme {
        OverlayContent(onClose = {}, onExpand = {})
    }
}
