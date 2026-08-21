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
import com.meta.wearable.dat.camera.removeStream
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.RegistrationState
import com.meta.wearable.dat.display.Display
import com.meta.wearable.dat.display.addDisplay
import com.meta.wearable.dat.display.removeDisplay
import com.meta.wearable.dat.display.types.DisplayState
import com.meta.wearable.dat.display.views.FlexBoxBackground
import com.meta.wearable.dat.display.views.TextStyle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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
    private var display: Display? = null
    private var webSocket: WebSocket? = null
    private var audioManager: AudioManager? = null
    private var audioRecorder: audio.AudioRecorder? = null
    private var audioPlayer: audio.AudioPlayer? = null

    
    override fun onBind(intent: Intent?): IBinder? = null


    companion object {
        // Singleton OkHttpClient shared across all service instances — prevents socket exhaustion
        private val okHttpClient: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS) // No timeout for WebSocket
                .build()
        }
    }

    private var isInitialized = false
    private var currentAction: String? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        currentAction = intent?.action
        if (!isInitialized) {
            isInitialized = true
            setupAudioManager()
            setupWebSocket()
            setupWearables()
            setupAudioRecorder()
            audioPlayer = audio.AudioPlayer()
        } else {
            webSocket?.close(1000, "Action changed")
            webSocket = null
            setupWebSocket()
        }
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onCreate() {
        super.onCreate()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            startForeground(
                1919, 
                createNotification(), 
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(1919, createNotification())
        }
    }

    private fun setupAudioRecorder() {
        audioRecorder = audio.AudioRecorder().apply {
            onAudioChunk = { chunk ->
                val base64Data = android.util.Base64.encodeToString(chunk, android.util.Base64.NO_WRAP)
                val message = JSONObject().apply {
                    put("realtimeInput", JSONObject().apply {
                        put("mediaChunks", JSONArray().apply {
                            put(JSONObject().apply {
                                put("mimeType", "audio/pcm;rate=16000")
                                put("data", base64Data)
                            })
                        })
                    })
                }
                webSocket?.send(message.toString())
            }
        }
    }


    private fun setupAudioManager() {
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            val devices = audioManager?.availableCommunicationDevices ?: emptyList()
            val bluetoothDevice = devices.firstOrNull { it.type == android.media.AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
            bluetoothDevice?.let {
                audioManager?.setCommunicationDevice(it)
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.startBluetoothSco()
            @Suppress("DEPRECATION")
            audioManager?.isBluetoothScoOn = true
        }
    }

    private fun setupWebSocket() {
        val client = okHttpClient
        
        serviceScope.launch(Dispatchers.IO) {
            try {
                // 1. Generate Ephemeral Token via Cloud Functions
                val responseJson = network.callFirebaseFunction(network.FirebaseRoutes.GENERATE_LIVE_API_TOKEN, "{}")
                val response = org.json.JSONObject(responseJson)
                val result = if (response.has("result")) response.getJSONObject("result") else response
                val token = result.getString("token")
                
                // 2. Connect directly to Gemini Live API
                val url = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=$token"
                val request = Request.Builder().url(url).build()

                webSocket = client.newWebSocket(request, object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.i("SpressoWearables", "Gemini WebSocket Opened directly to Gemini")
                        sendSetupMessage(webSocket)
                        audioRecorder?.startRecording()
                    }


                    override fun onMessage(webSocket: WebSocket, text: String) {
                        Log.d("SpressoWearables", "Gemini text msg: $text")
                        try {
                            val json = JSONObject(text)
                            // Parse Gemini Tool Call format
                            if (json.has("toolCall")) {
                                val toolCall = json.getJSONObject("toolCall")
                                val functionCalls = toolCall.getJSONArray("functionCalls")
                                for (i in 0 until functionCalls.length()) {
                                    val functionCall = functionCalls.getJSONObject(i)
                                    val functionName = functionCall.getString("name")
                                    val args = if (functionCall.has("args")) functionCall.getJSONObject("args") else null
                                    handleIntentRouting(functionName, args)
                                }
                            }
                            
                            if (json.has("toolCall")) {
                                val toolCall = json.getJSONObject("toolCall")
                                val functionCalls = toolCall.getJSONArray("functionCalls")
                                for (i in 0 until functionCalls.length()) {
                                    val functionCall = functionCalls.getJSONObject(i)
                                    val functionName = functionCall.getString("name")
                                    val args = if (functionCall.has("args")) functionCall.getJSONObject("args") else null
                                    handleIntentRouting(functionName, args)
                                }
                            }

                            
                            if (json.has("serverContent")) {
                                val serverContent = json.getJSONObject("serverContent")
                                if (serverContent.has("modelTurn")) {
                                    val modelTurn = serverContent.getJSONObject("modelTurn")
                                    val parts = modelTurn.getJSONArray("parts")
                                    for (i in 0 until parts.length()) {
                                        val part = parts.getJSONObject(i)
                                        if (part.has("inlineData")) {
                                            val inlineData = part.getJSONObject("inlineData")
                                            if (inlineData.getString("mimeType").startsWith("audio")) {
                                                val base64Audio = inlineData.getString("data")
                                                val audioData = android.util.Base64.decode(base64Audio, android.util.Base64.DEFAULT)
                                                audioPlayer?.playChunk(audioData)
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            Log.e("SpressoWearables", "Error parsing JSON: ", e)
                            display?.let { currentDisplay ->
                                serviceScope.launch {
                                    currentDisplay.sendContent {
                                        flexBox(gap = 12, padding = 24, background = FlexBoxBackground.CARD) {
                                            text("Comm Error", style = TextStyle.HEADING)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        Log.w("SpressoWearables", "Gemini WebSocket Closed: $reason")
                        reconnectWebSocket()
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.e("SpressoWearables", "Gemini WebSocket Error", t)
                        reconnectWebSocket()
                    }
                })
            } catch (e: Exception) {
                Log.e("SpressoWearables", "Failed to setup WS", e)
                reconnectWebSocket()
            }
        }
    }

    private fun sendSetupMessage(ws: WebSocket) {
        val systemPrompt = when (currentAction) {
            "com.spresso19.action.GROCERY_SCANNER" -> "You are the Spresso AI Grocery Scanner. Use the camera to see ingredients and add them to the grocery list. Call the startGroceryScanner tool if needed."
            "com.spresso19.action.BARGAIN_CHEF" -> "You are the Spresso AI Bargain Chef. Use the camera to see ingredients and suggest recipes. Call the startCookingAssistance tool if needed."
            "com.spresso19.action.HANDS_FREE_CHECKOUT" -> "You are the Spresso AI Checkout Assistant. Help the user complete their purchase using Hands-Free Voice Checkout. Use the camera to view the cart or payment method if needed. Call the startHandsFreeCheckout tool to proceed."
            else -> "You are the Spresso AI Personal Shopper & Chef AI. Use the camera to see products or ingredients. Help the user find products, manage their cart, or cook recipes. Keep responses concise, friendly, and jargon-free."
        }
        val setup = JSONObject().apply {
            put("setup", JSONObject().apply {
                put("model", "models/gemini-3.5-flash")
                put("generationConfig", JSONObject().apply {
                    put("responseModalities", JSONArray().apply { put("AUDIO") })
                    put("speechConfig", JSONObject().apply {
                        put("voiceConfig", JSONObject().apply {
                            put("prebuiltVoiceConfig", JSONObject().apply {
                                put("voiceName", "Puck")
                            })
                        })
                    })
                })
                put("systemInstruction", JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply {
                            put("text", systemPrompt)
                        })
                    })
                })
            })
        }
        ws.send(setup.toString())
    }

    private var reconnectAttempts = 0

    private fun reconnectWebSocket() {
        if (reconnectAttempts > 5) {
            Log.e("SpressoWearables", "Max reconnect attempts reached.")
            return
        }
        val delayMs = (1000L * (1 shl reconnectAttempts)).coerceAtMost(30000L)
        reconnectAttempts++
        Log.i("SpressoWearables", "Reconnecting WebSocket in ${delayMs}ms (Attempt $reconnectAttempts)")
        
        serviceScope.launch {
            kotlinx.coroutines.delay(delayMs)
            setupWebSocket()
        }
    }

    private fun handleIntentRouting(functionName: String, args: JSONObject? = null) {
        Log.i("SpressoWearables", "Routing Intent: \$functionName")
        when (functionName) {
            "startCookingAssistance" -> {
                Log.i("SpressoWearables", "Executing Cooking Agent with Safeguard...")
                val intent = Intent("com.spresso19.intent.action.COOKING_MODE").apply { setPackage(packageName) }
                sendBroadcast(intent)
                captureSinglePhotoAndSend()
                sendToolResponse(functionName, JSONObject().put("success", true))
            }
            "startGroceryScanner" -> {
                Log.i("SpressoWearables", "Executing Grocery Scanner with Safeguard...")
                val intent = Intent("com.spresso19.intent.action.GROCERY_MODE").apply { setPackage(packageName) }
                sendBroadcast(intent)
                captureSinglePhotoAndSend()
                sendToolResponse(functionName, JSONObject().put("success", true))
            }
            "addToCart" -> {
                val productId = args?.optString("productId")
                if (productId != null) {
                    // Forward to ViewModel via broadcast or service bound action
                    val intent = Intent("com.spresso19.intent.action.ADD_TO_CART").apply {
                        putExtra("productId", productId)
                        setPackage(packageName)
                    }
                    sendBroadcast(intent)
                    sendToolResponse(functionName, JSONObject().put("success", true))
                    
                    // Show confirmation on Glasses HUD
                    display?.let { currentDisplay ->
                        serviceScope.launch {
                            currentDisplay.sendContent {
                                flexBox(
                                    gap = 12,
                                    padding = 24,
                                    background = FlexBoxBackground.CARD,
                                ) {
                                    text("Added to Cart", style = TextStyle.HEADING)
                                }
                            }
                        }
                    }
                } else {
                    sendToolResponse(functionName, JSONObject().put("error", "Missing productId"))
                }
            }
            "startHandsFreeCheckout" -> {
                Log.i("SpressoWearables", "Executing Hands-Free Checkout with Safeguard...")
                val intent = Intent("com.spresso19.intent.action.START_CHECKOUT").apply { setPackage(packageName) }
                sendBroadcast(intent)
                sendToolResponse(functionName, JSONObject().put("success", true))
                
                // Show confirmation on Glasses HUD
                display?.let { currentDisplay ->
                    serviceScope.launch {
                        currentDisplay.sendContent {
                            flexBox(
                                gap = 12,
                                padding = 24,
                                background = FlexBoxBackground.CARD,
                            ) {
                                text("Checkout Ready", style = TextStyle.HEADING)
                            }
                        }
                    }
                }
            }
            else -> {
                Log.w("SpressoWearables", "Rejected unauthorized function call: \$functionName")
                sendToolResponse(functionName, JSONObject().put("error", "Unauthorized or unknown"))
            }
        }
    }

    private fun sendToolResponse(name: String, response: JSONObject) {
        val msg = JSONObject().apply {
            put("clientContent", JSONObject().apply {
                put("turns", JSONArray().apply {
                    put(JSONObject().apply {
                        put("role", "user")
                        put("parts", JSONArray().apply {
                            put(JSONObject().apply {
                                put("toolResponse", JSONObject().apply {
                                    put("functionResponses", JSONArray().apply {
                                        put(JSONObject().apply {
                                            put("name", name)
                                            put("response", response)
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
                put("turnComplete", true)
            })
        }
        webSocket?.send(msg.toString())
    }

    private fun setupWearables() {

        Wearables.initialize(this).onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to initialize Wearables: ${error.description}")
            updateNotification("Connection Failed", "Failed to initialize Wearables")
            return
        }

        // Must observe RegistrationState before creating a session
        serviceScope.launch {
            Wearables.registrationState.collect { regState ->
                Log.i("SpressoWearables", "Registration state: $regState")
                if (regState == RegistrationState.REGISTERED && session == null) {
                    createAndStartSession()
                }
            }
        }
    }

    private fun createAndStartSession() {
        session = Wearables.createSession(AutoDeviceSelector()).getOrElse { error ->
            Log.e("SpressoWearables", "Failed to create session: $error")
            updateNotification("Connection Failed", "Failed to connect to device")
            return
        }
        
        session?.let { currentSession ->
            // Observe session errors natively
            serviceScope.launch {
                currentSession.errors.collect { error ->
                    Log.e("SpressoWearables", "Async Session Error: $error")
                }
            }
            
            // Wait for DeviceSessionState.STARTED to attach capabilities
            serviceScope.launch {
                currentSession.state.collect { state ->
                    Log.i("SpressoWearables", "Session state: $state")
                    if (state == DeviceSessionState.STARTED && stream == null) {
                        attachCapabilities(currentSession)
                    } else if (state == DeviceSessionState.STOPPED) {
                        Log.w("SpressoWearables", "Session stopped.")
                    }
                }
            }
            
            currentSession.start()
        }
    }

    private val frameOutStream = java.io.ByteArrayOutputStream(65536)

    private var frameCounter = 0

    private fun attachCapabilities(currentSession: DeviceSession) {
        // Add Display Capability for HUD
        currentSession.addDisplay().onSuccess { newDisplay ->
            display = newDisplay
            serviceScope.launch {
                newDisplay.state.collect { displayState ->
                    Log.i("SpressoWearables", "Display state: $displayState")
                    if (displayState == DisplayState.STARTED) {
                        Log.i("SpressoWearables", "Display HUD is ready.")
                    }
                }
            }
        }.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to add display: ${error.description}")
        }
    }

    private fun sendCameraErrorToGemini() {
        val msg = JSONObject().apply {
            put("clientContent", JSONObject().apply {
                put("turns", JSONArray().apply {
                    put(JSONObject().apply {
                        put("role", "user")
                        put("parts", JSONArray().apply {
                            put(JSONObject().apply {
                                put("text", "System Error: The glasses camera failed to capture a photo. Please inform the user.")
                            })
                        })
                    })
                })
                put("turnComplete", true)
            })
        }
        webSocket?.send(msg.toString())
    }

    private fun captureSinglePhotoAndSend() {
        val currentSession = session ?: return
        
        Log.i("SpressoWearables", "Starting stream to capture single photo...")
        currentSession.addStream(
            StreamConfiguration(videoQuality = VideoQuality.HIGH, frameRate = 30)
        ).onSuccess { currentStream ->
            stream = currentStream
            currentStream.start().onSuccess {
                serviceScope.launch(Dispatchers.Default) {
                    try {
                        currentStream.capturePhoto().onSuccess { photoData ->
                            Log.i("SpressoWearables", "Photo captured successfully!")
                            
                            val bitmap = when (photoData) {
                                is com.meta.wearable.dat.camera.types.PhotoData.Bitmap -> photoData.bitmap
                                is com.meta.wearable.dat.camera.types.PhotoData.HEIC -> {
                                    val buffer = photoData.data.duplicate().apply { rewind() }
                                    val bytes = ByteArray(buffer.remaining())
                                    buffer.get(bytes)
                                    android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                }
                                else -> null
                            }
                            
                            if (bitmap != null) {
                                frameOutStream.reset()
                                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, frameOutStream)
                                val base64Data = android.util.Base64.encodeToString(frameOutStream.toByteArray(), android.util.Base64.NO_WRAP)
                                
                                val message = JSONObject().apply {
                                    put("realtimeInput", JSONObject().apply {
                                        put("mediaChunks", JSONArray().apply {
                                            put(JSONObject().apply {
                                                put("mimeType", "image/jpeg")
                                                put("data", base64Data)
                                            })
                                        })
                                    })
                                }
                                webSocket?.send(message.toString())
                            }
                            
                            // Immediately stop and remove stream after capturing the photo
                            currentStream.stop()
                            currentSession.removeStream()
                            stream = null
                        }.onFailure { error, _ ->
                            Log.e("SpressoWearables", "Failed to capture photo: ${error.description}")
                            sendCameraErrorToGemini()
                            currentStream.stop()
                            currentSession.removeStream()
                        }
                    } catch (e: Exception) {
                        Log.e("SpressoWearables", "Error during photo capture", e)
                        sendCameraErrorToGemini()
                        currentStream.stop()
                        currentSession.removeStream()
                    }
                }
            }.onFailure { error, _ ->
                Log.e("SpressoWearables", "Failed to start stream for photo: ${error.description}")
                sendCameraErrorToGemini()
            }
        }.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to add stream for photo: ${error.description}")
            sendCameraErrorToGemini()
        }
    }

    private fun updateNotification(title: String, text: String) {
        val manager = getSystemService(NotificationManager::class.java)
        val notification = NotificationCompat.Builder(this, "spresso_wearables_channel")
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_lens)
            .build()
        manager.notify(1919, notification)
    }

    private fun createNotification(title: String = "Spresso Glasses Active", text: String = "Connected to Smart Glasses"): Notification {
        val channelId = "spresso_wearables_channel"
        val channel = NotificationChannel(
            channelId,
            "Spresso Wearables Service",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_lens)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            audioManager?.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audioManager?.stopBluetoothSco()
            @Suppress("DEPRECATION")
            audioManager?.isBluetoothScoOn = false
        }
        
        webSocket?.close(1000, "Service destroyed")
        audioRecorder?.stopRecording()
        
        stream?.stop()
        session?.removeStream()?.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to remove stream: ${error.description}")
        }
        
        display?.stop()
        session?.removeDisplay()?.onFailure { error, _ ->
            Log.e("SpressoWearables", "Failed to remove display: ${error.description}")
        }
        
        session?.stop()
        
        serviceScope.cancel()
    }
}
