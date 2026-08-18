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
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
    passkeyRegistered: Boolean,
    onTestTryOn: () -> Unit,
    onSaveCard: () -> Unit,
    onSyncWardrobe: () -> Unit,
    onRegisterPasskey: () -> Unit,
    onSelectInterests: (List<String>) -> Unit,
    modifier: Modifier = Modifier
) {
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isInterestsCompleted by remember { mutableStateOf(false) }
    var selectedInterests by remember { mutableStateOf<List<String>>(emptyList()) }

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
                totalSteps = 5,
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

                4 -> components.features.auth.PasskeyRegistrationStep(
                    isCompleted = passkeyRegistered,
                    onPasskeyRegistered = onRegisterPasskey
                )

                5 -> {
                    OnboardingInterestsCard(
                        title = "Select Interests",
                        description = "Tell us what you love to curate your feed.",
                        icon = Icons.Default.FavoriteBorder,
                        isCompleted = isInterestsCompleted,
                        actionText = "Save Interests",
                        availableInterests = listOf("Sports & Outdoors", "Consumer Technology", "Women's Fashion", "Men's Fashion", "Beauty & Skincare", "Home & Interior Design", "Health & Wellness", "Automotive & Gadgets"),
                        onActionClick = { interests -> 
                            selectedInterests = interests
                            isInterestsCompleted = true
                            onSelectInterests(interests)
                        }
                    )
                }

                else -> {
                    val scope = androidx.compose.runtime.rememberCoroutineScope()
                    OnboardingStepCard(
                        title = "Spresso VIP Activation",
                        description = "Your Genkit-powered AI Personal Shopper is now activated and ready to hunt down the best exclusive deals.",
                        icon = Icons.Default.Recommend,
                        isCompleted = true,
                        actionText = if (errorMessage != null) errorMessage!! else "Claim SPRESSO10 VIP Pass",
                        onActionClick = { 
                            scope.launch {
                                try {
                                    network.SpressoBackend.updateOnboardingStatus(currentStep = 5, isCompleted = true)
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
