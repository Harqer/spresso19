
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

public interface GetWardrobeItemsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetWardrobeItemsQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val wardrobeItems: List<WardrobeItemsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class WardrobeItemsItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val category: String,
            val brand: String?,
            val imageUrl: String,
            val color: String?,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
        )
    }

    public companion object {
        public val operationName: String = "GetWardrobeItems"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetWardrobeItemsQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetWardrobeItemsQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetWardrobeItemsQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetWardrobeItemsQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetWardrobeItemsQuery.flow(): kotlinx.coroutines.flow.Flow<GetWardrobeItemsQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
