
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

public interface DeletePaymentMethodMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        DeletePaymentMethodMutation.Data,
        DeletePaymentMethodMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val id:
            @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
            java.util.UUID,
    )

    @kotlinx.serialization.Serializable
    public data class Data(
        val paymentMethod_delete: PaymentMethodKey?,
    )

    public companion object {
        public val operationName: String = "DeletePaymentMethod"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun DeletePaymentMethodMutation.ref(
    id: java.util.UUID,
): com.google.firebase.dataconnect.MutationRef<
    DeletePaymentMethodMutation.Data,
    DeletePaymentMethodMutation.Variables,
> =
    ref(
        DeletePaymentMethodMutation.Variables(
            id = id,
        ),
    )

public suspend fun DeletePaymentMethodMutation.execute(
    id: java.util.UUID,
): com.google.firebase.dataconnect.MutationResult<
    DeletePaymentMethodMutation.Data,
    DeletePaymentMethodMutation.Variables,
> =
    ref(
        id = id,
    ).execute()
