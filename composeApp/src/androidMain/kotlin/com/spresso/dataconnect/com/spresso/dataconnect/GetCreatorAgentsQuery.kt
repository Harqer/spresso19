
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

public interface GetCreatorAgentsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetCreatorAgentsQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val creatorAgents: List<CreatorAgentsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class CreatorAgentsItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val title: String,
            val badge: String?,
            val subtitle: String,
            val iconName: String,
            val capabilities: String,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
            val quickPrompts: List<QuickPromptsItem>,
        ) {
            @kotlinx.serialization.Serializable
            public data class QuickPromptsItem(
                val id:
                    @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                    java.util.UUID,
                val label: String,
                val prompt: String,
            )
        }
    }

    public companion object {
        public val operationName: String = "GetCreatorAgents"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetCreatorAgentsQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetCreatorAgentsQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetCreatorAgentsQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetCreatorAgentsQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetCreatorAgentsQuery.flow(): kotlinx.coroutines.flow.Flow<GetCreatorAgentsQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
