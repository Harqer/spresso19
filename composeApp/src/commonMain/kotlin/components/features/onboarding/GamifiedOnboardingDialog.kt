package components.features.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import components.models.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

@Composable
fun GamifiedOnboardingDialog(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    onComplete: () -> Unit,
) {
    if (!isOpen) return

    val scope = rememberCoroutineScope()
    var currentStep by remember { mutableStateOf(1) }
    var totalXp by remember { mutableStateOf(100) }
    var tryOnTested by remember { mutableStateOf(false) }
    var cardSaved by remember { mutableStateOf(false) }
    var wardrobeSynced by remember { mutableStateOf(false) }
    var passkeyRegistered by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(20.dp),
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                GamifiedOnboardingSection(
                    currentStep = currentStep,
                    totalXp = totalXp,
                    tryOnTested = tryOnTested,
                    cardSaved = cardSaved,
                    wardrobeSynced = wardrobeSynced,
                    passkeyRegistered = passkeyRegistered,
                    onTestTryOn = {
                        tryOnTested = true
                        totalXp += 150
                    },
                    onSaveCard = {
                        cardSaved = true
                        totalXp += 150
                    },
                    onSyncWardrobe = {
                        wardrobeSynced = true
                        totalXp += 150
                    },
                    onRegisterPasskey = {
                        passkeyRegistered = true
                        totalXp += 150
                    },
                    onSelectInterests = { interests ->
                        totalXp += 150
                        scope.launch {
                            try {
                                val apiClient = network.ApiClient()
                                val behaviorResult = apiClient.analyzeUserBehavior(interests)

                                // Fetch current profile to update it, or create a new one.
                                val uid = network.getCurrentUserUid()
                                if (uid != null) {
                                    val inferredPainPoints =
                                        behaviorResult["inferredPainPoints"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
                                    val summary = behaviorResult["behavioralProfileSummary"]?.jsonPrimitive?.content ?: ""

                                    val currentUser = apiClient.fetchUserProfile(uid)
                                    val updatedProfile =
                                        currentUser.copy(
                                            explicitInterests = interests,
                                            inferredPainPoints = inferredPainPoints,
                                            behavioralProfileSummary = summary,
                                        )
                                    apiClient.updateUserProfile(updatedProfile)

                                    // Seed the PyTorch ranking engine's Thompson Sampling Bandit with their choices
                                    apiClient.initializeOnboarding(uid, interests)

                                    println("Analyzed & Persisted behavior for UID $uid: $behaviorResult")
                                } else {
                                    println("User is not signed in. Skipping profile update.")
                                }
                                apiClient.close()
                            } catch (e: Exception) {
                                network.Telemetry.recordError("Behavior analysis failed", e)
                            }
                        }
                    },
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    if (currentStep > 1) {
                        Button(
                            onClick = { currentStep -= 1 },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Text("Back", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }

                    if (currentStep < 6) {
                        Button(
                            onClick = {
                                currentStep += 1
                                totalXp += 50
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        ) {
                            Text("Continue", color = MaterialTheme.colorScheme.onPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Button(
                            onClick = onComplete,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                        ) {
                            Text(
                                "Explore Spresso",
                                color = MaterialTheme.colorScheme.onTertiary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                }
            }
        }
    }
}
