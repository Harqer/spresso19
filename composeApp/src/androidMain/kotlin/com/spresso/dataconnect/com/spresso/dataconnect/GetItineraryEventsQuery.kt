
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

public interface GetItineraryEventsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetItineraryEventsQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val itineraryEvents: List<ItineraryEventsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class ItineraryEventsItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val tripId:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val type: String,
            val title: String,
            val description: String?,
            val eventTime: String?,
            val location: String?,
            val price: Double?,
            val qrData: String?,
            val confirmationCode: String?,
        )
    }

    public companion object {
        public val operationName: String = "GetItineraryEvents"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetItineraryEventsQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetItineraryEventsQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetItineraryEventsQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetItineraryEventsQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetItineraryEventsQuery.flow(): kotlinx.coroutines.flow.Flow<GetItineraryEventsQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
