
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

public interface GetUserSubscriptionQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
        SpressoConnectorConnector,
        GetUserSubscriptionQuery.Data,
        Unit,
    > {
    @kotlinx.serialization.Serializable
    public data class Data(
        val userSubscriptions: List<UserSubscriptionsItem>,
    ) {
        @kotlinx.serialization.Serializable
        public data class UserSubscriptionsItem(
            val tier: String?,
            val status: String?,
            val currentPeriodEnd: String?,
            val stripeSubscriptionId: String?,
        )
    }

    public companion object {
        public val operationName: String = "GetUserSubscription"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
            kotlinx.serialization.serializer()
    }
}

public fun GetUserSubscriptionQuery.ref(): com.google.firebase.dataconnect.QueryRef<
    GetUserSubscriptionQuery.Data,
    Unit,
> =
    ref(
        Unit,
    )

public suspend fun GetUserSubscriptionQuery.execute(): com.google.firebase.dataconnect.QueryResult<
    GetUserSubscriptionQuery.Data,
    Unit,
> =
    ref().execute()

public fun GetUserSubscriptionQuery.flow(): kotlinx.coroutines.flow.Flow<GetUserSubscriptionQuery.Data> =
    ref()
        .subscribe()
        .flow
        ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
        ._flow_filterNotNull()
        ._flow_map { it.data }
