
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

public interface GetCreativeTemplatesQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetCreativeTemplatesQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val creativeTemplates: List<CreativeTemplatesItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class CreativeTemplatesItem(
            val id:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
                java.util.UUID,
            val name: String,
            val creator: String,
            val category: String,
            val description: String?,
            val iconName: String,
            val promptExample: String?,
            val createdAt:
                @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class)
                com.google.firebase.Timestamp,
        )
    }

    public companion object {
        public val operationName: String = "GetCreativeTemplates"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetCreativeTemplatesQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetCreativeTemplatesQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetCreativeTemplatesQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetCreativeTemplatesQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetCreativeTemplatesQuery.flow(): kotlinx.coroutines.flow.Flow<GetCreativeTemplatesQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
