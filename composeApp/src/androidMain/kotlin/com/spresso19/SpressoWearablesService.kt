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

    // Fallback if not injected via BuildConfig
    private val apiKey = "AIzaSy_YOUR_API_KEY_HERE"

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
        val url = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.BidiService/BidiGenerateContent?key=$apiKey"
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("SpressoWearables", "Gemini WebSocket Opened")
                
                // Send setup message with the correct model and tool declarations
                val setupMessage = JSONObject().apply {
                    put("setup", JSONObject().apply {
                        put("model", "models/gemini-2.0-flash-exp")
                        put("systemInstruction", JSONObject().apply {
                            put("parts", JSONArray().apply {
                                put(JSONObject().apply {
                                    put("text", "You are Spresso, an AI personal shopper and cooking assistant. Use the provided tools when the user asks for cooking assistance or grocery scanning.")
                                })
                            })
                        })
                        put("tools", JSONArray().apply {
                            put(JSONObject().apply {
                                put("functionDeclarations", JSONArray().apply {
                                    put(JSONObject().apply {
                                        put("name", "startCookingAssistance")
                                        put("description", "Execute this function when the user asks for cooking assistance, recipes, or chef help.")
                                    })
                                    put(JSONObject().apply {
                                        put("name", "startGroceryScanner")
                                        put("description", "Execute this function when the user asks to scan groceries or start a shopping list.")
                                    })
                                })
                            })
                        })
                    })
                }
                webSocket.send(setupMessage.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("SpressoWearables", "Gemini text msg: $text")
                try {
                    val json = JSONObject(text)
                    if (json.has("serverContent")) {
                        val serverContent = json.getJSONObject("serverContent")
                        if (serverContent.has("modelTurn")) {
                            val parts = serverContent.getJSONObject("modelTurn").getJSONArray("parts")
                            for (i in 0 until parts.length()) {
                                val part = parts.getJSONObject(i)
                                if (part.has("functionCall")) {
                                    val functionCall = part.getJSONObject("functionCall")
                                    val functionName = functionCall.getString("name")
                                    handleIntentRouting(functionName)
                                }
                            }
                        }
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
                Log.i("SpressoWearables", "Executing Cooking Agent...")
                // In a real implementation, we would broadcast this intent to the UI
                // so the Compose layer can navigate to the ChefAssistancePage
                val intent = Intent("com.spresso19.intent.action.START_COOKING")
                sendBroadcast(intent)
            }
            "startGroceryScanner" -> {
                Log.i("SpressoWearables", "Executing Grocery Scanner...")
                val intent = Intent("com.spresso19.intent.action.START_GROCERY")
                sendBroadcast(intent)
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
                            put("realtimeInput", JSONObject().apply {
                                put("mediaChunks", JSONArray().apply {
                                    put(JSONObject().apply {
                                        put("mimeType", "image/jpeg")
                                        put("data", android.util.Base64.encodeToString(frame.buffer.array(), android.util.Base64.NO_WRAP))
                                    })
                                })
                            })
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
