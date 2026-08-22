
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

public interface GetUserOrdersQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetUserOrdersQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val orders: List<OrdersItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class OrdersItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val authorizationId: String,
            val product: Product,
            val quantity: Int,
            val totalAmount: Double,
            val shippingAddress: String?,
            val deviceSource: String,
            val paymentMethod: String,
            val status: String,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
        ) {
            @kotlinx.serialization.Serializable
            public data class Product(
                val id: String,
                val name: String,
                val price: Double,
                val image: String?,
            )
        }
    }

    public companion object {
        public val operationName: String = "GetUserOrders"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetUserOrdersQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetUserOrdersQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetUserOrdersQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetUserOrdersQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetUserOrdersQuery.flow(): kotlinx.coroutines.flow.Flow<GetUserOrdersQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
