
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

import kotlinx.coroutines.flow.filterNotNull as _flow_filterNotNull
import kotlinx.coroutines.flow.map as _flow_map

public interface GetPaymentMethodsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetPaymentMethodsQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val paymentMethods: List<PaymentMethodsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class PaymentMethodsItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val isDefault: Boolean?,
            val stripePaymentMethodId: String?,
        )
    }

    public companion object {
        public val operationName: String = "GetPaymentMethods"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetPaymentMethodsQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetPaymentMethodsQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetPaymentMethodsQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetPaymentMethodsQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetPaymentMethodsQuery.flow(): kotlinx.coroutines.flow.Flow<GetPaymentMethodsQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
