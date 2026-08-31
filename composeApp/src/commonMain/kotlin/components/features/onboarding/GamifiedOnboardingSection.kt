package components.features.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessibilityNew
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.auth.PasskeyRegistrationResult
import components.models.*

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
    onRegisterPasskey: suspend () -> PasskeyRegistrationResult,
    onSelectInterests: (List<String>) -> Unit,
    modifier: Modifier = Modifier,
) {
    var isInterestsCompleted by remember { mutableStateOf(false) }
    var selectedInterests by remember { mutableStateOf<List<String>>(emptyList()) }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        AnimatedVisibility(
            visible = true,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            OnboardingProgressHeader(
                currentStep = currentStep,
                totalSteps = 5,
                totalXp = totalXp,
            )
        }

        AnimatedContent(
            targetState = currentStep,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "OnboardingStepTransition",
        ) { targetStep ->
            when (targetStep) {
                1 ->
                    OnboardingStepCard(
                        title = "Virtual try-on",
                        description = "See how a product looks before buying.",
                        icon = Icons.Default.AccessibilityNew,
                        isCompleted = tryOnTested,
                        actionText = "Try it on",
                        onActionClick = onTestTryOn,
                    )

                2 ->
                    OnboardingStepCard(
                        title = "Payment options",
                        description = "Choose a payment method for checkout.",
                        icon = Icons.Default.CreditCard,
                        isCompleted = cardSaved,
                        actionText = "Open payment options",
                        onActionClick = onSaveCard,
                    )

                3 ->
                    OnboardingStepCard(
                        title = "Wardrobe",
                        description = "Add a photo to your wardrobe for styling and try-on.",
                        icon = Icons.Default.PhotoLibrary,
                        isCompleted = wardrobeSynced,
                        actionText = "Add wardrobe photo",
                        onActionClick = onSyncWardrobe,
                    )

                4 ->
                    components.features.auth.PasskeyRegistrationStep(
                        onRegistrationRequested = onRegisterPasskey,
                    )

                5 -> {
                    OnboardingInterestsCard(
                        title = "Select Interests",
                        description = "Tell us what you love to curate your feed.",
                        icon = Icons.Default.FavoriteBorder,
                        isCompleted = isInterestsCompleted,
                        actionText = "Save Interests",
                        availableInterests =
                            listOf(
                                "Sports & Outdoors",
                                "Consumer Technology",
                                "Women's Fashion",
                                "Men's Fashion",
                                "Beauty & Skincare",
                                "Home & Interior Design",
                                "Health & Wellness",
                                "Automotive & Gadgets",
                            ),
                        onActionClick = { interests ->
                            selectedInterests = interests
                            isInterestsCompleted = true
                            onSelectInterests(interests)
                        },
                    )
                }

                else -> Unit
            }
        }
    }
}
