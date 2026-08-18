package com.spresso19

import components.features.profile.CoinbaseWalletHelper

import components.core.LogoSize
import components.core.SpressoLogo
import App
import android.Manifest
import android.content.Intent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import navigation.NavKey
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import java.util.UUID

import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.Companion.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.FirebaseException
import java.util.concurrent.TimeUnit
import androidx.lifecycle.lifecycleScope
import theme.SpressoAndroidTheme
import theme.ThemeMode
import com.spresso19.engage.EngageBroadcastReceiver

@kotlin.OptIn(androidx.credentials.ExperimentalDigitalCredentialApi::class)
class MainActivity : FragmentActivity() {

    private val permissionsRequestCode = 101
    private val isAccessibilityEnabledState = mutableStateOf(false)
    private val hasAccessibilityConsentState = mutableStateOf(false)
    private val accessibilityDisclosureRequestedState = mutableStateOf(false)
    private lateinit var accessibilityConsentStore: AccessibilityConsentStore

    private val phoneAuthLauncher = registerForActivityResult(com.firebase.ui.auth.FirebaseAuthUIActivityResultContract()) { res ->
        val response = res.idpResponse
        if (res.resultCode == RESULT_OK) {
            Toast.makeText(this, "Phone authentication successful!", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Phone auth failed: ${response?.error?.errorCode}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        currentActivity = this
        accessibilityConsentStore = AccessibilityConsentStore(this)
        if (intent?.data != null) {
            CoinbaseWalletHelper.handleResponse(intent.data)
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
        checkAndRequestPermissions()

        setContent {
            val darkTheme = isSystemInDarkTheme()

            val isAccessEnabled by isAccessibilityEnabledState
            val hasConsent by hasAccessibilityConsentState
            val showDisclosure by accessibilityDisclosureRequestedState
            
            var user by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
            var externalNavKey by remember { mutableStateOf<NavKey?>(null) }

            LaunchedEffect(intent) {
                if (intent?.hasExtra("order_id") == true) {
                    val orderId = intent.getStringExtra("order_id") ?: ""
                    val arrivalStatus = intent.getStringExtra("arrival_status")
                    if (arrivalStatus != null) {
                        lifecycleScope.launch(Dispatchers.IO) {
                            try {
                                network.ApiClient().recordInteraction(orderId, "arrival_status_$arrivalStatus")
                            } catch (e: Exception) {
                                network.Telemetry.recordError("recordInteraction failed", e)
                            }
                        }
                    }
                    externalNavKey = NavKey.OrdersKey
                }
            }

            DisposableEffect(Unit) {
                val receiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context?, intent: Intent?) {
                        when (intent?.action) {
                            "com.spresso19.intent.action.START_COOKING" -> {
                                externalNavKey = NavKey.ChatKey(initialPrompt = "Help me cook something delicious!")
                            }
                            "com.spresso19.intent.action.START_GROCERY" -> {
                                externalNavKey = NavKey.GroceryKey
                            }
                        }
                    }
                }
                val filter = IntentFilter().apply {
                    addAction("com.spresso19.intent.action.START_COOKING")
                    addAction("com.spresso19.intent.action.START_GROCERY")
                }
                androidx.core.content.ContextCompat.registerReceiver(
                    this@MainActivity,
                    receiver,
                    filter,
                    androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED
                )
                onDispose {
                    unregisterReceiver(receiver)
                }
            }
            var themeMode by remember { mutableStateOf(ThemeMode.SYSTEM) }
            
            DisposableEffect(Unit) {
                val listener = FirebaseAuth.AuthStateListener { auth ->
                    user = auth.currentUser
                }
                FirebaseAuth.getInstance().addAuthStateListener(listener)
                onDispose {
                    FirebaseAuth.getInstance().removeAuthStateListener(listener)
                }
            }

            val cleanUserName = user?.let { u ->
                u.displayName?.trim()?.takeIf { it.isNotEmpty() }
                    ?: u.providerData.firstOrNull { !it.displayName.isNullOrBlank() }?.displayName?.trim()
                    ?: u.email?.split("@")?.firstOrNull()?.replace(Regex("[._\\-]+"), " ")
                        ?.split(" ")?.joinToString(" ") { word -> word.replaceFirstChar { char -> char.uppercase() } }
            } ?: ""

            SpressoAndroidTheme(themeMode = themeMode) {
                App(
                    currentUserUid = user?.uid,
                    currentUserName = cleanUserName,
                    externalNavKey = externalNavKey,
                    onShare = { productId ->
                        val sendIntent = Intent().apply {
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
                        val intent = Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN).apply {
                            setPackage(packageName)
                            putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, java.util.UUID.randomUUID().toString())
                            putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
                        }
                        sendBroadcast(intent)
                        moveTaskToBack(true)
                    },
                    onGoogleSignInRequested = {
                        val credentialManager = CredentialManager.create(this@MainActivity)
                        val googleIdOption = GetGoogleIdOption.Builder()
                            .setFilterByAuthorizedAccounts(false)
                            .setServerClientId(getString(R.string.default_web_client_id))
                            .setAutoSelectEnabled(true)
                            .build()

                        val request = GetCredentialRequest.Builder()
                            .addCredentialOption(googleIdOption)
                            .build()

                        lifecycleScope.launch(Dispatchers.Main) {
                            try {
                                val result = credentialManager.getCredential(
                                    context = this@MainActivity,
                                    request = request
                                )
                                val credential = result.credential
                                if (credential.type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                    val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
                                    FirebaseAuth.getInstance().signInWithCredential(firebaseCredential)
                                }
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Google Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onPhoneSignInRequested = {
                        val providers = arrayListOf(
                            com.firebase.ui.auth.AuthUI.IdpConfig.PhoneBuilder().build()
                        )
                        val signInIntent = com.firebase.ui.auth.AuthUI.getInstance()
                            .createSignInIntentBuilder()
                            .setAvailableProviders(providers)
                            .build()
                        phoneAuthLauncher.launch(signInIntent)
                    },
                    onVerifyEmailRequested = {
                        val credentialManager = CredentialManager.create(this@MainActivity)
                        val nonce = java.util.UUID.randomUUID().toString()
                        val openId4vpRequest = """
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
                        val request = GetCredentialRequest.Builder()
                            .addCredentialOption(getDigitalCredentialOption)
                            .build()
                        lifecycleScope.launch(Dispatchers.Main) {
                            try {
                                val result = credentialManager.getCredential(
                                    context = this@MainActivity,
                                    request = request
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
                                                    FirebaseAuth.getInstance().signInWithCustomToken(customToken)
                                                        .addOnSuccessListener {
                                                            Toast.makeText(this@MainActivity, "Digital Credential Verified!", Toast.LENGTH_SHORT).show()
                                                        }
                                                        .addOnFailureListener {
                                                            Toast.makeText(this@MainActivity, "Firebase Custom Auth failed", Toast.LENGTH_SHORT).show()
                                                        }
                                                } else {
                                                    Toast.makeText(this@MainActivity, "Backend verification failed", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Digital credential error: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                )
            }
        }
    }

    fun requestPhoneVerification(phoneNumber: String, callbacks: PhoneAuthProvider.OnVerificationStateChangedCallbacks) {
        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(this)
            .setCallbacks(callbacks)
            .build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    fun signInWithPhoneCredential(credential: PhoneAuthCredential) {
        FirebaseAuth.getInstance().signInWithCredential(credential)
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
        CoinbaseWalletHelper.handleResponse(intent.data)
        if (isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val params = android.app.PictureInPictureParams.Builder().build()
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
        isAccessibilityEnabledState.value = AccessibilityServiceState.isExactServiceEnabled(this)
    }

    private fun requestAccessibilitySettingsOrDisclosure() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        openAccessibilitySettings()
    }

    private fun acceptAccessibilityConsent() {
        accessibilityConsentStore.grantCurrentConsent()
        hasAccessibilityConsentState.value = true
        accessibilityDisclosureRequestedState.value = false
        // This is reached only from the disclosure's affirmative action.
        openAccessibilitySettings()
    }

    private fun openAccessibilitySettings() {
        val accessState = AccessibilityAccessState(
            hasAppConsent = accessibilityConsentStore.hasCurrentConsent(),
            isSystemServiceEnabled = AccessibilityServiceState.isExactServiceEnabled(this)
        )
        if (!accessState.canOpenSystemSettings()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        try {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        } catch (_: Exception) {
            Toast.makeText(
                this,
                "Accessibility settings are unavailable on this device.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun revokeAccessibilityConsent() {
        accessibilityConsentStore.revokeConsent()
        hasAccessibilityConsentState.value = false
        sendBroadcast(
            Intent(AccessibilityServiceCommands.ACTION_REVOKE_CONSENT)
                .setPackage(packageName)
        )
        refreshAccessibilityState()
    }

    private fun requestOneShotScreenScan() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        val accessState = AccessibilityAccessState(
            hasAppConsent = accessibilityConsentStore.hasCurrentConsent(),
            isSystemServiceEnabled = AccessibilityServiceState.isExactServiceEnabled(this)
        )
        if (!accessState.canCapture()) {
            Toast.makeText(
                this,
                "Turn on Spresso screen search in Android settings first.",
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        // A new token and timestamp are created for every visible scan action.
        sendBroadcast(
            Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN)
                .setPackage(packageName)
                .putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, UUID.randomUUID().toString())
                .putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
                .putExtra(AccessibilityServiceCommands.EXTRA_DISPLAY_ID, android.view.Display.DEFAULT_DISPLAY)
        )
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        val ungranted = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (ungranted.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                ungranted.toTypedArray(),
                permissionsRequestCode
            )
        }
    }

    companion object {
        const val EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE = "open_accessibility_disclosure"
        var currentActivity: FragmentActivity? = null
    }
}

@Preview(showBackground = true)
@Composable
fun LogoPreview() {
    components.core.SpressoLogo(size = components.core.LogoSize.Large)
}

@Preview(showBackground = true)
@Composable
fun TestPreview() {
    Text("Hello World")
}
