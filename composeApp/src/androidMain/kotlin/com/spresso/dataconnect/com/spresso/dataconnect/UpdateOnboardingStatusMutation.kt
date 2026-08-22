
@file:Suppress(
    "KotlinRedundantDiagnosticSuppress",
    "PropertyName",
    "MayBeConstant",
    "RedundantVisibilityModifier",
    "RedundantCompanionReference",
    "RemoveEmptyClassBody",
    "SpellCheckingInspection",
    "unused",
)

package com.spresso.dataconnect

public interface UpdateOnboardingStatusMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        UpdateOnboardingStatusMutation.Data,
        UpdateOnboardingStatusMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val currentStep: Int,
        val isCompleted: Boolean,
    )

    @kotlinx.serialization.Serializable
    public data class Data(
        val onboardingStatus_upsert: OnboardingStatusKey,
    )

    public companion object {
        public val operationName: String = "UpdateOnboardingStatus"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun UpdateOnboardingStatusMutation.ref(
    currentStep: Int,
    isCompleted: Boolean,
): com.google.firebase.dataconnect.MutationRef<
    UpdateOnboardingStatusMutation.Data,
    UpdateOnboardingStatusMutation.Variables,
> =
    ref(
        UpdateOnboardingStatusMutation.Variables(
            currentStep = currentStep,
            isCompleted = isCompleted,
        ),
    )

public suspend fun UpdateOnboardingStatusMutation.execute(
    currentStep: Int,
    isCompleted: Boolean,
): com.google.firebase.dataconnect.MutationResult<
    UpdateOnboardingStatusMutation.Data,
    UpdateOnboardingStatusMutation.Variables,
> =
    ref(
        currentStep = currentStep,
        isCompleted = isCompleted,
    ).execute()
