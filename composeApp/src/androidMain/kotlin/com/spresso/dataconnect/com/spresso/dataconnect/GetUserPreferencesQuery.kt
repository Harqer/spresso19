
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

public interface GetUserPreferencesQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetUserPreferencesQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val userPreferences: List<UserPreferencesItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class UserPreferencesItem(
            val userId: String,
            val theme: String?,
            val pushNotifications: Boolean?,
            val emailAlerts: Boolean?,
        )
    }

    public companion object {
        public val operationName: String = "GetUserPreferences"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetUserPreferencesQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetUserPreferencesQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetUserPreferencesQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetUserPreferencesQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetUserPreferencesQuery.flow(): kotlinx.coroutines.flow.Flow<GetUserPreferencesQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
