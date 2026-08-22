
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

public interface GetGroceryListQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetGroceryListQuery.Data,
        GetGroceryListQuery.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val userId: String,
    )

    @kotlinx.serialization.Serializable
    public data class Data(
        val groceryLists: List<GroceryListsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class GroceryListsItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val title: String,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
            val items: List<ItemsItem>,
        ) {
            @kotlinx.serialization.Serializable
            public data class ItemsItem(
                val id:
                    @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                    java.util.UUID,
                val productName: String,
                val productId: String?,
                val isPurchased: Boolean,
                val addedVia: String,
                val createdAt:
                    @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                    com.google.firebase.Timestamp,
            )
        }
    }

    public companion object {
        public val operationName: String = "GetGroceryList"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun GetGroceryListQuery.ref(
    userId: String,
): com.google.firebase.dataconnect.QueryRef<
    GetGroceryListQuery.Data,
    GetGroceryListQuery.Variables,
> =
    ref(
        GetGroceryListQuery.Variables(
            userId = userId,
        ),
    )

public suspend fun GetGroceryListQuery.execute(
    userId: String,
): com.google.firebase.dataconnect.QueryResult<
    GetGroceryListQuery.Data,
    GetGroceryListQuery.Variables,
> =
    ref(
        userId = userId,
    ).execute()

public fun GetGroceryListQuery.flow(userId: String): kotlinx.coroutines.flow.Flow<GetGroceryListQuery.Data> =
    ref(
        userId = userId,
    ).subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
