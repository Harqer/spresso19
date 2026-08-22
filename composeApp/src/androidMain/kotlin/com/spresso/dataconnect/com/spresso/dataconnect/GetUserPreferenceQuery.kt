
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

public interface GetUserPreferenceQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetUserPreferenceQuery.Data,
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
        public val operationName: String = "GetUserPreference"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetUserPreferenceQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetUserPreferenceQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetUserPreferenceQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetUserPreferenceQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetUserPreferenceQuery.flow(): kotlinx.coroutines.flow.Flow<GetUserPreferenceQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
