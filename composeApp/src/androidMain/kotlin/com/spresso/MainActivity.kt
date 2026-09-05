package com.spresso

import App
import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.Companion.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.spresso.dataconnect.SpressoConnectorConnector
import com.spresso.dataconnect.execute
import com.spresso.dataconnect.instance
import com.spresso.engage.EngageBroadcastReceiver
import components.core.LogoSize
import components.core.SpressoLogo
import components.features.profile.CoinbaseWalletManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import navigation.NavKey
import org.json.JSONObject
import theme.SpressoAndroidTheme
import theme.ThemeMode
import java.util.UUID
import java.util.concurrent.TimeUnit

@kotlin.OptIn(androidx.credentials.ExperimentalDigitalCredentialApi::class)
class MainActivity : FragmentActivity() {
    private val isAccessibilityEnabledState = mutableStateOf(true)
    private val hasAccessibilityConsentState = mutableStateOf(false)
    private val accessibilityDisclosureRequestedState = mutableStateOf(false)
    private val currentIntentState = mutableStateOf<Intent?>(null)
    private val currentLatLngState = mutableStateOf<Pair<Double, Double>?>(null)
    private lateinit var accessibilityConsentStore: AccessibilityConsentStore
    private lateinit var consentManager: ConsentManager
    private lateinit var screenCapture: MediaProjectionScreenCapture
    private var lensResultHandler: ((String) -> Unit)? = null

    private val screenCaptureLauncher =
        registerForActivityResult(
            ActivityResultContracts.StartActivityForResult(),
        ) { result ->
            if (result.resultCode != RESULT_OK || result.data == null) {
                Toast.makeText(this, "Screen capture was cancelled.", Toast.LENGTH_SHORT).show()
                return@registerForActivityResult
            }
            // Return to the app the user was viewing before the approval dialog so
            // the captured frame represents that screen, not Spresso's launcher UI.
            moveTaskToBack(true)
            screenCapture.capture(
                result.resultCode,
                result.data!!,
                onResult = { bytes ->
                    lifecycleScope.launch(Dispatchers.IO) {
                        try {
                            val encoded = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                            runOnUiThread { lensResultHandler?.invoke(encoded) }
                        } catch (error: Exception) {
                            network.Telemetry.recordError("MediaProjection Lens search failed", error)
                        }
                    }
                },
                onError = { error -> network.Telemetry.recordError("MediaProjection capture failed", error) },
            )
        }

    private val phoneAuthLauncher =
        registerForActivityResult(
            com.firebase.ui.auth
                .FirebaseAuthUIActivityResultContract(),
        ) { res ->
            val response = res.idpResponse
            if (res.resultCode == RESULT_OK) {
                Toast.makeText(this, "Phone authentication successful!", Toast.LENGTH_SHORT).show()
            } else {
            }
        }

    private val locationPermissionRequest =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions(),
        ) { permissions ->
            when {
                permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) ||
                    permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false) -> {
                    lifecycleScope.launch {
                        currentLatLngState.value = LocationManager(this@MainActivity).getCurrentLocation()
                    }
                }
                else -> {
                    Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        currentActivity = this
        accessibilityConsentStore = AccessibilityConsentStore(this)
        consentManager = ConsentManager(this)
        screenCapture = MediaProjectionScreenCapture(this)
        if (intent?.data != null) {
            CoinbaseWalletManager.handleResponse(intent.data)
        }
        if (savedInstanceState == null && isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
        refreshAccessibilityState()
        EngageBroadcastReceiver.register(this)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            setPictureInPictureParams(
                android.app.PictureInPictureParams
                    .Builder()
                    .setAutoEnterEnabled(true)
                    .build(),
            )
        }
        currentIntentState.value = intent
        if (intent?.action == ACTION_USER_SCREEN_CAPTURE) {
            requestUserInitiatedScreenCapture()
        }

        setContent {
            val darkTheme = isSystemInDarkTheme()
            val currentIntent by currentIntentState

            val isAccessEnabled by isAccessibilityEnabledState
            val hasConsent by hasAccessibilityConsentState
            val showDisclosure by accessibilityDisclosureRequestedState

            var user by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
            var isAuthLoading by remember { mutableStateOf(true) }
            var externalNavKey by remember { mutableStateOf<NavKey?>(null) }
            var analyticsConsent by remember { mutableStateOf(consentManager.hasAnalyticsConsent()) }
            var showDataConsentDialog by remember {
                mutableStateOf(
                    !consentManager.hasAnalyticsConsent() || !consentManager.hasCameraConsent(),
                )
            }
            var showLocationDisclosureDialog by remember { mutableStateOf(false) }

            LaunchedEffect(currentIntent) {
                val intent = currentIntent
                if (intent?.hasExtra("order_id") == true) {
                    val orderId = intent.getStringExtra("order_id") ?: ""
                    val arrivalStatus = intent.getStringExtra("arrival_status")
                    if (arrivalStatus != null) {
                        if (analyticsConsent) {
                            lifecycleScope.launch(Dispatchers.IO) {
                                try {
                                    network.ApiClient().recordInteraction(orderId, "arrival_status_$arrivalStatus")
                                } catch (e: Exception) {
                                    network.Telemetry.recordError("recordInteraction failed", e)
                                }
                            }
                        }
                    }
                    externalNavKey = NavKey.OrdersKey
                } else if (intent?.data != null) {
                    val uri = intent.data
                    if (uri?.scheme == "spresso" && uri.host != "coinbase-wallet-sdk") {
                        when (uri.host) {
                            "product" -> {
                                val productId = uri.lastPathSegment
                                if (productId != null) {
                                    externalNavKey = NavKey.ProductDetailKey(productId)
                                }
                            }
                            "wearables" -> {
                                externalNavKey = NavKey.MetaWearablesKey
                            }
                            "cart" -> {
                                externalNavKey = NavKey.HITLCheckoutKey
                            }
                            "orders" -> {
                                externalNavKey = NavKey.OrdersKey
                            }
                            "grocery" -> {
                                externalNavKey = NavKey.GroceryKey
                            }
                        }
                    }
                }
            }

            DisposableEffect(Unit) {
                lensResultHandler = { image -> externalNavKey = NavKey.ChatKey(initialImage = image) }
                onDispose { lensResultHandler = null }
            }

            DisposableEffect(Unit) {
                val receiver =
                    object : BroadcastReceiver() {
                        override fun onReceive(
                            context: Context?,
                            intent: Intent?,
                        ) {
                            when (intent?.action) {
                                "com.spresso.intent.action.START_COOKING",
                                "com.spresso.intent.action.COOKING_MODE",
                                -> {
                                    externalNavKey = NavKey.ChatKey(initialPrompt = "Help me cook something delicious!")
                                }
                                "com.spresso.intent.action.START_GROCERY",
                                "com.spresso.intent.action.GROCERY_MODE",
                                -> {
                                    externalNavKey = NavKey.GroceryKey
                                }
                                "com.spresso.intent.action.ADD_TO_CART" -> {
                                    val productId = intent.getStringExtra("productId")
                                    val actionId = intent.getStringExtra(SpressoWearablesService.EXTRA_ACTION_ID)
                                    val idempotencyKey = intent.getStringExtra(SpressoWearablesService.EXTRA_IDEMPOTENCY_KEY)
                                    val pendingResult = goAsync()
                                    lifecycleScope.launch {
                                        try {
                                            require(
                                                !productId.isNullOrBlank() && !actionId.isNullOrBlank() && !idempotencyKey.isNullOrBlank(),
                                            )
                                            network.callFirebaseFunction(
                                                "addToCart",
                                                JSONObject()
                                                    .put("productId", productId)
                                                    .put("quantity", 1)
                                                    .put("idempotencyKey", idempotencyKey)
                                                    .toString(),
                                            )
                                            externalNavKey = NavKey.ProductDetailKey(productId)
                                            sendBroadcast(
                                                Intent(SpressoWearablesService.ACTION_WEARABLE_ACTION_RESULT)
                                                    .setPackage(packageName)
                                                    .putExtra(SpressoWearablesService.EXTRA_ACTION_ID, actionId)
                                                    .putExtra(SpressoWearablesService.EXTRA_SUCCESS, true)
                                                    .putExtra(SpressoWearablesService.EXTRA_CUSTOMER_MESSAGE, "Added to your cart."),
                                            )
                                        } catch (error: Exception) {
                                            network.Telemetry.recordError("Wearable add-to-cart failed", error)
                                            if (!actionId.isNullOrBlank()) {
                                                sendBroadcast(
                                                    Intent(SpressoWearablesService.ACTION_WEARABLE_ACTION_RESULT)
                                                        .setPackage(packageName)
                                                        .putExtra(SpressoWearablesService.EXTRA_ACTION_ID, actionId)
                                                        .putExtra(SpressoWearablesService.EXTRA_SUCCESS, false)
                                                        .putExtra(
                                                            SpressoWearablesService.EXTRA_CUSTOMER_MESSAGE,
                                                            "I couldn’t add that item. Please try again.",
                                                        ),
                                                )
                                            }
                                        } finally {
                                            pendingResult.finish()
                                        }
                                    }
                                }
                                "com.spresso.intent.action.SEARCH_PRODUCTS" -> {
                                    val query = intent.getStringExtra("query").orEmpty().trim()
                                    val actionId = intent.getStringExtra(SpressoWearablesService.EXTRA_ACTION_ID)
                                    val pendingResult = goAsync()
                                    lifecycleScope.launch {
                                        try {
                                            require(query.isNotBlank() && !actionId.isNullOrBlank())
                                            val products =
                                                SpressoConnectorConnector.instance.listProducts
                                                    .execute()
                                                    .data.products
                                                    .filter {
                                                        "${it.name} ${it.brand} ${it.category} ${it.description.orEmpty()}"
                                                            .contains(query, ignoreCase = true)
                                                    }.take(5)
                                            val message =
                                                if (products.isEmpty()) {
                                                    "I couldn't find a current catalog match for $query."
                                                } else {
                                                    products.joinToString("; ") {
                                                        "id=${it.id}; ${it.name} by ${it.brand}, $${"%.2f".format(it.price)}"
                                                    }
                                                }
                                            sendBroadcast(
                                                Intent(SpressoWearablesService.ACTION_WEARABLE_ACTION_RESULT)
                                                    .setPackage(packageName)
                                                    .putExtra(SpressoWearablesService.EXTRA_ACTION_ID, actionId)
                                                    .putExtra(SpressoWearablesService.EXTRA_SUCCESS, true)
                                                    .putExtra(SpressoWearablesService.EXTRA_CUSTOMER_MESSAGE, message),
                                            )
                                        } catch (error: Exception) {
                                            network.Telemetry.recordError("Wearable product search failed", error)
                                            if (!actionId.isNullOrBlank()) {
                                                sendBroadcast(
                                                    Intent(SpressoWearablesService.ACTION_WEARABLE_ACTION_RESULT)
                                                        .setPackage(packageName)
                                                        .putExtra(SpressoWearablesService.EXTRA_ACTION_ID, actionId)
                                                        .putExtra(SpressoWearablesService.EXTRA_SUCCESS, false)
                                                        .putExtra(
                                                            SpressoWearablesService.EXTRA_CUSTOMER_MESSAGE,
                                                            "I couldn't search the catalog right now.",
                                                        ),
                                                )
                                            }
                                        } finally {
                                            pendingResult.finish()
                                        }
                                    }
                                }
                                "com.spresso.intent.action.START_CHECKOUT" -> {
                                    externalNavKey = NavKey.HITLCheckoutKey
                                    val actionId = intent.getStringExtra(SpressoWearablesService.EXTRA_ACTION_ID)
                                    if (!actionId.isNullOrBlank()) {
                                        sendBroadcast(
                                            Intent(SpressoWearablesService.ACTION_WEARABLE_ACTION_RESULT)
                                                .setPackage(packageName)
                                                .putExtra(SpressoWearablesService.EXTRA_ACTION_ID, actionId)
                                                .putExtra(SpressoWearablesService.EXTRA_SUCCESS, true)
                                                .putExtra(
                                                    SpressoWearablesService.EXTRA_CUSTOMER_MESSAGE,
                                                    "Checkout is open on your phone.",
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                val filter =
                    IntentFilter().apply {
                        addAction("com.spresso.intent.action.START_COOKING")
                        addAction("com.spresso.intent.action.START_GROCERY")
                        addAction("com.spresso.intent.action.COOKING_MODE")
                        addAction("com.spresso.intent.action.GROCERY_MODE")
                        addAction("com.spresso.intent.action.ADD_TO_CART")
                        addAction("com.spresso.intent.action.SEARCH_PRODUCTS")
                        addAction("com.spresso.intent.action.START_CHECKOUT")
                    }
                androidx.core.content.ContextCompat.registerReceiver(
                    this@MainActivity,
                    receiver,
                    filter,
                    androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED,
                )
                onDispose {
                    unregisterReceiver(receiver)
                }
            }
            var themeMode by remember { mutableStateOf(ThemeMode.SYSTEM) }

            DisposableEffect(Unit) {
                val listener =
                    FirebaseAuth.AuthStateListener { auth ->
                        user = auth.currentUser
                        isAuthLoading = false
                    }
                FirebaseAuth.getInstance().addAuthStateListener(listener)
                onDispose {
                    FirebaseAuth.getInstance().removeAuthStateListener(listener)
                }
            }

            val cleanUserName =
                user?.let { u ->
                    u.displayName?.trim()?.takeIf { it.isNotEmpty() }
                        ?: u.providerData
                            .firstOrNull { !it.displayName.isNullOrBlank() }
                            ?.displayName
                            ?.trim()
                        ?: u.email
                            ?.split("@")
                            ?.firstOrNull()
                            ?.replace(Regex("[._\\-]+"), " ")
                            ?.split(" ")
                            ?.joinToString(" ") { word -> word.replaceFirstChar { char -> char.uppercase() } }
                } ?: ""

            SpressoAndroidTheme(themeMode = themeMode) {
                androidx.compose.runtime.CompositionLocalProvider(
                    LocalConsentManager provides consentManager,
                    components.core.LocalAnalyticsConsent provides analyticsConsent,
                ) {
                    if (showDataConsentDialog) {
                        androidx.compose.material3.AlertDialog(
                            onDismissRequest = { /* Require explicit action */ },
                            title = { Text("Data & Privacy Consent") },
                            text = {
                                Text(
                                    "Spresso uses interaction data to improve product recommendations and requires camera access in the background when the wearable AI assistant is active. Do you consent to these features?",
                                )
                            },
                            confirmButton = {
                                androidx.compose.material3.TextButton(onClick = {
                                    consentManager.grantAnalyticsConsent()
                                    consentManager.grantCameraConsent()
                                    analyticsConsent = true
                                    showDataConsentDialog = false
                                }) { Text("I Agree") }
                            },
                            dismissButton = {
                                androidx.compose.material3.TextButton(onClick = {
                                    showDataConsentDialog = false
                                }) { Text("Decline") }
                            },
                        )
                    }

                    if (showLocationDisclosureDialog) {
                        androidx.compose.material3.AlertDialog(
                            onDismissRequest = { showLocationDisclosureDialog = false },
                            title = { Text("Location Collection Disclosure") },
                            text = {
                                Text(
                                    "Spresso collects your precise location to provide personalized, location-based product recommendations and realistic weather context during AI chat sessions. This location data is securely transmitted to our backend during your chat sessions.",
                                )
                            },
                            confirmButton = {
                                androidx.compose.material3.TextButton(onClick = {
                                    showLocationDisclosureDialog = false
                                    locationPermissionRequest.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION,
                                        ),
                                    )
                                }) { Text("I Agree") }
                            },
                            dismissButton = {
                                androidx.compose.material3.TextButton(onClick = {
                                    showLocationDisclosureDialog = false
                                }) { Text("Decline") }
                            },
                        )
                    }

                    App(
                        currentUserUid = user?.uid,
                        currentUserName = cleanUserName,
                        externalNavKey = externalNavKey,
                        isAuthLoading = isAuthLoading,
                        currentLatLng = currentLatLngState.value,
                        onRequestLocationPermission = {
                            showLocationDisclosureDialog = true
                        },
                        onShare = { productId ->
                            val sendIntent =
                                Intent().apply {
                                    action = Intent.ACTION_SEND
                                    putExtra(Intent.EXTRA_TEXT, "Check out this product on Spresso! Product ID: $productId")
                                    type = "text/plain"
                                }
                            startActivity(Intent.createChooser(sendIntent, null))
                        },
                        isAccessibilityEnabled = isAccessEnabled,
                        hasAccessibilityConsent = hasConsent,
                        showAccessibilityDisclosure = showDisclosure,
                        onToggleAccessibility = ::requestAccessibilitySettingsOrDisclosure,
                        onAccessibilityConsentAccepted = ::acceptAccessibilityConsent,
                        onDismissAccessibilityDisclosure = {
                            accessibilityDisclosureRequestedState.value = false
                        },
                        onRevokeAccessibilityConsent = ::revokeAccessibilityConsent,
                        onRequestAccessibilityScan = ::requestOneShotScreenScan,
                        onTriggerGlobalLens = {
                            requestUserInitiatedScreenCapture()
                        },
                        onLensResult = { image -> externalNavKey = NavKey.ChatKey(initialImage = image) },
                        onGoogleSignInRequested = googleSignIn@{
                            val serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
                            if (serverClientId.isBlank()) {
                                Toast.makeText(this@MainActivity, "Google Sign-In isn’t available yet.", Toast.LENGTH_LONG).show()
                                return@googleSignIn
                            }
                            val credentialManager = CredentialManager.create(this@MainActivity)
                            val googleIdOption =
                                GetGoogleIdOption
                                    .Builder()
                                    .setFilterByAuthorizedAccounts(false)
                                    .setServerClientId(serverClientId)
                                    .setAutoSelectEnabled(true)
                                    .build()

                            val request =
                                GetCredentialRequest
                                    .Builder()
                                    .addCredentialOption(googleIdOption)
                                    .build()

                            lifecycleScope.launch(Dispatchers.Main) {
                                try {
                                    val result =
                                        credentialManager.getCredential(
                                            context = this@MainActivity,
                                            request = request,
                                        )
                                    val credential = result.credential
                                    if (credential.type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                        val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
                                        FirebaseAuth.getInstance().signInWithCredential(firebaseCredential)
                                    }
                                } catch (e: androidx.credentials.exceptions.NoCredentialException) {
                                    Toast.makeText(this@MainActivity, "No Google account was selected.", Toast.LENGTH_SHORT).show()
                                } catch (e: androidx.credentials.exceptions.GetCredentialException) {
                                    Toast.makeText(this@MainActivity, "Google Sign-In was cancelled.", Toast.LENGTH_SHORT).show()
                                } catch (e: Exception) {
                                    Toast.makeText(this@MainActivity, "Google Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
                                }
                            }
                        },
                        onPhoneSignInRequested = {
                            val providers =
                                arrayListOf(
                                    com.firebase.ui.auth.AuthUI.IdpConfig
                                        .PhoneBuilder()
                                        .build(),
                                )
                            val signInIntent =
                                com.firebase.ui.auth.AuthUI
                                    .getInstance()
                                    .createSignInIntentBuilder()
                                    .setAvailableProviders(providers)
                                    .build()
                            phoneAuthLauncher.launch(signInIntent)
                        },
                        onVerifyEmailRequested = {
                            val credentialManager = CredentialManager.create(this@MainActivity)
                            val nonce =
                                java.util.UUID
                                    .randomUUID()
                                    .toString()
                            val openId4vpRequest =
                                """
                                {
                                  "requests": [
                                    {
                                      "protocol": "openid4vp-v1-unsigned",
                                      "data": {
                                        "response_type": "vp_token",
                                        "response_mode": "dc_api",
                                        "nonce": "$nonce",
                                        "dcql_query": {
                                          "credentials": [
                                            {
                                              "id": "user_info_query",
                                              "format": "dc+sd-jwt",
                                               "meta": { 
                                                  "vct_values": ["UserInfoCredential"] 
                                               },
                                              "claims": [ 
                                                {"path": ["email"]}, 
                                                {"path": ["name"]},  
                                                {"path": ["given_name"]},
                                                {"path": ["family_name"]},
                                                {"path": ["picture"]},
                                                {"path": ["hd"]},
                                                {"path": ["email_verified"]}
                                              ]
                                            }
                                          ]
                                        }
                                      }
                                    }
                                  ]
                                }
                                """.trimIndent()
                            val getDigitalCredentialOption = androidx.credentials.GetDigitalCredentialOption(requestJson = openId4vpRequest)
                            val request =
                                GetCredentialRequest
                                    .Builder()
                                    .addCredentialOption(getDigitalCredentialOption)
                                    .build()
                            lifecycleScope.launch(Dispatchers.Main) {
                                try {
                                    val result =
                                        credentialManager.getCredential(
                                            context = this@MainActivity,
                                            request = request,
                                        )
                                    val credential = result.credential
                                    if (credential is androidx.credentials.DigitalCredential) {
                                        val responseJsonString = credential.credentialJson
                                        val jsonObj = org.json.JSONObject(responseJsonString)
                                        val vpToken = jsonObj.optJSONObject("vp_token")
                                        val credentialId = vpToken?.keys()?.let { if (it.hasNext()) it.next() else null }
                                        if (credentialId != null) {
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                val client = network.ApiClient()
                                                val customToken = client.verifyEmailCredential(responseJsonString, nonce)
                                                withContext(Dispatchers.Main) {
                                                    if (customToken != null) {
                                                        FirebaseAuth
                                                            .getInstance()
                                                            .signInWithCustomToken(customToken)
                                                            .addOnSuccessListener {
                                                                Toast
                                                                    .makeText(
                                                                        this@MainActivity,
                                                                        "Digital Credential Verified!",
                                                                        Toast.LENGTH_SHORT,
                                                                    ).show()
                                                            }.addOnFailureListener {
                                                                Toast
                                                                    .makeText(
                                                                        this@MainActivity,
                                                                        "Firebase Custom Auth failed",
                                                                        Toast.LENGTH_SHORT,
                                                                    ).show()
                                                            }
                                                    } else {
                                                        Toast
                                                            .makeText(
                                                                this@MainActivity,
                                                                "Backend verification failed",
                                                                Toast.LENGTH_SHORT,
                                                            ).show()
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (e: androidx.credentials.exceptions.NoCredentialException) {
                                    Toast.makeText(this@MainActivity, "No digital credential was selected.", Toast.LENGTH_SHORT).show()
                                } catch (e: androidx.credentials.exceptions.GetCredentialException) {
                                    Toast.makeText(this@MainActivity, "Digital credential error: ${e.message}", Toast.LENGTH_LONG).show()
                                } catch (e: Exception) {
                                    Toast.makeText(this@MainActivity, "Digital credential error: ${e.message}", Toast.LENGTH_LONG).show()
                                }
                            }
                        },
                    )
                }
            }
        }
    }

    fun requestPhoneVerification(
        phoneNumber: String,
        callbacks: PhoneAuthProvider.OnVerificationStateChangedCallbacks,
    ) {
        val options =
            PhoneAuthOptions
                .newBuilder(FirebaseAuth.getInstance())
                .setPhoneNumber(phoneNumber)
                .setTimeout(60L, TimeUnit.SECONDS)
                .setActivity(this)
                .setCallbacks(callbacks)
                .build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    fun signInWithPhoneCredential(credential: PhoneAuthCredential) {
        FirebaseAuth
            .getInstance()
            .signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    Toast.makeText(this, "Phone authentication successful!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Phone auth failed: ${task.exception?.message}", Toast.LENGTH_LONG).show()
                }
            }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        currentIntentState.value = intent
        CoinbaseWalletManager.handleResponse(intent.data)
        if (isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
        if (intent.action == ACTION_USER_SCREEN_CAPTURE) {
            requestUserInitiatedScreenCapture()
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val params =
                android.app.PictureInPictureParams
                    .Builder()
                    .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onResume() {
        super.onResume()
        currentActivity = this
        if (::accessibilityConsentStore.isInitialized) {
            refreshAccessibilityState()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (currentActivity == this) {
            currentActivity = null
        }
    }

    private fun isAccessibilityDisclosureIntent(intent: Intent?): Boolean =
        intent?.getBooleanExtra(EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE, false) == true ||
            intent?.getBooleanExtra("open_lens", false) == true

    private fun refreshAccessibilityState() {
        hasAccessibilityConsentState.value = accessibilityConsentStore.hasCurrentConsent()
        // MediaProjection is granted per capture by the Android system dialog;
        // no persistent accessibility service is required.
        isAccessibilityEnabledState.value = true
    }

    private fun requestAccessibilitySettingsOrDisclosure() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        requestUserInitiatedScreenCapture()
    }

    private fun acceptAccessibilityConsent() {
        accessibilityConsentStore.grantCurrentConsent()
        hasAccessibilityConsentState.value = true
        accessibilityDisclosureRequestedState.value = false
        requestUserInitiatedScreenCapture()
    }

    private fun revokeAccessibilityConsent() {
        accessibilityConsentStore.revokeConsent()
        hasAccessibilityConsentState.value = false
    }

    private fun requestOneShotScreenScan() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        requestUserInitiatedScreenCapture()
    }

    private fun requestUserInitiatedScreenCapture() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        screenCaptureLauncher.launch(screenCapture.permissionIntent())
    }

    companion object {
        const val ACTION_USER_SCREEN_CAPTURE = "com.spresso.action.USER_SCREEN_CAPTURE"
        const val EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE = "open_accessibility_disclosure"
        var currentActivity: FragmentActivity? = null
    }
}

@Preview(showBackground = true)
@Composable
fun LogoPreview() {
    components.core.SpressoLogo(size = components.core.LogoSize.Large)
}
