package com.spresso19

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.meta.wearable.dat.camera.Stream
import com.meta.wearable.dat.camera.addStream
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.display.Display
import com.meta.wearable.dat.display.addDisplay
import com.meta.wearable.dat.display.types.DisplayState
import com.meta.wearable.dat.display.views.ButtonStyle
import com.meta.wearable.dat.display.views.FlexBoxBackground
import com.meta.wearable.dat.display.views.IconName
import com.meta.wearable.dat.display.views.TextStyle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class SpressoWearablesService : Service() {
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var session: DeviceSession? = null
    private var stream: Stream? = null
    private var display: Display? = null
    private var webSocket: WebSocket? = null
    private var audioManager: AudioManager? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(1919, createNotification())
        setupAudioManager()
        setupWebSocket()
        setupWearables()
    }

    private fun setupAudioManager() {
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager?.startBluetoothSco()
        audioManager?.isBluetoothScoOn = true
    }

    private fun setupWebSocket() {
        val client = OkHttpClient()
        // Placeholder WebSocket connection simulating sending frames and audio to the Gemini Multimodal Live API
        val request = Request.Builder().url("wss://placeholder.gemini.multimodal.live.api").build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            // Placeholder listener
        })
    }

    private fun setupWearables() {
        // Wearables.initialize(this) is expected to be called in the Application class
        
        session = Wearables.createSession(AutoDeviceSelector()).getOrElse { error ->
            Log.e("SpressoWearables", "Failed to create session: $error")
            return
        }
        
        session?.let { currentSession ->
            serviceScope.launch {
                currentSession.state.collect { state ->
                    if (state == DeviceSessionState.STARTED) {
                        attachCapabilities(currentSession)
                    }
                }
            }
            currentSession.start()
        }
    }

    private fun attachCapabilities(currentSession: DeviceSession) {
        // 1. Add Display Capability
        currentSession.addDisplay().onSuccess { newDisplay ->
            display = newDisplay
            serviceScope.launch {
                newDisplay.state.collect { state ->
                    if (state == DisplayState.STARTED) {
                        newDisplay.sendContent {
                            flexBox(
                                gap = 12,
                                padding = 24,
                                background = FlexBoxBackground.CARD,
                            ) {
                                text("Gemini AI", style = TextStyle.HEADING)
                                text("Listening...", style = TextStyle.BODY)
                                button(
                                    label = "Stop",
                                    style = ButtonStyle.PRIMARY,
                                    onClick = { stopSelf() }
                                )
                            }
                        }
                    }
                }
            }
        }.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to add display: $error")
        }

        // 2. Add Camera Stream Capability
        currentSession.addStream(
            StreamConfiguration(videoQuality = VideoQuality.LOW, frameRate = 7)
        ).onSuccess { currentStream ->
            stream = currentStream
            currentStream.start().onFailure { error, _ ->
                Log.e("SpressoWearables", "Failed to start stream: $error")
            }

            serviceScope.launch {
                currentStream.videoStream.collect { frame ->
                    // Simulate sending frames to Gemini Multimodal Live API
                    // webSocket?.send(...) 
                }
            }
        }.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to add stream: $error")
        }
    }

    private fun createNotification(): Notification {
        val channelId = "spresso_wearables_channel"
        val channel = NotificationChannel(
            channelId,
            "Spresso Wearables Service",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Spresso Glasses Active")
            .setContentText("Connected to Meta Wearables & Gemini Live API")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        audioManager?.stopBluetoothSco()
        audioManager?.isBluetoothScoOn = false
        
        webSocket?.close(1000, "Service destroyed")
        
        stream?.stop()
        session?.stop()
        
        serviceScope.cancel()
    }
}
