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
import com.spresso.app.BuildConfig
import com.spresso.engage.EngageBroadcastReceiver
import components.core.LogoSize
import components.core.SpressoLogo
import components.features.profile.CoinbaseWalletManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import navigation.NavKey
import network.AndroidActivityBridge
import theme.SpressoAndroidTheme
import theme.ThemeMode
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
            } else if (response?.error != null) {
                Toast.makeText(this, "Phone sign-in failed. Please try again.", Toast.LENGTH_SHORT).show()
                network.Telemetry.recordError("Phone auth error", response.error!!)
            } else {
                Toast.makeText(this, "Phone sign-in was cancelled.", Toast.LENGTH_SHORT).show()
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

    private val notificationPermissionRequest =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ ->
            // POST_NOTIFICATIONS is optional; notifications simply stay disabled when declined.
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        AndroidActivityBridge.currentActivity = this

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
        currentIntentState.value = intent
        if (intent?.action == AndroidActivityBridge.ACTION_USER_SCREEN_CAPTURE) {
            requestUserInitiatedScreenCapture()
        }

        setContent {
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
                                    network.ConvexApi().recordInteraction(orderId, "arrival_status_$arrivalStatus")
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
                                            val requestedProductId = productId
                                            withContext(Dispatchers.IO) {
                                                val convexApi = network.ConvexApi()
                                                val product =
                                                    convexApi.fetchProductById(requestedProductId)
                                                        ?: error("External listing not found")
                                                if (!convexApi.addCartItem(product, 1)) error("Cart update failed")
                                            }
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
                                                withContext(Dispatchers.IO) {
                                                    network.ConvexApi().searchProducts(query)
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
                val auth = FirebaseAuth.getInstance()
                val updateUser: (FirebaseAuth) -> Unit = { firebaseAuth ->
                    user = firebaseAuth.currentUser
                    isAuthLoading = false
                }
                val authStateListener = FirebaseAuth.AuthStateListener(updateUser)
                val idTokenListener = FirebaseAuth.IdTokenListener(updateUser)
                auth.addAuthStateListener(authStateListener)
                auth.addIdTokenListener(idTokenListener)
                onDispose {
                    auth.removeAuthStateListener(authStateListener)
                    auth.removeIdTokenListener(idTokenListener)
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
                                    "Spresso uses interaction data to improve product recommendations and requires camera access " +
                                        "in the background when the wearable AI assistant is active. Do you consent to these features?",
                                )
                            },
                            confirmButton = {
                                androidx.compose.material3.TextButton(onClick = {
                                    consentManager.grantAnalyticsConsent()
                                    consentManager.grantCameraConsent()
                                    analyticsConsent = true
                                    showDataConsentDialog = false
                                    if (
                                        android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
                                        !androidx.core.content.ContextCompat
                                            .checkSelfPermission(
                                                this@MainActivity,
                                                Manifest.permission.POST_NOTIFICATIONS,
                                            ).let { it == android.content.pm.PackageManager.PERMISSION_GRANTED }
                                    ) {
                                        notificationPermissionRequest.launch(Manifest.permission.POST_NOTIFICATIONS)
                                    }
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
                                    "Spresso collects your precise location to provide personalized, location-based product " +
                                        "recommendations and realistic weather context during AI chat sessions. This location " +
                                        "data is securely transmitted to our backend during your chat sessions.",
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
                        isEmailVerificationRequired =
                            user?.let { firebaseUser ->
                                firebaseUser.providerData.any { provider -> provider.providerId == "password" } &&
                                    !firebaseUser.isEmailVerified
                            } == true,
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
                            lifecycleScope.launch {
                                val sent = network.sendEmailVerification()
                                Toast
                                    .makeText(
                                        this@MainActivity,
                                        if (sent) {
                                            "Verification email sent. Check your inbox, then return to Spresso."
                                        } else {
                                            "Unable to send a verification email. Please try again."
                                        },
                                        Toast.LENGTH_LONG,
                                    ).show()
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
        if (intent.action == AndroidActivityBridge.ACTION_USER_SCREEN_CAPTURE) {
            requestUserInitiatedScreenCapture()
        }
    }

    override fun onResume() {
        super.onResume()
        AndroidActivityBridge.currentActivity = this

        FirebaseAuth.getInstance().currentUser?.reload()

        if (::accessibilityConsentStore.isInitialized) {
            refreshAccessibilityState()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (AndroidActivityBridge.currentActivity == this) {
            AndroidActivityBridge.currentActivity = null
        }
    }

    private fun isAccessibilityDisclosureIntent(intent: Intent?): Boolean =
        intent?.getBooleanExtra(AndroidActivityBridge.EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE, false) == true ||
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
    }
}

@Preview(showBackground = true)
@Composable
fun LogoPreview() {
    components.core.SpressoLogo(size = components.core.LogoSize.Large)
}
