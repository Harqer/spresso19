package com.spresso

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.meta.wearable.dat.camera.Camera
import com.meta.wearable.dat.camera.addCamera
import com.meta.wearable.dat.camera.removeCamera
import com.meta.wearable.dat.camera.types.PhotoData
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.StreamState
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.DeviceSessionError
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import com.meta.wearable.dat.display.Display
import com.meta.wearable.dat.display.addDisplay
import com.meta.wearable.dat.display.removeDisplay
import com.meta.wearable.dat.display.types.DisplayState
import com.meta.wearable.dat.display.views.ButtonStyle
import com.meta.wearable.dat.display.views.FlexBoxBackground
import com.meta.wearable.dat.display.views.IconName
import com.meta.wearable.dat.display.views.TextColor
import com.meta.wearable.dat.display.views.TextStyle
import components.features.wearables.ToolCallLedger
import components.features.wearables.WearableToolCall
import components.features.wearables.WearableToolCallParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions

class SpressoWearablesService : Service() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var session: DeviceSession? = null
    private var camera: Camera? = null
    private var display: Display? = null
    private var webSocket: WebSocket? = null
    private var audioManager: AudioManager? = null
    private var audioRecorder: audio.AudioRecorder? = null
    private var audioPlayer: audio.AudioPlayer? = null

    private var registrationJob: Job? = null
    private var registrationErrorJob: Job? = null
    private var devicesJob: Job? = null
    private var sessionStateJob: Job? = null
    private var sessionErrorJob: Job? = null
    private var displayStateJob: Job? = null
    private var cameraStateJob: Job? = null
    private var cameraErrorJob: Job? = null
    private var sessionRestartJob: Job? = null
    private var reconnectJob: Job? = null

    private var isInitialized = false
    private var isStopping = false
    private var displayReady = false
    private var socketConnected = false
    private var currentSessionState = DeviceSessionState.IDLE
    private var currentAction: String? = null
    private var socketGeneration = 0L
    private var reconnectAttempts = 0

    private val toolLedger = ToolCallLedger()
    private val pendingActions = mutableMapOf<String, PendingAction>()
    private val responseCache = LinkedHashMap<String, CachedToolResponse>()
    private val frameOutStream = ByteArrayOutputStream(65_536)

    private data class PendingAction(
        val call: WearableToolCall,
        val timeoutJob: Job,
    )

    private data class CachedToolResponse(
        val call: WearableToolCall,
        val response: String,
    )

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startAsForegroundService()
        ContextCompat.registerReceiver(
            this,
            actionResultReceiver,
            IntentFilter(ACTION_WEARABLE_ACTION_RESULT),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        val nextAction = intent?.action
        if (!isInitialized) {
            isInitialized = true
            currentAction = nextAction
            setupAudioManager()
            setupAudioRecorder()
            audioPlayer = audio.AudioPlayer()
            observeWearables()
            setupWebSocket()
        } else if (nextAction != null && nextAction != currentAction) {
            currentAction = nextAction
            replaceWebSocket("Experience changed")
        }
        return START_STICKY
    }

    private fun startAsForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification())
        }
    }

    private fun setupAudioRecorder() {
        audioRecorder =
            audio.AudioRecorder().apply {
                onAudioChunk = { chunk ->
                    val base64Data = android.util.Base64.encodeToString(chunk, android.util.Base64.NO_WRAP)
                    val message =
                        JSONObject().apply {
                            put(
                                "realtimeInput",
                                JSONObject().apply {
                                    put(
                                        "mediaChunks",
                                        JSONArray().put(
                                            JSONObject()
                                                .put("mimeType", "audio/pcm;rate=16000")
                                                .put("data", base64Data),
                                        ),
                                    )
                                },
                            )
                        }
                    webSocket?.send(message.toString())
                }
            }
    }

    private fun setupAudioManager() {
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager
                ?.availableCommunicationDevices
                ?.firstOrNull { it.type == android.media.AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
                ?.let { audioManager?.setCommunicationDevice(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.startBluetoothSco()
            @Suppress("DEPRECATION")
            run { audioManager?.isBluetoothScoOn = true }
        }
    }

    private fun setupWebSocket() {
        if (isStopping) return
        val generation = ++socketGeneration

        serviceScope.launch(Dispatchers.IO) {
            try {
                val responseJson = network.callFirebaseFunction(network.FirebaseRoutes.GENERATE_LIVE_API_TOKEN, "{}")
                if (generation != socketGeneration || isStopping) return@launch

                val response = JSONObject(responseJson)
                val result = if (response.has("result")) response.getJSONObject("result") else response
                val token = result.getString("token")
                val request =
                    Request
                        .Builder()
                        .url("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=$token")
                        .build()

                webSocket = okHttpClient.newWebSocket(request, createWebSocketListener(generation))
            } catch (error: Exception) {
                Log.e(TAG, "Unable to connect the glasses assistant", error)
                scheduleWebSocketReconnect(generation)
            }
        }
    }

    private fun createWebSocketListener(generation: Long) =
        object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (generation != socketGeneration || isStopping) {
                    webSocket.close(1000, "Superseded")
                    return
                }
                socketConnected = true
                reconnectAttempts = 0
                reconnectJob?.cancel()
                Log.i(TAG, "Glasses assistant connected")
                sendSetupMessage(webSocket)
                if (currentSessionState == DeviceSessionState.STARTED) audioRecorder?.startRecording()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (generation != socketGeneration || isStopping) return
                Log.d(TAG, "Glasses assistant message received (${text.length} characters)")
                runCatching { handleServerMessage(text) }
                    .onFailure { error ->
                        Log.e(TAG, "Unable to read the glasses assistant response", error)
                        sendDisplayMessage(
                            title = "Let's try that again",
                            body = "I couldn't continue just now. Please ask Spresso again.",
                            leadingIcon = IconName.EXCLAMATION_CIRCLE,
                        )
                    }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (generation != socketGeneration || isStopping) return
                socketConnected = false
                audioRecorder?.stopRecording()
                Log.w(TAG, "Glasses assistant connection closed")
                scheduleWebSocketReconnect(generation)
            }

            override fun onFailure(webSocket: WebSocket, throwable: Throwable, response: Response?) {
                if (generation != socketGeneration || isStopping) return
                socketConnected = false
                audioRecorder?.stopRecording()
                Log.e(TAG, "Glasses assistant connection failed", throwable)
                scheduleWebSocketReconnect(generation)
            }
        }

    private fun handleServerMessage(text: String) {
        WearableToolCallParser.parse(text).forEach(::routeToolCall)
        val parts =
            JSONObject(text)
                .optJSONObject("serverContent")
                ?.optJSONObject("modelTurn")
                ?.optJSONArray("parts") ?: return
        for (index in 0 until parts.length()) {
            val inlineData = parts.optJSONObject(index)?.optJSONObject("inlineData") ?: continue
            if (!inlineData.optString("mimeType").startsWith("audio")) continue
            val encodedAudio = inlineData.optString("data")
            if (encodedAudio.isBlank()) continue
            audioPlayer?.playChunk(android.util.Base64.decode(encodedAudio, android.util.Base64.DEFAULT))
        }
    }

    private fun sendSetupMessage(webSocket: WebSocket) {
        val systemPrompt =
            when (currentAction) {
                ACTION_GROCERY_SCANNER -> "You are Spresso, a friendly personal shopping assistant. Help the shopper identify ingredients and manage their grocery list. Keep every spoken answer concise and natural."
                ACTION_BARGAIN_CHEF -> "You are Spresso. Help the shopper understand ingredients, find good-value options, and cook with confidence. Keep every spoken answer concise and natural."
                ACTION_HANDS_FREE_CHECKOUT -> "You are Spresso, a friendly personal shopping assistant. Help the shopper review their cart and move to checkout. Never say an item was added or an order was placed until the app confirms it."
                else -> "You are Spresso, a natural general assistant that can help people shop. Use familiar language such as Add to cart, Checkout, Place order, and Track order. Never expose technical steps or claim success before the app confirms it."
            }
        val declarations =
            JSONArray()
                .put(functionDeclaration("startCookingAssistance", "Start hands-free cooking help"))
                .put(functionDeclaration("startGroceryScanner", "Show nearby grocery items"))
                .put(
                    functionDeclaration(
                        "searchProducts",
                        "Find products or groceries in the Spresso catalog. Use the returned product ID when adding an item to the cart.",
                        JSONObject().put("query", JSONObject().put("type", "string")),
                        JSONArray().put("query"),
                    ),
                )
                .put(
                    functionDeclaration(
                        "addToCart",
                        "Add a selected product to the shopper's cart",
                        JSONObject().put("productId", JSONObject().put("type", "string")),
                        JSONArray().put("productId"),
                    ),
                ).put(functionDeclaration("startHandsFreeCheckout", "Open checkout for the shopper to review and confirm"))
        val setup =
            JSONObject().put(
                "setup",
                JSONObject()
                    .put("model", "models/gemini-3.1-flash-live-preview")
                    .put(
                        "generationConfig",
                        JSONObject()
                            .put("responseModalities", JSONArray().put("AUDIO"))
                            .put(
                                "speechConfig",
                                JSONObject().put(
                                    "voiceConfig",
                                    JSONObject().put(
                                        "prebuiltVoiceConfig",
                                        JSONObject().put("voiceName", "Puck"),
                                    ),
                                ),
                            ),
                    ).put(
                        "systemInstruction",
                        JSONObject().put("parts", JSONArray().put(JSONObject().put("text", systemPrompt))),
                    ).put("tools", JSONArray().put(JSONObject().put("functionDeclarations", declarations))),
            )
        webSocket.send(setup.toString())
    }

    private fun functionDeclaration(
        name: String,
        description: String,
        properties: JSONObject = JSONObject(),
        required: JSONArray = JSONArray(),
    ): JSONObject =
        JSONObject()
            .put("name", name)
            .put("description", description)
            .put(
                "parameters",
                JSONObject()
                    .put("type", "object")
                    .put("properties", properties)
                    .put("required", required),
            )

    private fun replaceWebSocket(reason: String) {
        reconnectJob?.cancel()
        ++socketGeneration
        socketConnected = false
        audioRecorder?.stopRecording()
        webSocket?.close(1000, reason)
        webSocket = null
        reconnectAttempts = 0
        setupWebSocket()
    }

    private fun scheduleWebSocketReconnect(failedGeneration: Long) {
        if (failedGeneration != socketGeneration || isStopping || reconnectJob?.isActive == true) return
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            Log.e(TAG, "Glasses assistant reconnect limit reached")
            updateNotification("Spresso glasses paused", "Open Spresso to reconnect")
            return
        }
        val delayMillis = (1_000L shl reconnectAttempts).coerceAtMost(30_000L)
        reconnectAttempts++
        reconnectJob =
            serviceScope.launch {
                delay(delayMillis)
                if (failedGeneration == socketGeneration && !isStopping) setupWebSocket()
            }
    }

    private fun routeToolCall(call: WearableToolCall) {
        if (!toolLedger.claim(call.id, System.currentTimeMillis())) {
            responseCache[call.id]?.let { cached ->
                sendToolResponse(cached.call, JSONObject(cached.response), cache = false)
            }
            return
        }
        Log.i(TAG, "Routing approved wearable action: ${call.name}")
        when (call.name) {
            "startCookingAssistance" ->
                startVisualAssistant(call, "com.spresso.intent.action.COOKING_MODE", "Cooking help is ready.")
            "startGroceryScanner" ->
                startVisualAssistant(call, "com.spresso.intent.action.GROCERY_MODE", "Ready.")
            "searchProducts" -> {
                val query = call.arguments["query"]?.trim().orEmpty()
                if (query.isEmpty()) {
                    completeToolCall(call, false, "Tell me what product or grocery item to look for.")
                } else {
                    awaitAppResult(
                        call,
                        Intent("com.spresso.intent.action.SEARCH_PRODUCTS")
                            .setPackage(packageName)
                            .putExtra("query", query),
                    )
                }
            }
            "addToCart" -> {
                val productId = call.arguments["productId"]?.trim().orEmpty()
                if (productId.isEmpty()) {
                    completeToolCall(call, false, "Choose a product before adding it to your cart.")
                } else {
                    awaitAppResult(
                        call,
                        Intent("com.spresso.intent.action.ADD_TO_CART")
                            .setPackage(packageName)
                            .putExtra("productId", productId),
                    )
                }
            }
            "startHandsFreeCheckout" ->
                awaitAppResult(call, Intent("com.spresso.intent.action.START_CHECKOUT").setPackage(packageName))
            else -> completeToolCall(call, false, "I can't do that from your glasses yet.")
        }
    }

    private fun startVisualAssistant(
        call: WearableToolCall,
        action: String,
        successMessage: String,
    ) {
        sendBroadcast(Intent(action).setPackage(packageName).putCorrelation(call))
        captureSinglePhotoAndSend { success, message ->
            completeToolCall(call, success, if (success) successMessage else message)
        }
    }

    private fun awaitAppResult(call: WearableToolCall, intent: Intent) {
        val timeoutJob =
            serviceScope.launch {
                delay(ACTION_RESULT_TIMEOUT_MILLIS)
                if (pendingActions.remove(call.id) != null) {
                    completeToolCall(call, false, "That action wasn't completed. Please try again.")
                }
            }
        pendingActions[call.id] = PendingAction(call, timeoutJob)
        sendBroadcast(intent.putCorrelation(call))
    }

    private fun Intent.putCorrelation(call: WearableToolCall): Intent =
        putExtra(EXTRA_ACTION_ID, call.id)
            .putExtra(EXTRA_TOOL_NAME, call.name)
            .putExtra(EXTRA_IDEMPOTENCY_KEY, call.id)

    private val actionResultReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val callId = intent?.getStringExtra(EXTRA_ACTION_ID)?.trim().orEmpty()
                if (callId.isEmpty()) return
                val pending = pendingActions.remove(callId) ?: return
                pending.timeoutJob.cancel()
                val success = intent?.getBooleanExtra(EXTRA_SUCCESS, false) == true
                val message =
                    intent?.getStringExtra(EXTRA_CUSTOMER_MESSAGE)?.trim().orEmpty().ifEmpty {
                        if (success) "Done." else "That action couldn't be completed. Please try again."
                    }
                completeToolCall(pending.call, success, message)
                if (success && intent?.getBooleanExtra(EXTRA_PURCHASE_CONFIRMED, false) == true) {
                    sendDisplayMessage("Purchase confirmed", message, IconName.CHECKMARK_CIRCLE)
                }
            }
        }

    private fun completeToolCall(call: WearableToolCall, success: Boolean, message: String) {
        pendingActions.remove(call.id)?.timeoutJob?.cancel()
        val response =
            JSONObject()
                .put("success", success)
                .put("requestId", call.id)
                .put(if (success) "message" else "error", message)
        sendToolResponse(call, response)
    }

    private fun sendToolResponse(
        call: WearableToolCall,
        response: JSONObject,
        cache: Boolean = true,
    ) {
        if (cache) {
            responseCache[call.id] = CachedToolResponse(call, response.toString())
            while (responseCache.size > MAX_CACHED_TOOL_RESPONSES) responseCache.remove(responseCache.keys.first())
        }
        val functionResponse =
            JSONObject()
                .put("id", call.id)
                .put("name", call.name)
                .put("response", response)
        val message =
            JSONObject()
                .put("toolResponse", JSONObject().put("functionResponses", JSONArray().put(functionResponse)))
        webSocket?.send(message.toString())
    }

    private fun observeWearables() {
        registrationJob =
            serviceScope.launch {
                Wearables.registrationState.collect { state ->
                    Log.i(TAG, "DAT registration state: $state")
                    when (state) {
                        RegistrationState.REGISTERED -> createSessionWhenDeviceIsReady()
                        RegistrationState.UNREGISTERING,
                        RegistrationState.AVAILABLE,
                        RegistrationState.UNAVAILABLE,
                        -> stopWearableSession(recreate = false)
                        RegistrationState.REGISTERING -> Unit
                    }
                }
            }
        registrationErrorJob =
            serviceScope.launch {
                Wearables.registrationErrorStream.collect { error ->
                    Log.e(TAG, "DAT registration error: ${error.description}")
                    updateNotification("Glasses connection needs attention", "Open Spresso to reconnect")
                }
            }
        devicesJob =
            serviceScope.launch {
                Wearables.devices.collect { devices ->
                    if (devices.isNotEmpty() && Wearables.registrationState.value == RegistrationState.REGISTERED && session == null) {
                        scheduleSessionRecreation()
                    }
                }
            }
    }

    private fun createSessionWhenDeviceIsReady() {
        if (session != null || isStopping) return
        if (Wearables.devices.value.isEmpty()) {
            updateNotification("Spresso glasses ready", "Waiting for your glasses")
            return
        }
        createAndStartSession()
    }

    private fun createAndStartSession() {
        if (session != null || isStopping) return
        Wearables
            .createSession(AutoDeviceSelector())
            .fold(
                onSuccess = { newSession ->
                    session = newSession
                    currentSessionState = DeviceSessionState.IDLE
                    observeSession(newSession)
                    newSession.start()
                },
                onFailure = { error, _ ->
                    Log.e(TAG, "Failed to create DAT session: ${error.description}")
                    if (error == DeviceSessionError.DAT_APP_ON_THE_GLASSES_UPDATE_REQUIRED) {
                        updateNotification("Glasses update required", "Open Spresso to update your glasses")
                    } else {
                        updateNotification("Couldn't connect to glasses", "Make sure your glasses are nearby")
                    }
                    scheduleSessionRecreation()
                },
            )
    }

    private fun observeSession(observedSession: DeviceSession) {
        sessionStateJob?.cancel()
        sessionErrorJob?.cancel()
        sessionStateJob =
            serviceScope.launch {
                observedSession.state.collect { state ->
                    if (session !== observedSession) return@collect
                    currentSessionState = state
                    Log.i(TAG, "DAT session state: $state")
                    when (state) {
                        DeviceSessionState.STARTED -> {
                            updateNotification("Spresso glasses active", "Ask Spresso anything while you shop")
                            if (display == null) {
                                attachDisplay(observedSession)
                            } else {
                                displayReady = display?.state?.value == DisplayState.STARTED
                            }
                            if (socketConnected) audioRecorder?.startRecording()
                        }
                        DeviceSessionState.PAUSED -> {
                            displayReady = false
                            audioRecorder?.stopRecording()
                            updateNotification("Spresso glasses paused", "Your session will resume when your glasses are ready")
                        }
                        DeviceSessionState.STOPPING -> {
                            displayReady = false
                            audioRecorder?.stopRecording()
                        }
                        DeviceSessionState.STOPPED -> handleTerminalSession(observedSession)
                        DeviceSessionState.IDLE,
                        DeviceSessionState.STARTING,
                        -> Unit
                    }
                }
            }
        sessionErrorJob =
            serviceScope.launch {
                observedSession.errors.collect { error ->
                    Log.e(TAG, "DAT session error: ${error.description}")
                    if (error == DeviceSessionError.DAT_APP_ON_THE_GLASSES_UPDATE_REQUIRED) {
                        updateNotification("Glasses update required", "Open Spresso to continue")
                    }
                }
            }
    }

    private fun attachDisplay(currentSession: DeviceSession) {
        if (display != null || currentSessionState != DeviceSessionState.STARTED) return
        currentSession
            .addDisplay()
            .fold(
                onSuccess = { newDisplay ->
                    display = newDisplay
                    displayStateJob?.cancel()
                    displayStateJob =
                        serviceScope.launch {
                            var hasStarted = false
                            newDisplay.state.collect { state ->
                                if (display !== newDisplay) return@collect
                                displayReady = state == DisplayState.STARTED
                                Log.i(TAG, "DAT display state: $state")
                                if (state == DisplayState.STARTED) {
                                    hasStarted = true
                                    if (currentAction == ACTION_COMPONENT_PREVIEW) {
                                        sendComponentPreview()
                                    } else {
                                        sendDisplayMessage(
                                            "Ask Spresso",
                                            "I can help you shop, compare products, plan meals, and move to checkout.",
                                            IconName.SHOPPING_BAG,
                                            "Stop",
                                            IconName.X,
                                        )
                                    }
                                } else if (state == DisplayState.STOPPED && hasStarted) {
                                    display = null
                                    runCatching { newDisplay.close() }
                                    if (currentSessionState == DeviceSessionState.STARTED) {
                                        delay(CAPABILITY_REATTACH_DELAY_MILLIS)
                                        attachDisplay(currentSession)
                                    }
                                }
                            }
                        }
                },
                onFailure = { error, _ ->
                    Log.i(TAG, "Display capability not attached (hardware may be audio-only): ${error.description}")
                    displayReady = false
                },
            )
    }

    private fun sendDisplayMessage(
        title: String,
        body: String,
        leadingIcon: IconName,
        actionLabel: String? = null,
        actionIcon: IconName = IconName.CHECKMARK,
    ) {
        val currentDisplay = display ?: return
        if (!displayReady) return
        serviceScope.launch {
            currentDisplay
                .sendContent {
                    flexBox(gap = 12, padding = 24, background = FlexBoxBackground.CARD) {
                        icon(name = leadingIcon)
                        text(title, style = TextStyle.HEADING, color = TextColor.PRIMARY)
                        text(body, style = TextStyle.BODY, color = TextColor.SECONDARY)
                        if (actionLabel != null) {
                            button(
                                label = actionLabel,
                                style = ButtonStyle.SECONDARY,
                                iconName = actionIcon,
                                onClick = { stopSelf() },
                            )
                        }
                    }
                }.onFailure { error, _ -> Log.e(TAG, "Failed to send DAT display content: ${error.description}") }
        }
    }

    private fun sendComponentPreview() {
        val currentDisplay = display ?: return
        if (!displayReady) return
        serviceScope.launch {
            currentDisplay
                .sendContent {
                    flexBox(gap = 10, padding = 24, background = FlexBoxBackground.CARD) {
                        icon(name = IconName.SHOPPING_BAG)
                        text("Spresso preview", style = TextStyle.HEADING, color = TextColor.PRIMARY)
                        text("Find products, review details, and keep checkout in your hands.", style = TextStyle.BODY, color = TextColor.SECONDARY)
                        button(
                            label = "Try on",
                            style = ButtonStyle.PRIMARY,
                            iconName = IconName.SHOPPING_BAG,
                            onClick = { sendDisplayMessage("Try on", "Open Spresso to choose a product and start a private preview.", IconName.SHOPPING_BAG) },
                        )
                        button(
                            label = "Add to cart",
                            style = ButtonStyle.SECONDARY,
                            iconName = IconName.SHOPPING_BAG,
                            onClick = { sendDisplayMessage("Your choice", "Open Spresso to review the product before adding it to your cart.", IconName.SHOPPING_BAG) },
                        )
                        button(
                            label = "Track order",
                            style = ButtonStyle.SECONDARY,
                            iconName = IconName.SHOPPING_BAG,
                            onClick = { sendDisplayMessage("Track order", "Open Spresso to view delivery progress and reminders.", IconName.SHOPPING_BAG) },
                        )
                    }
                }.onFailure { error, _ -> Log.e(TAG, "Failed to send component preview: ${error.description}") }
        }
    }

    private fun captureSinglePhotoAndSend(onComplete: (Boolean, String) -> Unit) {
        serviceScope.launch {
            var granted = false
            Wearables.checkPermissionStatus(Permission.CAMERA).fold(
                onSuccess = { status -> granted = status == PermissionStatus.Granted },
                onFailure = { error, _ -> Log.w(TAG, "Unable to check DAT camera permission: ${error.description}") },
            )
            if (!granted) {
                onComplete(false, "Camera access for your glasses is off. Open Spresso to enable it, then try again.")
                return@launch
            }
            captureSinglePhotoAndSendInternal(onComplete)
        }
    }

    private fun captureSinglePhotoAndSendInternal(onComplete: (Boolean, String) -> Unit) {
        if (!ConsentManager(this).hasCameraConsent()) {
            Log.w(TAG, "Camera consent is not granted")
            onComplete(false, "Camera access is off. Turn it on in Spresso to continue.")
            return
        }
        val currentSession = session
        if (currentSession == null || currentSessionState != DeviceSessionState.STARTED) {
            onComplete(false, "Your glasses aren't ready yet. Please try again in a moment.")
            return
        }
        if (camera != null) {
            onComplete(false, "The camera is already in use. Please try again in a moment.")
            return
        }

        currentSession
            .addCamera(StreamConfiguration(videoQuality = VideoQuality.HIGH, frameRate = 7))
            .fold(
                onSuccess = { newCamera ->
                    camera = newCamera
                    observeCamera(newCamera)
                    newCamera.stream
                        .start()
                        .fold(
                            onSuccess = {
                                serviceScope.launch(Dispatchers.Default) {
                                    newCamera.stream
                                        .capturePhoto()
                                        .fold(
                                            onSuccess = { photo ->
                                                val sent = sendPhotoToAssistant(photo)
                                                releaseCamera(newCamera)
                                                onComplete(
                                                    sent,
                                                    if (sent) "Ready." else "I couldn't share that photo. Please try again.",
                                                )
                                            },
                                            onFailure = { error, _ ->
                                                Log.e(TAG, "DAT photo capture failed: ${error.description}")
                                                releaseCamera(newCamera)
                                                onComplete(false, "I couldn't take a photo. Please try again.")
                                            },
                                        )
                                }
                            },
                            onFailure = { error, _ ->
                                Log.e(TAG, "DAT camera stream failed to start: ${error.description}")
                                releaseCamera(newCamera)
                                onComplete(false, "The glasses camera couldn't start. Please try again.")
                            },
                        )
                },
                onFailure = { error, _ ->
                    Log.e(TAG, "Failed to attach DAT camera: ${error.description}")
                    onComplete(false, "The glasses camera isn't available right now.")
                },
            )
    }

    private fun observeCamera(currentCamera: Camera) {
        cameraStateJob?.cancel()
        cameraErrorJob?.cancel()
        cameraStateJob =
            serviceScope.launch {
                var hasBeenActive = false
                currentCamera.stream.state.collect { state ->
                    Log.i(TAG, "DAT camera stream state: $state")
                    if (state != StreamState.STOPPED && state != StreamState.CLOSED) hasBeenActive = true
                    if (hasBeenActive && (state == StreamState.CLOSED || state == StreamState.STOPPED) && camera === currentCamera) {
                        releaseCamera(currentCamera)
                    }
                }
            }
        cameraErrorJob =
            serviceScope.launch {
                currentCamera.stream.errorStream.collect { error ->
                    Log.e(TAG, "DAT camera stream error: ${error.description}")
                }
            }
    }

    private fun sendPhotoToAssistant(photo: PhotoData): Boolean {
        val bitmap =
            when (photo) {
                is PhotoData.Bitmap -> photo.bitmap
                is PhotoData.HEIC -> {
                    val buffer = photo.data.duplicate().apply { rewind() }
                    val bytes = ByteArray(buffer.remaining())
                    buffer.get(bytes)
                    android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                }
                else -> null
            } ?: return false

        frameOutStream.reset()
        val labels = runCatching {
            val labeler = ImageLabeling.getClient(ImageLabelerOptions.DEFAULT_OPTIONS)
            val result = Tasks.await(labeler.process(InputImage.fromBitmap(bitmap, 0)))
            labeler.close()
            result.sortedByDescending { it.confidence }
                .take(6)
                .filter { it.confidence >= 0.55f }
                .joinToString(", ") { "${it.text} (${(it.confidence * 100).toInt()}%)" }
        }.getOrDefault("")
        val contextMessage = JSONObject()
            .put("text", "On-device camera labels: ${if (labels.isBlank()) "No confident item label" else labels}. Use product search to identify current listings and prices. Do not claim a product or price until search returns a match.")
        if (webSocket?.send(contextMessage.toString()) != true) return false

        // Do not upload the camera image during routine wearable scanning. The local
        // ML Kit result is sufficient for catalog search and keeps vision traffic low.
        if (currentAction == ACTION_GROCERY_SCANNER) return true
        if (!bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 75, frameOutStream)) return false
        val encoded = android.util.Base64.encodeToString(frameOutStream.toByteArray(), android.util.Base64.NO_WRAP)
        val message =
            JSONObject().put(
                "realtimeInput",
                JSONObject().put(
                    "mediaChunks",
                    JSONArray().put(JSONObject().put("mimeType", "image/jpeg").put("data", encoded)),
                ),
            )
        return webSocket?.send(message.toString()) == true
    }

    private fun releaseCamera(target: Camera? = camera) {
        if (target == null) return
        if (camera === target) camera = null
        cameraStateJob?.cancel()
        cameraErrorJob?.cancel()
        cameraStateJob = null
        cameraErrorJob = null
        val currentSession = session
        if (currentSession != null) {
            currentSession.removeCamera().onFailure { error, _ ->
                Log.e(TAG, "Failed to detach DAT camera from session: ${error.description}")
            }
        }
        runCatching { target.close() }
            .onFailure { error -> Log.e(TAG, "Failed to close local DAT camera stream", error) }
    }

    private fun handleTerminalSession(terminatedSession: DeviceSession) {
        if (session !== terminatedSession) return
        audioRecorder?.stopRecording()
        releaseCamera()
        runCatching { display?.close() }
        displayStateJob?.cancel()
        displayStateJob = null
        display = null
        displayReady = false
        sessionStateJob = null
        sessionErrorJob?.cancel()
        sessionErrorJob = null
        session = null
        currentSessionState = DeviceSessionState.STOPPED
        if (!isStopping && Wearables.registrationState.value == RegistrationState.REGISTERED) scheduleSessionRecreation()
        sessionStateJob?.cancel()
        sessionStateJob = null
    }

    private fun scheduleSessionRecreation() {
        if (isStopping || session != null || sessionRestartJob?.isActive == true) return
        sessionRestartJob =
            serviceScope.launch {
                delay(SESSION_RESTART_DELAY_MILLIS)
                createSessionWhenDeviceIsReady()
            }
    }

    private fun stopWearableSession(recreate: Boolean) {
        sessionRestartJob?.cancel()
        releaseCamera()
        val currentSession = session
        val hadDisplay = display != null
        displayReady = false
        displayStateJob?.cancel()
        displayStateJob = null
        display = null
        if (currentSession != null && hadDisplay) {
            currentSession.removeDisplay().onFailure { error, _ ->
                Log.e(TAG, "Failed to detach DAT display: ${error.description}")
            }
        }
        currentSession?.stop()
        if (!recreate) {
            session = null
            currentSessionState = DeviceSessionState.STOPPED
        }
    }

    private fun updateNotification(title: String, text: String) {
        getSystemService(NotificationManager::class.java).notify(
            NOTIFICATION_ID,
            NotificationCompat
                .Builder(this, NOTIFICATION_CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_lens)
                .build(),
        )
    }

    private fun createNotification(
        title: String = "Spresso glasses",
        text: String = "Getting your glasses ready",
    ): Notification {
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Spresso glasses",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
        return NotificationCompat
            .Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_lens)
            .build()
    }

    override fun onDestroy() {
        isStopping = true
        ++socketGeneration
        reconnectJob?.cancel()
        pendingActions.values.forEach { it.timeoutJob.cancel() }
        pendingActions.clear()
        runCatching { unregisterReceiver(actionResultReceiver) }
        audioRecorder?.stopRecording()
        webSocket?.close(1000, "Service stopped")
        webSocket = null
        socketConnected = false
        stopWearableSession(recreate = false)
        registrationJob?.cancel()
        registrationErrorJob?.cancel()
        devicesJob?.cancel()
        sessionStateJob?.cancel()
        sessionErrorJob?.cancel()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager?.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audioManager?.stopBluetoothSco()
            @Suppress("DEPRECATION")
            run { audioManager?.isBluetoothScoOn = false }
        }
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_HANDS_FREE_CHECKOUT = "com.spresso.action.HANDS_FREE_CHECKOUT"
        const val ACTION_GROCERY_SCANNER = "com.spresso.action.GROCERY_SCANNER"
        const val ACTION_BARGAIN_CHEF = "com.spresso.action.BARGAIN_CHEF"
        const val ACTION_COMPONENT_PREVIEW = "com.spresso.action.COMPONENT_PREVIEW"
        const val ACTION_STOP = "com.spresso.action.STOP_WEARABLES"
        const val ACTION_WEARABLE_ACTION_RESULT = "com.spresso.intent.action.WEARABLE_ACTION_RESULT"
        const val EXTRA_ACTION_ID = "com.spresso.extra.WEARABLE_ACTION_ID"
        const val EXTRA_TOOL_NAME = "com.spresso.extra.WEARABLE_TOOL_NAME"
        const val EXTRA_IDEMPOTENCY_KEY = "com.spresso.extra.IDEMPOTENCY_KEY"
        const val EXTRA_SUCCESS = "com.spresso.extra.ACTION_SUCCESS"
        const val EXTRA_CUSTOMER_MESSAGE = "com.spresso.extra.CUSTOMER_MESSAGE"
        const val EXTRA_PURCHASE_CONFIRMED = "com.spresso.extra.PURCHASE_CONFIRMED"

        private const val TAG = "SpressoWearables"
        private const val NOTIFICATION_ID = 1919
        private const val NOTIFICATION_CHANNEL_ID = "spresso_wearables_channel"
        private const val MAX_RECONNECT_ATTEMPTS = 6
        private const val MAX_CACHED_TOOL_RESPONSES = 128
        private const val ACTION_RESULT_TIMEOUT_MILLIS = 30_000L
        private const val SESSION_RESTART_DELAY_MILLIS = 2_000L
        private const val CAPABILITY_REATTACH_DELAY_MILLIS = 500L

        private val okHttpClient: OkHttpClient by lazy {
            OkHttpClient
                .Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.SECONDS)
                .build()
        }
    }
}
