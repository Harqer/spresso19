package components.features.onboarding

import components.models.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessibilityNew
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Recommend
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.onboarding.OnboardingStepCard
import components.features.onboarding.OnboardingXpBadge

/**
 * GamifiedOnboardingSection (78 lines).
 * Leverages Jetpack Compose AnimatedContent and AnimatedVisibility for smooth layout transitions.
 */
@Composable
fun GamifiedOnboardingSection(
    currentStep: Int,
    totalXp: Int,
    tryOnTested: Boolean,
    cardSaved: Boolean,
    wardrobeSynced: Boolean,
    onTestTryOn: () -> Unit,
    onSaveCard: () -> Unit,
    onSyncWardrobe: () -> Unit,
    modifier: Modifier = Modifier
) {
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        AnimatedVisibility(
            visible = true,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            OnboardingXpBadge(
                currentStep = currentStep,
                totalSteps = 4,
                totalXp = totalXp
            )
        }

        AnimatedContent(
            targetState = currentStep,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "OnboardingStepTransition"
        ) { targetStep ->
            when (targetStep) {
                1 -> OnboardingStepCard(
                    title = "Virtual Try-On Quest",
                    description = "Visualize garments & 3D outfits on your custom AR avatar before buying.",
                    icon = Icons.Default.AccessibilityNew,
                    isCompleted = tryOnTested,
                    actionText = if (tryOnTested) "Try-On Verified (+150 XP)" else "Launch Virtual Try-On",
                    onActionClick = onTestTryOn
                )

                2 -> OnboardingStepCard(
                    title = "Fast Checkout & Wallet Quest",
                    description = "Add credit card or link Google Wallet for 1-tap fast checkouts.",
                    icon = Icons.Default.CreditCard,
                    isCompleted = cardSaved,
                    actionText = if (cardSaved) "Payment Method Saved (+150 XP)" else "Save Payment Wallet",
                    onActionClick = onSaveCard
                )

                3 -> OnboardingStepCard(
                    title = "Wardrobe & Gallery Quest",
                    description = "Connect photo gallery to auto-sync closet items & match styles.",
                    icon = Icons.Default.PhotoLibrary,
                    isCompleted = wardrobeSynced,
                    actionText = if (wardrobeSynced) "Photo Gallery Synced (+150 XP)" else "Connect Photo Gallery",
                    onActionClick = onSyncWardrobe
                )

                else -> {
                    val scope = androidx.compose.runtime.rememberCoroutineScope()
                    val apiClient = androidx.compose.runtime.remember { network.ApiClient() }
                    OnboardingStepCard(
                        title = "For You Recommendations",
                        description = "We are curating your personalized recommendations, exclusive deals, and trending styles based on your unique fashion profile as we learn more about your tastes.",
                        icon = Icons.Default.Recommend,
                        isCompleted = true,
                        actionText = if (errorMessage != null) errorMessage!! else "Claim SPRESSO10 VIP Pass",
                        onActionClick = { 
                            scope.launch {
                                try {
                                    apiClient.recordInteraction("VIP_PASS", "CLAIM")
                                } catch (e: Exception) {
                                    errorMessage = "Failed to claim VIP pass. Please try again."
                                    network.Telemetry.recordError("Failed to claim VIP pass", e)
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}
