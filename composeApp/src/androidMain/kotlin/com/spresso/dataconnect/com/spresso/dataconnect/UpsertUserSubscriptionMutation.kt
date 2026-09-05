
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

public interface UpsertUserSubscriptionMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        UpsertUserSubscriptionMutation.Data,
        UpsertUserSubscriptionMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val tier: String,
    )

    @kotlinx.serialization.Serializable
    public data class Data(
        val userSubscription_upsert: UserSubscriptionKey,
    )

    public companion object {
        public val operationName: String = "UpsertUserSubscription"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun UpsertUserSubscriptionMutation.ref(
    tier: String,
): com.google.firebase.dataconnect.MutationRef<
    UpsertUserSubscriptionMutation.Data,
    UpsertUserSubscriptionMutation.Variables,
> =
    ref(
        UpsertUserSubscriptionMutation.Variables(
            tier = tier,
        ),
    )

public suspend fun UpsertUserSubscriptionMutation.execute(
    tier: String,
): com.google.firebase.dataconnect.MutationResult<
    UpsertUserSubscriptionMutation.Data,
    UpsertUserSubscriptionMutation.Variables,
> =
    ref(
        tier = tier,
    ).execute()
