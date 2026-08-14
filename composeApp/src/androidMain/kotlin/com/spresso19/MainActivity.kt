package com.spresso19

import components.core.LogoSize
import components.core.SpressoLogo
import App
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
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
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.Companion.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.FirebaseException
import java.util.concurrent.TimeUnit
import theme.SpressoAndroidTheme
import theme.ThemeMode

class MainActivity : ComponentActivity() {

    private val recordAudioRequestCode = 101
    private val isAccessibilityEnabledState = mutableStateOf(false)
    private val hasAccessibilityConsentState = mutableStateOf(false)
    private val accessibilityDisclosureRequestedState = mutableStateOf(false)
    private lateinit var accessibilityConsentStore: AccessibilityConsentStore

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        currentActivity = this
        accessibilityConsentStore = AccessibilityConsentStore(this)
        if (savedInstanceState == null && isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
        refreshAccessibilityState()

        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        checkAndRequestAudioPermission()

        setContent {
            val darkTheme = isSystemInDarkTheme()
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.isAppearanceLightStatusBars = !darkTheme
            controller.isAppearanceLightNavigationBars = !darkTheme

            val isAccessEnabled by isAccessibilityEnabledState
            val hasConsent by hasAccessibilityConsentState
            val showDisclosure by accessibilityDisclosureRequestedState
            
            var user by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
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
                    onGoogleSignInRequested = {
                        val credentialManager = CredentialManager.create(this@MainActivity)
                        val googleIdOption = GetGoogleIdOption.Builder()
                            .setFilterByAuthorizedAccounts(false)
                            .setServerClientId("656500460421-f02h94qsiq3s5hvltdak54r932bvgbnm.apps.googleusercontent.com")
                            .setAutoSelectEnabled(true)
                            .build()

                        val request = GetCredentialRequest.Builder()
                            .addCredentialOption(googleIdOption)
                            .build()

                        CoroutineScope(Dispatchers.Main).launch {
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
                    onEmailSignInRequested = { email, password ->
                        FirebaseAuth.getInstance().signInWithEmailAndPassword(email, password)
                            .addOnFailureListener { e ->
                                Toast.makeText(this@MainActivity, "Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                    },
                    onEmailSignUpRequested = { name, email, password ->
                        FirebaseAuth.getInstance().createUserWithEmailAndPassword(email, password)
                            .addOnSuccessListener {
                                val profileUpdates = UserProfileChangeRequest.Builder()
                                    .setDisplayName(name)
                                    .build()
                                it.user?.updateProfile(profileUpdates)
                            }
                            .addOnFailureListener { e ->
                                Toast.makeText(this@MainActivity, "Sign-Up failed: ${e.message}", Toast.LENGTH_LONG).show()
                            }
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
                        CoroutineScope(Dispatchers.Main).launch {
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
                                        Toast.makeText(this@MainActivity, "Received verified email SD-JWT!", Toast.LENGTH_SHORT).show()
                                        // TODO: Send responseJsonString and nonce to /api/auth/verify-email-credential for server-side validation
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
        if (isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
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

    private fun checkAndRequestAudioPermission() {
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                recordAudioRequestCode
            )
        }
    }

    companion object {
        const val EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE = "open_accessibility_disclosure"
        var currentActivity: ComponentActivity? = null
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
