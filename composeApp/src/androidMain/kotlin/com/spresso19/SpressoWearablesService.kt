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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import org.json.JSONObject
import org.json.JSONArray

class SpressoWearablesService : Service() {
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var session: DeviceSession? = null
    private var stream: Stream? = null
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
        val backendUrl = network.SpressoConfig.backendBaseUrl.replace("http", "ws")
        val url = "$backendUrl/api/live-chef"
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("SpressoWearables", "Gemini WebSocket Opened to Backend proxy")
                // No setup message needed; backend handles setup and tool declarations securely
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("SpressoWearables", "Gemini text msg: $text")
                try {
                    val json = JSONObject(text)
                    if (json.has("type") && json.getString("type") == "functionCall") {
                        val functionName = json.getString("functionName")
                        handleIntentRouting(functionName)
                    }
                } catch (e: Exception) {
                    Log.e("SpressoWearables", "Error parsing JSON: ", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("SpressoWearables", "Gemini WebSocket Error", t)
            }
        })
    }

    private fun handleIntentRouting(functionName: String) {
        Log.i("SpressoWearables", "Routing Intent: $functionName")
        when (functionName) {
            "startCookingAssistance" -> {
                Log.i("SpressoWearables", "Executing Cooking Agent with Safeguard...")
                // SAFEGUARD: Do not blindly execute device-level actions.
                // Broadcast a confirmation intent to require explicit user consent in the UI.
                val intent = Intent("com.spresso19.intent.action.CONFIRM_START_COOKING")
                sendBroadcast(intent)
            }
            "startGroceryScanner" -> {
                Log.i("SpressoWearables", "Executing Grocery Scanner with Safeguard...")
                // SAFEGUARD: Do not blindly execute device-level actions.
                val intent = Intent("com.spresso19.intent.action.CONFIRM_START_GROCERY")
                sendBroadcast(intent)
            }
            else -> {
                Log.w("SpressoWearables", "Rejected unauthorized function call: $functionName")
            }
        }
    }

    private fun setupWearables() {
        Wearables.initialize(this).onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to initialize Wearables: ${error.description}")
        }
        
        session = Wearables.createSession(AutoDeviceSelector()).getOrElse { error ->
            Log.e("SpressoWearables", "Failed to create session: $error")
            return
        }
        
        session?.let { currentSession ->
            serviceScope.launch {
                currentSession.state.collect { state ->
                    Log.i("SpressoWearables", "Session state: $state")
                    if (state == DeviceSessionState.STARTED) {
                        attachCapabilities(currentSession)
                    }
                }
            }
            currentSession.start()
        }
    }

    private fun attachCapabilities(currentSession: DeviceSession) {
        // Add Camera Stream Capability
        currentSession.addStream(
            StreamConfiguration(videoQuality = VideoQuality.MEDIUM, frameRate = 24)
        ).onSuccess { currentStream ->
            stream = currentStream
            currentStream.start().onFailure { error, _ ->
                Log.e("SpressoWearables", "Failed to start stream: $error")
            }

            serviceScope.launch {
                currentStream.videoStream.collect { frame ->
                    // Send actual frames to Gemini Multimodal Live API
                    try {
                        val message = JSONObject().apply {
                            put("type", "video")
                            put("video", android.util.Base64.encodeToString(frame.buffer.array(), android.util.Base64.NO_WRAP))
                        }
                        webSocket?.send(message.toString())
                    } catch (e: Exception) {
                        Log.e("SpressoWearables", "Frame send error", e)
                    }
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
            .setContentText("Connected to Smart Glasses")
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
