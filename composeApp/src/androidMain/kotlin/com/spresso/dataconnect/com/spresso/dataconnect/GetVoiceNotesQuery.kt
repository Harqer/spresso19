
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

public interface GetVoiceNotesQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetVoiceNotesQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val voiceNotes: List<VoiceNotesItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class VoiceNotesItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val tripId:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val transcript: String,
            val audioUrl: String?,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
        )
    }

    public companion object {
        public val operationName: String = "GetVoiceNotes"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetVoiceNotesQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetVoiceNotesQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetVoiceNotesQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetVoiceNotesQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetVoiceNotesQuery.flow(): kotlinx.coroutines.flow.Flow<GetVoiceNotesQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
